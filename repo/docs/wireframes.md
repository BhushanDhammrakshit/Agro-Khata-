# AgroKhata — MVP Page / Screen List

No visuals — this lists every screen needed for the MVP, grouped by flow, with the
key elements/purpose of each. Matches the schema in [schema.sql](schema.sql).

## 1. Auth
1. **Enter Mobile Number** — single phone input, "Send OTP" button.
2. **Enter OTP** — 6-digit OTP input, resend timer, verify → redirect to Dashboard.

## 2. Dashboard (tenant home)
3. **Dashboard** — summary cards (Vendor Bills pending receipt, Vendor Bills unpaid
   value, Farmer Entries unpaid balance, this month's purchase total); quick links to
   "New Vendor Bill" / "New Farmer Entry"; recent activity list.

## 3. Vendor Master
4. **Vendor List** — searchable/filterable table (name, active depots count, status).
5. **Vendor Create/Edit** — name, contact name/phone/email, notes, active toggle.
6. **Vendor Depots (sub-screen of Vendor Edit)** — list of depots for a vendor; each row
   editable inline or via modal: depot name, shipping address, invoice series prefix,
   next invoice number, active toggle.

## 4. Farmer Master
7. **Farmer List** — searchable table (name, village, phone, outstanding balance).
8. **Farmer Create/Edit** — name, phone, village, address, bank name/account/IFSC.

## 5. Item Master
9. **Item List** — searchable table (name, UOM, default rate, active).
10. **Item Create/Edit** — name, UOM, default rate, active toggle.

## 6. Vendor Bills
11. **Vendor Bill List** — filters: vendor, depot, status, date range; columns: invoice
    no, depot, date, status badge, indent/reconciled value, balance.
12. **Vendor Bill Create (Draft)** — depot picker (auto-fills shipping address + next
    invoice no), invoice date, PO no/date, ASN no, issuer details (prefilled from
    tenant profile, editable), line items grid (product, UOM, indent qty, rate — total
    auto-calculated), vehicle no, driver name/mobile, bank details. Save as Draft / Mark
    as Sent.
13. **Vendor Bill Detail/View** — read-only rendering of the full bill + status timeline
    (Draft → Sent → Received → Reconciled → Paid) + action buttons appropriate to
    current status.
14. **Vendor Bill Receive** — (available once Sent) per-line inputs for Rec Qty and
    Rejection Qty; auto-shows computed reconciled value per line; marks bill
    Partially Received / Received.
15. **Vendor Bill Reconciliation View** — read-only summary: indent value vs.
    reconciled value vs. rejection value per line and total; "Confirm Reconciliation"
    action → status = Reconciled.
16. **Vendor Bill Payment Entry** — amount, paid date, payment mode, reference no,
    notes; shows running paid/balance against reconciled value; marks Paid when
    balance reaches zero.
17. **Vendor Bill Print/PDF Preview** — matches physical bill layout (depot, invoice
    details, line items, vehicle/driver, bank details — no GST/tax line anywhere).

## 7. Farmer Entries
18. **Farmer Entry List** — filters: farmer, date range, status; columns: bill no,
    farmer, date, total amount, paid, balance.
19. **Farmer Entry Create/Edit** — bill no (auto/manual), farmer picker, date, line
    items grid (item, qty, price/unit — amount auto-calculated), sub total, total
    amount.
20. **Farmer Entry Detail/View** — read-only view + payment history.
21. **Farmer Entry Payment Entry** — amount, paid date, payment mode, reference no;
    updates paid amount / balance.
22. **Farmer Entry Print/PDF Preview** — Vyapar-style voucher layout.

## 8. Notifications
23. **Notification Log** — list of WhatsApp/email sends (recipient, channel, related
    bill/entry, status, fallback flag, timestamp); manual "Resend" action.

## 9. Reports
24. **Reports — Generate** — choose report type (weekly/monthly), period, format
    (PDF/Excel), tenant scope; "Generate Now" button.
25. **Reports — History/Download** — list of past generated reports with status and
    download links.

## 10. Settings / Admin
26. **Tenant Profile Settings** — legal name, address, contact, PAN, logo, default
    language (English/Marathi) — this is the source of the issuer snapshot used on
    new Vendor Bills.
27. **User Management** — list tenant users, invite/create user (phone, name, role),
    activate/deactivate.

## Notes
- Screens 4, 6, 9 (Vendor/Farmer/Item masters) share one consistent
  list + create/edit pattern.
- Vendor Bill screens (11–17) carry the most complexity due to the lifecycle;
  the Detail/View screen (13) is the hub that surfaces the right action
  (Send / Receive / Reconcile / Pay / Print) based on current status.
- Marathi localization (Phase 3) is not designed into these wireframes beyond the
  `default_language` field already in the schema.
