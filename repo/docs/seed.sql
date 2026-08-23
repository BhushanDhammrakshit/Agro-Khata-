-- ============================================================================
-- VajaBaki — Demo seed data
-- ============================================================================
-- Run this in the Neon SQL Editor (or any Postgres client) AFTER schema.sql has
-- already been applied. Creates a self-contained demo tenant "Khushal Agro Mall"
-- with vendors/depots/farmers/items and Vendor Bills / Farmer Entries covering
-- every lifecycle status, so every screen in the app has something to show.
--
-- Login as the demo owner via OTP: phone +919900011122 (check the backend
-- console for the printed OTP code after clicking "Send OTP" on /login).
-- ============================================================================

DO $$
DECLARE
  v_tenant_id           UUID;
  v_owner_id            UUID;
  v_staff_id            UUID;

  v_vendor_zepto        UUID;
  v_depot_nashik        UUID;
  v_depot_pune          UUID;
  v_depot_mumbai        UUID;
  v_vendor_kirana       UUID;
  v_depot_blr           UUID;

  v_farmer_1            UUID;
  v_farmer_2            UUID;
  v_farmer_3            UUID;

  v_item_tomato         UUID;
  v_item_onion          UUID;
  v_item_potato         UUID;
  v_item_cabbage        UUID;
  v_item_cauliflower    UUID;

  v_bill_draft          UUID;
  v_bill_sent           UUID;
  v_bill_partial        UUID;
  v_bill_reconciled     UUID;
  v_bill_paid           UUID;

  v_entry_unpaid        UUID;
  v_entry_partial       UUID;
  v_entry_paid          UUID;
BEGIN
  -- 1. Tenant (no RLS on this table)
  INSERT INTO tenants (id, name, legal_name, address, contact_phone, contact_email, pan)
  VALUES (gen_random_uuid(), 'Khushal Agro Mall', 'Khushal Agro Mall Pvt Ltd',
          'Narayangaon, Pune, Maharashtra', '+919900011122', 'contact@khushalagro.example', 'ABCDE1234F')
  RETURNING id INTO v_tenant_id;

  -- Bind this session to the tenant so every subsequent insert satisfies RLS.
  PERFORM set_config('app.tenant_id', v_tenant_id::text, false);

  -- 2. Users
  INSERT INTO users (id, tenant_id, phone, name, role)
  VALUES (gen_random_uuid(), v_tenant_id, '+919900011122', 'Demo Owner', 'owner')
  RETURNING id INTO v_owner_id;

  INSERT INTO users (id, tenant_id, phone, name, role)
  VALUES (gen_random_uuid(), v_tenant_id, '+919900011133', 'Demo Staff', 'staff')
  RETURNING id INTO v_staff_id;

  -- 3. Vendors + depots
  INSERT INTO vendors (id, tenant_id, name, contact_name, contact_phone)
  VALUES (gen_random_uuid(), v_tenant_id, 'Zepto', 'Vendor Ops Team', '+912233440000')
  RETURNING id INTO v_vendor_zepto;

  INSERT INTO vendor_depots (id, tenant_id, vendor_id, name, shipping_address, invoice_series_prefix, next_invoice_seq)
  VALUES (gen_random_uuid(), v_tenant_id, v_vendor_zepto, 'NASHIK', 'Zepto Darkstore, MIDC Ambad, Nashik, MH', 'ZP-NSK-', 103)
  RETURNING id INTO v_depot_nashik;

  INSERT INTO vendor_depots (id, tenant_id, vendor_id, name, shipping_address, invoice_series_prefix, next_invoice_seq)
  VALUES (gen_random_uuid(), v_tenant_id, v_vendor_zepto, 'Pune MH-2', 'Zepto Darkstore, Hinjewadi Phase 2, Pune, MH', 'ZP-PN2-', 45)
  RETURNING id INTO v_depot_pune;

  INSERT INTO vendor_depots (id, tenant_id, vendor_id, name, shipping_address, invoice_series_prefix, next_invoice_seq)
  VALUES (gen_random_uuid(), v_tenant_id, v_vendor_zepto, 'Mumbai MH-1', 'Zepto Darkstore, Andheri East, Mumbai, MH', 'ZP-MUM1-', 78)
  RETURNING id INTO v_depot_mumbai;

  INSERT INTO vendors (id, tenant_id, name, contact_name, contact_phone)
  VALUES (gen_random_uuid(), v_tenant_id, 'Kiranakart', 'Procurement Desk', '+918899001122')
  RETURNING id INTO v_vendor_kirana;

  INSERT INTO vendor_depots (id, tenant_id, vendor_id, name, shipping_address, invoice_series_prefix, next_invoice_seq)
  VALUES (gen_random_uuid(), v_tenant_id, v_vendor_kirana, 'Bangalore', 'Kiranakart Hub, Whitefield, Bangalore, KA', 'KK-BLR-', 12)
  RETURNING id INTO v_depot_blr;

  -- 4. Farmers
  INSERT INTO farmers (id, tenant_id, name, phone, village, bank_name, bank_account, ifsc)
  VALUES (gen_random_uuid(), v_tenant_id, 'Ramesh Patil', '+919911122233', 'Narayangaon', 'Bank of Maharashtra', '60123456789', 'MAHB0001234')
  RETURNING id INTO v_farmer_1;

  INSERT INTO farmers (id, tenant_id, name, phone, village, bank_name, bank_account, ifsc)
  VALUES (gen_random_uuid(), v_tenant_id, 'Sunita Shinde', '+919911122244', 'Junnar', 'State Bank of India', '30123456789', 'SBIN0005678')
  RETURNING id INTO v_farmer_2;

  INSERT INTO farmers (id, tenant_id, name, phone, village)
  VALUES (gen_random_uuid(), v_tenant_id, 'Balu Kale', '+919911122255', 'Manchar')
  RETURNING id INTO v_farmer_3;

  -- 5. Items
  INSERT INTO items (id, tenant_id, name, uom, default_rate) VALUES (gen_random_uuid(), v_tenant_id, 'Tomato', 'KG', 22.00) RETURNING id INTO v_item_tomato;
  INSERT INTO items (id, tenant_id, name, uom, default_rate) VALUES (gen_random_uuid(), v_tenant_id, 'Onion', 'KG', 18.50) RETURNING id INTO v_item_onion;
  INSERT INTO items (id, tenant_id, name, uom, default_rate) VALUES (gen_random_uuid(), v_tenant_id, 'Potato', 'KG', 15.00) RETURNING id INTO v_item_potato;
  INSERT INTO items (id, tenant_id, name, uom, default_rate) VALUES (gen_random_uuid(), v_tenant_id, 'Cabbage', 'CRATE', 120.00) RETURNING id INTO v_item_cabbage;
  INSERT INTO items (id, tenant_id, name, uom, default_rate) VALUES (gen_random_uuid(), v_tenant_id, 'Cauliflower', 'CRATE', 140.00) RETURNING id INTO v_item_cauliflower;

  -- ==========================================================================
  -- 6. Vendor Bills — one per lifecycle status
  -- ==========================================================================

  -- 6a. DRAFT
  INSERT INTO vendor_bills (
    id, tenant_id, vendor_id, depot_id, invoice_no, invoice_date, po_no, po_date, asn_no,
    shipping_address, issuer_name, issuer_address, issuer_contact, issuer_pan,
    vehicle_no, driver_name, driver_mobile, bank_name, bank_account, bank_ifsc,
    status, indent_total_value, created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_vendor_zepto, v_depot_nashik, 'ZP-NSK-101', CURRENT_DATE, 'PO-9001', CURRENT_DATE, 'ASN-5001',
    'Zepto Darkstore, MIDC Ambad, Nashik, MH', 'Khushal Agro Mall', 'Narayangaon, Pune, Maharashtra', '+919900011122', 'ABCDE1234F',
    'MH12AB1234', 'Suresh More', '+919922233344', 'Bank of Maharashtra', '60198765432', 'MAHB0009876',
    'draft', 4400.00, v_owner_id
  ) RETURNING id INTO v_bill_draft;

  INSERT INTO vendor_bill_items (tenant_id, vendor_bill_id, line_no, item_id, product_name, uom, indent_qty, rate)
  VALUES
    (v_tenant_id, v_bill_draft, 1, v_item_tomato, 'Tomato', 'KG', 100, 22.00),
    (v_tenant_id, v_bill_draft, 2, v_item_onion, 'Onion', 'KG', 120, 18.50);

  -- 6b. SENT
  INSERT INTO vendor_bills (
    id, tenant_id, vendor_id, depot_id, invoice_no, invoice_date, po_no,
    shipping_address, issuer_name, issuer_address, issuer_contact, issuer_pan,
    vehicle_no, driver_name, driver_mobile,
    status, indent_total_value, sent_at, created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_vendor_zepto, v_depot_pune, 'ZP-PN2-44', CURRENT_DATE - 2, 'PO-8890',
    'Zepto Darkstore, Hinjewadi Phase 2, Pune, MH', 'Khushal Agro Mall', 'Narayangaon, Pune, Maharashtra', '+919900011122', 'ABCDE1234F',
    'MH14CD5678', 'Vikas Jadhav', '+919922233355',
    'sent', 3000.00, now() - interval '2 days', v_owner_id
  ) RETURNING id INTO v_bill_sent;

  INSERT INTO vendor_bill_items (tenant_id, vendor_bill_id, line_no, item_id, product_name, uom, indent_qty, rate)
  VALUES (v_tenant_id, v_bill_sent, 1, v_item_potato, 'Potato', 'KG', 200, 15.00);

  -- 6c. PARTIALLY_RECEIVED
  INSERT INTO vendor_bills (
    id, tenant_id, vendor_id, depot_id, invoice_no, invoice_date, po_no,
    shipping_address, issuer_name, issuer_address, issuer_contact, issuer_pan,
    status, indent_total_value, sent_at, received_at, created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_vendor_zepto, v_depot_mumbai, 'ZP-MUM1-77', CURRENT_DATE - 4, 'PO-8750',
    'Zepto Darkstore, Andheri East, Mumbai, MH', 'Khushal Agro Mall', 'Narayangaon, Pune, Maharashtra', '+919900011122', 'ABCDE1234F',
    'partially_received', 6800.00, now() - interval '4 days', now() - interval '1 days', v_owner_id
  ) RETURNING id INTO v_bill_partial;

  INSERT INTO vendor_bill_items (tenant_id, vendor_bill_id, line_no, item_id, product_name, uom, indent_qty, rec_qty, rejection_qty, rate)
  VALUES
    (v_tenant_id, v_bill_partial, 1, v_item_cabbage, 'Cabbage', 'CRATE', 40, 38, 2, 120.00),
    (v_tenant_id, v_bill_partial, 2, v_item_cauliflower, 'Cauliflower', 'CRATE', 20, NULL, 0, 140.00);

  -- 6d. RECONCILED
  INSERT INTO vendor_bills (
    id, tenant_id, vendor_id, depot_id, invoice_no, invoice_date, po_no,
    shipping_address, issuer_name, issuer_address, issuer_contact, issuer_pan,
    status, indent_total_value, reconciled_total_value, sent_at, received_at, reconciled_at, created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_vendor_zepto, v_depot_nashik, 'ZP-NSK-102', CURRENT_DATE - 7, 'PO-8600',
    'Zepto Darkstore, MIDC Ambad, Nashik, MH', 'Khushal Agro Mall', 'Narayangaon, Pune, Maharashtra', '+919900011122', 'ABCDE1234F',
    'reconciled', 2200.00, 2090.00, now() - interval '7 days', now() - interval '5 days', now() - interval '4 days', v_owner_id
  ) RETURNING id INTO v_bill_reconciled;

  INSERT INTO vendor_bill_items (tenant_id, vendor_bill_id, line_no, item_id, product_name, uom, indent_qty, rec_qty, rejection_qty, rate)
  VALUES (v_tenant_id, v_bill_reconciled, 1, v_item_tomato, 'Tomato', 'KG', 100, 95, 0, 22.00);

  -- 6e. PAID
  INSERT INTO vendor_bills (
    id, tenant_id, vendor_id, depot_id, invoice_no, invoice_date, po_no,
    shipping_address, issuer_name, issuer_address, issuer_contact, issuer_pan,
    status, indent_total_value, reconciled_total_value, paid_amount, sent_at, received_at, reconciled_at, paid_at, created_by
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_vendor_kirana, v_depot_blr, 'KK-BLR-11', CURRENT_DATE - 10, 'PO-8400',
    'Kiranakart Hub, Whitefield, Bangalore, KA', 'Khushal Agro Mall', 'Narayangaon, Pune, Maharashtra', '+919900011122', 'ABCDE1234F',
    'paid', 3600.00, 3600.00, 3600.00, now() - interval '10 days', now() - interval '8 days', now() - interval '7 days', now() - interval '6 days', v_owner_id
  ) RETURNING id INTO v_bill_paid;

  INSERT INTO vendor_bill_items (tenant_id, vendor_bill_id, line_no, item_id, product_name, uom, indent_qty, rec_qty, rejection_qty, rate)
  VALUES (v_tenant_id, v_bill_paid, 1, v_item_onion, 'Onion', 'KG', 200, 200, 0, 18.00);

  INSERT INTO vendor_bill_payments (tenant_id, vendor_bill_id, amount, paid_date, payment_mode, reference_no, created_by)
  VALUES (v_tenant_id, v_bill_paid, 3600.00, CURRENT_DATE - 6, 'bank_transfer', 'UTR1234567890', v_owner_id);

  -- ==========================================================================
  -- 7. Farmer Entries — unpaid / partially paid / fully paid
  -- ==========================================================================

  INSERT INTO farmer_entries (id, tenant_id, farmer_id, bill_no, entry_date, sub_total, total_amount, status, created_by)
  VALUES (gen_random_uuid(), v_tenant_id, v_farmer_1, 'FE-1001', CURRENT_DATE, 2650.00, 2650.00, 'confirmed', v_owner_id)
  RETURNING id INTO v_entry_unpaid;

  INSERT INTO farmer_entry_items (tenant_id, farmer_entry_id, line_no, item_id, item_name, qty, price_per_unit)
  VALUES
    (v_tenant_id, v_entry_unpaid, 1, v_item_tomato, 'Tomato', 50, 22.00),
    (v_tenant_id, v_entry_unpaid, 2, v_item_potato, 'Potato', 100, 15.50);

  INSERT INTO farmer_entries (id, tenant_id, farmer_id, bill_no, entry_date, sub_total, total_amount, paid_amount, status, created_by)
  VALUES (gen_random_uuid(), v_tenant_id, v_farmer_2, 'FE-1002', CURRENT_DATE - 3, 1850.00, 1850.00, 1000.00, 'confirmed', v_owner_id)
  RETURNING id INTO v_entry_partial;

  INSERT INTO farmer_entry_items (tenant_id, farmer_entry_id, line_no, item_id, item_name, qty, price_per_unit)
  VALUES (v_tenant_id, v_entry_partial, 1, v_item_onion, 'Onion', 100, 18.50);

  INSERT INTO farmer_entry_payments (tenant_id, farmer_entry_id, amount, paid_date, payment_mode, created_by)
  VALUES (v_tenant_id, v_entry_partial, 1000.00, CURRENT_DATE - 2, 'cash', v_owner_id);

  INSERT INTO farmer_entries (id, tenant_id, farmer_id, bill_no, entry_date, sub_total, total_amount, paid_amount, status, created_by)
  VALUES (gen_random_uuid(), v_tenant_id, v_farmer_3, 'FE-1003', CURRENT_DATE - 6, 1200.00, 1200.00, 1200.00, 'paid', v_owner_id)
  RETURNING id INTO v_entry_paid;

  INSERT INTO farmer_entry_items (tenant_id, farmer_entry_id, line_no, item_id, item_name, qty, price_per_unit)
  VALUES (v_tenant_id, v_entry_paid, 1, v_item_cabbage, 'Cabbage', 10, 120.00);

  INSERT INTO farmer_entry_payments (tenant_id, farmer_entry_id, amount, paid_date, payment_mode, created_by)
  VALUES (v_tenant_id, v_entry_paid, 1200.00, CURRENT_DATE - 5, 'upi', v_owner_id);

  -- ==========================================================================
  -- 8. A few audit log entries so /settings/audit-log isn't empty
  -- ==========================================================================
  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
  VALUES
    (v_tenant_id, v_owner_id, 'vendor.created', 'vendor', v_vendor_zepto),
    (v_tenant_id, v_owner_id, 'vendor.created', 'vendor', v_vendor_kirana),
    (v_tenant_id, v_owner_id, 'vendor_bill.created', 'vendor_bill', v_bill_draft),
    (v_tenant_id, v_owner_id, 'vendor_bill.sent', 'vendor_bill', v_bill_sent),
    (v_tenant_id, v_owner_id, 'vendor_bill.reconciled', 'vendor_bill', v_bill_reconciled),
    (v_tenant_id, v_owner_id, 'vendor_bill.payment_recorded', 'vendor_bill', v_bill_paid),
    (v_tenant_id, v_owner_id, 'farmer_entry.created', 'farmer_entry', v_entry_unpaid),
    (v_tenant_id, v_owner_id, 'farmer_entry.payment_recorded', 'farmer_entry', v_entry_paid);

  RAISE NOTICE 'Seeded tenant % — log in with phone +919900011122', v_tenant_id;
END $$;
