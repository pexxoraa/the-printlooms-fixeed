# The Print Loom — E-commerce Platform

A production-ready, serverless e-commerce frontend for **The Print Loom** (Digital Print Saree brand), built for **Pexxoraa**.

```
Frontend (GitHub Pages)
        ↓
Google Apps Script (REST-style API)
        ↓
Google Sheets (Database)
        ↓
Direct UPI Payment (no gateway) + WhatsApp Business Notification
```

**No payment gateway.** Customers pay you directly via whichever UPI app they already use — Google Pay, PhonePe, Paytm, BHIM, their bank's app, etc. — using a standard `upi://pay` deep link and QR code. There's no Razorpay/Cashfree/etc., and therefore **no per-transaction gateway fee**. The trade-off: nothing sits between the customer and your bank account to confirm payment automatically, so every order is saved as **"Pending Verification"** with the UPI reference/UTR number the customer entered, and you confirm it yourself against your bank/UPI statement before shipping.

---

## 1. What's included

- **Vanilla JS, ES6 modules** — no framework, no build step required.
- **Full page set**: Home, Collections, Product Detail, Search, Wishlist, Cart, Checkout, About, Contact, Track Order (guest), Order Success, 404.
- **Guest checkout only** — no login/signup.
- **Cart & Wishlist** persisted in `localStorage` (never payment data).
- **Gateway-free UPI checkout** — QR code + deep link generated client-side from your UPI ID, with a manual reference-number confirmation step.
- **Google Apps Script backend** (`/backend/Code.gs`) — Google Sheets order storage (with race-condition-safe order ID generation via `LockService`), WhatsApp Cloud API notification, newsletter + contact form storage.
- **Swap-ready API layer** (`/js/services/api.js` + `/js/services/config.js`) — flip one flag to move from Apps Script to a future Node.js + Express + MongoDB backend without touching any UI code.
- 15 real products from The Print Loom's actual catalog photography in `/data/products.json` and `/assets/images/products`.

---

## 2. Running it locally

This is a static site — any static file server works. From the project root:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

> Until the backend is deployed (Section 3), checkout still works end-to-end via a local **demo mode** — orders are saved in your browser's `localStorage` only, clearly labelled "Demo order" on the confirmation page, so you can test the full cart → checkout → confirmation flow before connecting anything real.

---

## 3. Connecting the Google Apps Script backend

### 3.1 Create the Google Sheet
1. Create a new Google Sheet. This is your database.
2. Copy its **Spreadsheet ID** from the URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.
3. You do not need to manually create the `Orders`, `Newsletter`, or `Messages` tabs — `Code.gs` creates them automatically on first write, with the correct headers.
4. Optional: add a `Products` tab and a `Settings` tab (key/value, one row per setting) if you want to manage the catalog from the Sheet instead of `data/products.json`. If absent, the frontend safely falls back to the local JSON files.

### 3.2 Deploy the Apps Script
1. Open [script.google.com](https://script.google.com), create a new project.
2. Paste the contents of `/backend/Code.gs` into `Code.gs`.
3. Go to **Project Settings → Script Properties** and add:

   | Property | Value |
   |---|---|
   | `SPREADSHEET_ID` | the Sheet ID from step 3.1 |
   | `WHATSAPP_PHONE_ID` | Meta WhatsApp Cloud API `phone_number_id` |
   | `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API access token |
   | `WHATSAPP_TO_NUMBER` | your business WhatsApp number, E.164 without `+` |

4. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the generated `/exec` URL.

### 3.3 Point the frontend at your deployment
Open `js/services/config.js` and set:

```js
API: {
  gasBaseUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  ...
}
```

Also set your **real UPI ID** in the same file:

```js
UPI: {
  vpa: 'yourname@oksbi',   // whatever your real UPI ID is
  payeeName: 'The Print Loom',
}
```

Once this UPI ID is set, it's what appears in the QR code, the "Open in UPI App" deep link, and the copyable UPI ID field at checkout — money goes straight to this account, nothing passes through this codebase or any third party.

### 3.4 WhatsApp notifications
`sendWhatsAppNotification_()` in `Code.gs` uses the official **Meta WhatsApp Cloud API**. If you use a different WhatsApp provider (e.g. Gupshup, Interakt, Twilio), replace the `UrlFetchApp.fetch` call in that function with your provider's send-message endpoint. If the WhatsApp properties are left unset, order-saving still works; the notification step is skipped silently rather than failing the order.

### 3.5 Confirming a payment
For every order, `Code.gs` appends a row to the `Orders` sheet with **Payment Status = "Pending Verification"** and the customer's typed UPI reference/UTR number in the **UPI Reference** column. To confirm an order:

1. Open your UPI app or bank statement and look up that reference number.
2. If the amount matches the order's **Grand Total**, edit that row's **Payment Status** cell to `Verified` (or whatever label fits your workflow) and update **Order Status** as you fulfil it.
3. There is intentionally no automation here — a gateway would normally do this instantly, but since there isn't one, this manual check is what stands in for it. At low order volume this is quick; if volume grows enough that this becomes a bottleneck, that's the point at which a real gateway starts paying for itself.

---

## 3.6 Product catalog & settings: local vs. Sheet-managed

By default, `CONFIG.CATALOG.source` in `js/services/config.js` is `'local'` — the product catalog and site settings are read straight from `/data/products.json` and `/data/settings.json`, shipped with the site itself. This is instant (no network round-trip) and is almost always what you want, since Apps Script Web Apps have real latency (often 1–3+ seconds per call, more on a cold start).

**If products ever go missing after connecting the backend:** this usually means `CATALOG.source` was set to `'sheet'` and your Google Sheet doesn't have a `Products` tab — Apps Script correctly returns an *empty but successful* response in that case, which used to be mistaken for "this store has 0 products." As of this version, `api.js` now falls back to the local JSON automatically whenever the Sheet returns an empty list, not just when it errors — but the simplest fix is just leaving `CATALOG.source: 'local'` unless you've deliberately built out a `Products`/`Settings` sheet workflow.

**If pages feel slow:** every page load renders the header, footer, and the floating WhatsApp button — each of which reads settings. They now share a single in-memory cache per page load (`api.js`), so only the *first* call does any work; combined with `CATALOG.source: 'local'`, none of it touches Apps Script at all. If you deliberately switch to `'sheet'` mode, expect a genuine multi-second delay on first load, since that's real Apps Script latency, not a bug.

---

## 4. Payment flow reference

```
Customer fills details → clicks "Continue to Payment"
        → frontend generates a upi://pay deep link + QR code from CONFIG.UPI
        → customer pays via their own UPI app (GPay/PhonePe/Paytm/BHIM/etc.)
        → customer types the UPI reference/UTR number shown in their app
        → frontend → api.saveOrder() → Apps Script generates Order ID
        → appends row to "Orders" sheet, Payment Status = "Pending Verification"
        → WhatsApp notification sent to you with the reference number
        → Order Success page (tells the customer verification is in progress)
        → YOU manually check the reference against your bank/UPI statement
        → update "Payment Status" to "Verified" in the Sheet
```

No customer card data, bank credentials, or payment gateway ever touches this codebase — only a UPI ID (public, like a bank account number) and a reference number the customer self-reports.

---

## 5. Migrating from Google Apps Script to Node.js + Express + MongoDB later

Only two things need to change — **no UI component or page should require edits**:

1. In `js/services/config.js`, set `BACKEND: 'node'` and fill in `API.nodeBaseUrl`.
2. Implement matching REST routes on your Node server for each action currently routed through Apps Script's `action` field:
   - `GET /products` ↔ `getProducts`
   - `GET /settings` ↔ `getSettings`
   - `POST /orders` ↔ `saveOrder`
   - `POST /newsletter` ↔ `subscribeNewsletter`
   - `POST /contact` ↔ `sendContactMessage`

   Keep `api.js`'s envelope shape (`{ action, payload }` in, `{ success, data }` out) so `api.js` itself needs no changes beyond the base URL — see the comments inside `request()` in `api.js`.
3. Swap Google Sheets writes for MongoDB writes in your new backend, keeping the same field names as `ORDER_HEADERS` in `Code.gs` so nothing else (WhatsApp message formatting, admin exports, etc.) needs to change.
4. If you ever want to add a real payment gateway back in (Razorpay, Cashfree, etc.) instead of manual UPI verification, that would mean adding `createOrder`/`verifyPayment`-style actions again and a corresponding checkout step — the codebase is structured so that's an addition, not a rewrite, but it is not included in this build since you asked for a gateway-free setup.

---

## 6. Before launch checklist

- [x] Real product photography (15 sarees) and the actual Print Loom logo are wired in under `/assets/images/products` and `/assets/images/brand`.
- [x] Real Instagram (`@the_print_loom`) and WhatsApp (`919030621467`, "DM to order") are wired into the footer and a site-wide floating WhatsApp button.
- [ ] **Set your real UPI ID** in `js/services/config.js` (`CONFIG.UPI.vpa`) — it currently has a placeholder (`theprintloom@upi`). Also update it in `data/settings.json`.
- [ ] **Verify/replace placeholder catalog data.** Product names, descriptions, fabric type, prices, discounts, and stock counts in `data/products.json` were written editorially from the photos alone. Please review and correct every product entry before launch.
- [ ] **Replace the placeholder customer reviews** on the homepage (`index.html`, "Customer Reviews" section) — these are illustrative sample copy, not real customer quotes.
- [ ] Confirm `hello@theprintloom.in` and the generic "India" address in `data/settings.json` — placeholders, since I don't have your real email/address.
- [ ] Update `/backend/Code.gs`'s WhatsApp Script Properties with your real Meta Cloud API credentials (or swap in your WhatsApp provider of choice — see Section 3.4).
- [ ] Update every `https://theprintloom.example.com` canonical/OG URL once your real domain is live, and regenerate `sitemap.xml` to include one `<url>` entry per product slug.
- [ ] Decide how you want to handle **order verification at scale** — the manual "check UTR against bank statement" step works fine at low volume but doesn't scale; revisit if order volume grows a lot.
- [ ] The QR code is rendered via the free `api.qrserver.com` image service (no library vendored, no extra dependency) — this sends your UPI ID, payee name, and the order amount as URL parameters to generate the image. No customer data is sent. If you'd rather not depend on a third party for this, swap `buildUpiQrImageUrl()` in `js/services/payment.js` for a self-hosted QR-encoding library.
- [ ] If deploying to a GitHub **Project** Pages URL (`username.github.io/repo-name`) rather than root/custom domain, the root-relative paths (`/css/...`) need either a `<base href>` tag or a path rewrite.

---

## 7. Folder structure

```
/assets             Images, icons, fonts (real product photos + logo included)
/css                variables · base · layout · components · pages · animations · utilities
/js
  app.js            Shared chrome bootstrap (navbar, footer, scroll reveal, back-to-top, WhatsApp button)
  router.js         Query-param helpers (multi-page site, not an SPA router)
  /components       navbar · footer · productCard · modal · loader · toast · pagination
  /services         api · cart · wishlist · checkout · payment (UPI) · storage · validation · products · config
/data               products.json · categories.json · settings.json
/pages              home(redirect) · collections · product · cart · checkout · wishlist · about · contact · profile · order-success · search · 404
/backend            Code.gs — Google Apps Script backend reference implementation
```

Built by **Pexxoraa** for **The Print Loom**.
