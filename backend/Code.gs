/**
 * Code.gs
 * ============================================================================
 * THE PRINT LOOM — Google Apps Script Backend
 * ============================================================================
 */

const ORDER_HEADERS = [
  'Order ID', 'Date', 'Time', 'Customer Name', 'Phone', 'Email', 'Address',
  'City', 'State', 'Pincode', 'Products', 'Quantity', 'Subtotal',
  'Shipping Charge', 'Discount', 'Grand Total', 'Payment Method',
  'UPI Reference', 'Payment Status', 'Order Status', 'Order Notes'
];

/* ------------------------------------------------------------------------ */
/*  Entry points                                                             */
/* ------------------------------------------------------------------------ */

function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;
    switch (action) {
      case 'getProducts':
        data = getProductsFromSheet_();
        break;
      case 'getSettings':
        data = getSettingsFromSheet_();
        break;
      default:
        return jsonResponse_({ success: false, message: 'Unknown GET action: ' + action });
    }
    return jsonResponse_({ success: true, data });
  } catch (err) {
    return jsonResponse_({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};
    let data;

    switch (action) {
      case 'saveOrder':
        data = saveUpiOrder_(payload);
        break;
      case 'subscribeNewsletter':
        data = subscribeNewsletter_(payload);
        break;
      case 'sendContactMessage':
        data = saveContactMessage_(payload);
        break;
      case 'getProducts':
        data = getProductsFromSheet_();
        break;
      case 'getSettings':
        data = getSettingsFromSheet_();
        break;
      default:
        return jsonResponse_({ success: false, message: 'Unknown POST action: ' + action });
    }

    return jsonResponse_({ success: true, data });
  } catch (err) {
    return jsonResponse_({ success: false, message: err.message });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------------ */
/*  Sheet helpers                                                            */
/* ------------------------------------------------------------------------ */

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}

function getOrCreateSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function getOrdersSheet_() {
  return getOrCreateSheet_('Orders', ORDER_HEADERS);
}

function getProductsFromSheet_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('Products');
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function getSettingsFromSheet_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  rows.forEach(([key, value]) => { if (key) settings[key] = value; });
  return settings;
}

/* ------------------------------------------------------------------------ */
/*  Order ID generation                                                      */
/* ------------------------------------------------------------------------ */

function generateOrderId_() {
  const sheet = getOrdersSheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // wait up to 10s so two simultaneous checkouts don't collide
  try {
    const lastRow = sheet.getLastRow(); 
    const seq = String(lastRow).padStart(4, '0');
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyyMMdd');
    return `PL-${today}-${seq}`;
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------------ */
/*  Order persistence                                                       */
/* ------------------------------------------------------------------------ */

function appendOrderRow_(orderDraft, orderId) {
  const sheet = getOrdersSheet_();
  const now = new Date();
  const productsSummary = orderDraft.items
    .map((i) => `${i.name} (${i.size}) x${i.quantity}`)
    .join(', ');
  const totalQty = orderDraft.items.reduce((s, i) => s + i.quantity, 0);

  // Exact matching mapping so columns don't shift!
  sheet.appendRow([
    orderId,
    Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd'),
    Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Kolkata', 'HH:mm:ss'),
    orderDraft.customer.name || '',
    orderDraft.customer.phone || '',
    orderDraft.customer.email || '',
    orderDraft.customer.address || '',
    orderDraft.customer.city || '',
    orderDraft.customer.state || '',
    orderDraft.customer.pincode || '',
    productsSummary,            // Col K (11)
    totalQty,                   // Col L (12)
    orderDraft.subtotal || 0,   // Col M (13)
    orderDraft.shipping || 0,   // Col N (14)
    orderDraft.discount || 0,   // Col O (15)
    orderDraft.grandTotal || 0, // Col P (16)
    'UPI (Direct)',
    orderDraft.upiReference || '',
    'Pending Verification',
    'Placed',
    orderDraft.customer.notes || '' // Moved safely to the end
  ]);

  return orderId;
}

function saveUpiOrder_(orderDraft) {
  const orderId = generateOrderId_();
  appendOrderRow_(orderDraft, orderId);
  sendWhatsAppNotification_(orderDraft, orderId);
  return { orderId };
}

/* ------------------------------------------------------------------------ */
/*  WhatsApp notification (Meta WhatsApp Cloud API)                         */
/* ------------------------------------------------------------------------ */

function sendWhatsAppNotification_(orderDraft, orderId) {
  try {
    const props = PropertiesService.getScriptProperties();
    const phoneId = props.getProperty('WHATSAPP_PHONE_ID');
    const token = props.getProperty('WHATSAPP_ACCESS_TOKEN');
    const toNumber = props.getProperty('WHATSAPP_TO_NUMBER');
    if (!phoneId || !token || !toNumber) return; 

    const productsSummary = orderDraft.items
      .map((i) => `• ${i.name} (${i.size}) x${i.quantity}`)
      .join('\n');

    const notesLine = orderDraft.customer.notes ? `\nNotes: ${orderDraft.customer.notes}` : '';

    const message = [
      `*New Order — ${orderId}* (Pending Verification)`,
      `Customer: ${orderDraft.customer.name}`,
      `Phone: ${orderDraft.customer.phone}${notesLine}`,
      ``,
      `Products:`,
      productsSummary,
      ``,
      `Address: ${orderDraft.customer.address}, ${orderDraft.customer.city}, ${orderDraft.customer.state} - ${orderDraft.customer.pincode}`,
      `Grand Total: ₹${orderDraft.grandTotal}`,
      `UPI Reference given: ${orderDraft.upiReference || '(none entered)'}`,
      ``,
      `⚠️ Please verify this UPI reference against your bank/UPI statement before shipping.`,
    ].join('\n');

    UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: { body: message },
      }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    console.error('WhatsApp notification failed: ' + err.message);
  }
}

/* ------------------------------------------------------------------------ */
/*  Newsletter & contact form                                                */
/* ------------------------------------------------------------------------ */

function subscribeNewsletter_(payload) {
  const sheet = getOrCreateSheet_('Newsletter', ['Email', 'Subscribed At']);
  sheet.appendRow([payload.email, new Date()]);
  return { subscribed: true };
}

function saveContactMessage_(payload) {
  const sheet = getOrCreateSheet_('Messages', ['Name', 'Email', 'Subject', 'Message', 'Received At']);
  sheet.appendRow([payload.name, payload.email, payload.subject, payload.message, new Date()]);
  return { received: true };
}
