/**
 * payment.js
 * ----------------------------------------------------------------------------
 * NO PAYMENT GATEWAY. Customers pay directly, peer-to-peer, via whichever
 * UPI app they already have installed (Google Pay, PhonePe, Paytm, BHIM,
 * their bank's app, etc.) — there is no Razorpay/Cashfree/etc. involved, and
 * therefore no per-transaction gateway fee.
 *
 * The trade-off: since nothing sits between the customer and your bank
 * account, there is no automatic payment confirmation. The customer enters
 * the UPI reference/UTR number their app shows after paying, the order is
 * saved with paymentStatus "Pending Verification", and you confirm it
 * yourself by checking that reference number against your bank/UPI
 * statement (see README section 3).
 *
 * Two ways the customer can pay:
 *  1. Tap "Pay Now" on their own phone -> opens the UPI app chooser via a
 *     standard `upi://pay` deep link (works in any UPI-compliant app).
 *  2. Scan a QR code encoding that same deep link (useful when checking out
 *     on desktop) — this project uses the free api.qrserver.com image
 *     service to render the QR without shipping/vendoring a QR-encoding
 *     library. That means the UPI ID, payee name and amount are sent to
 *     api.qrserver.com as URL parameters to generate the image. No payment
 *     data or customer PII is sent — only the same public payment details
 *     already visible on the page. If you'd rather not depend on a third
 *     party for this, swap `buildUpiQrImageUrl` for a self-hosted QR
 *     library instead.
 * ----------------------------------------------------------------------------
 */

import { CONFIG } from './config.js';
import { api } from './api.js';

/** Build the standard UPI deep link used by every major UPI app. */
export function buildUpiUri({ amount, note }) {
  const params = new URLSearchParams({
    pa: CONFIG.UPI.vpa,
    pn: CONFIG.UPI.payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

/** Render that deep link as a scannable QR code image (see file header). */
export function buildUpiQrImageUrl(upiUri, size = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUri)}`;
}

export const payment = {
  /**
   * Save the order with the customer-supplied UPI reference number, marked
   * "Pending Verification" until you manually confirm it.
   */
  async payWithUpi(orderDraft, upiReference) {
    return api.saveOrder({ ...orderDraft, upiReference, paymentMethod: 'upi' });
  },
};
