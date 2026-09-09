-- FarmSetu Supabase Master Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Profiles (Farmers, PACS Operators, Buyers, Govt) ─────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID,
  name TEXT NOT NULL,
  name_hi TEXT,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'operator', 'buyer', 'government', 'logistics')),
  village TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Lots (Produce Batches) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS lots (
  id TEXT PRIMARY KEY,
  farmer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  farmer_name TEXT,
  farmer_name_hi TEXT,
  crop_type TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  grade TEXT CHECK (grade IN ('A', 'B', 'C')),
  score INTEGER,
  brix_pct NUMERIC,
  blemish_pct NUMERIC,
  weight_uniformity NUMERIC,
  cert_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','at-pacs','shipped','delivered','diverted')),
  price_per_kg NUMERIC,
  total_value NUMERIC,
  escrow_state TEXT DEFAULT 'PENDING' CHECK (escrow_state IN ('PENDING','LOCKED','PARTIAL_RELEASED','FULLY_RELEASED')),
  paid_70 NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Grade Certificates (SHA-256 Audit Trail) ────────────────
CREATE TABLE IF NOT EXISTS grade_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id TEXT REFERENCES lots(id) ON DELETE CASCADE,
  grade TEXT,
  score INTEGER,
  cert_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ─── 4. Harvest Slots (TFT-Computed Private Advisory) ────────────
CREATE TABLE IF NOT EXISTS harvest_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  farmer_code TEXT,
  advised_date DATE NOT NULL,
  advice TEXT CHECK (advice IN ('now','soon','wait')),
  price_expected NUMERIC,
  cohort_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Price Forecasts (TFT Multi-Horizon P10/P50/P90) ─────────
CREATE TABLE IF NOT EXISTS price_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_type TEXT NOT NULL,
  corridor TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  p10 NUMERIC,
  p50 NUMERIC,
  p90 NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Shipments (Consolidated Trucks) ──────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  lot_ids TEXT[],
  origin TEXT,
  destination TEXT,
  truck_id TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  total_weight_kg NUMERIC,
  total_crates INTEGER,
  ble_pod_id TEXT,
  status TEXT DEFAULT 'en-route' CHECK (status IN ('loading','en-route','arrived','diverted')),
  initial_shelf_life_hours INTEGER DEFAULT 240,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. Telemetry Readings (BLE IoT Temperature Pings) ──────────
CREATE TABLE IF NOT EXISTS telemetry_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id TEXT REFERENCES shipments(id) ON DELETE CASCADE,
  temp_c NUMERIC NOT NULL,
  humidity_pct NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. Escrow Transactions (FSM State Ledger) ───────────────────
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id TEXT REFERENCES lots(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT,
  amount NUMERIC,
  triggered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. Diversion Orders (Distress Salvage Redirections) ─────────
CREATE TABLE IF NOT EXISTS diversion_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id TEXT REFERENCES shipments(id) ON DELETE SET NULL,
  lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
  shelf_life_pct NUMERIC,
  reason TEXT,
  processor_name TEXT,
  processor_bid_per_kg NUMERIC,
  salvage_value NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. Standing Bids (Pre-committed Processor Liquidity) ───────
CREATE TABLE IF NOT EXISTS standing_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processor_name TEXT NOT NULL,
  commodity TEXT NOT NULL,
  max_distance_km INTEGER,
  price_per_kg NUMERIC NOT NULL,
  capacity_tons_per_day NUMERIC DEFAULT 25,
  contact_phone TEXT,
  plant_location TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security (RLS Enabled) ────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diversion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE standing_bids ENABLE ROW LEVEL SECURITY;

-- Transparent Demo Policies (Read / Write for Prototype)
CREATE POLICY "Public all profiles" ON profiles FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all lots" ON lots FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all grade_certificates" ON grade_certificates FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all harvest_slots" ON harvest_slots FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all price_forecasts" ON price_forecasts FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all shipments" ON shipments FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all telemetry_readings" ON telemetry_readings FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all escrow_transactions" ON escrow_transactions FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all diversion_orders" ON diversion_orders FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public all standing_bids" ON standing_bids FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ─── Seed Realistic Initial Data ─────────────────────────────────
INSERT INTO profiles (id, name, name_hi, role, village, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ramesh Patil', 'रमेश पाटिल', 'farmer', 'Nagpur', '+91 98221 00101'),
  ('22222222-2222-2222-2222-222222222222', 'Sunita Devi', 'सुनीता देवी', 'farmer', 'Wardha', '+91 98221 00102'),
  ('33333333-3333-3333-3333-333333333333', 'Balu Shinde', 'बालू शिंदे', 'farmer', 'Amravati', '+91 98221 00103'),
  ('44444444-4444-4444-4444-444444444444', 'Nagpur Central PACS Operator', 'नागपुर केंद्रीय PACS संचालक', 'operator', 'Nagpur Hub', '+91 94230 55660')
ON CONFLICT (id) DO NOTHING;

INSERT INTO standing_bids (processor_name, commodity, max_distance_km, price_per_kg, capacity_tons_per_day, contact_phone, plant_location) VALUES
  ('Nagpur Industrial Juice Plant', 'Orange', 50, 15.00, 40, '+91 712 254100', 'MIDC Hingna, Nagpur'),
  ('Vidarbha Agro Processing Co.', 'Orange', 80, 13.50, 25, '+91 715 289122', 'MIDC Wardha'),
  ('Maharashtra Squash & Beverages', 'Orange', 120, 12.00, 30, '+91 721 245901', 'Amravati Food Park'),
  ('Kisan Pulp & Concentrates Ltd.', 'Orange', 65, 14.20, 50, '+91 712 290111', 'Kalmeshwar, Nagpur')
ON CONFLICT DO NOTHING;

INSERT INTO lots (id, farmer_id, farmer_name, farmer_name_hi, crop_type, weight_kg, grade, score, brix_pct, blemish_pct, weight_uniformity, cert_hash, status, price_per_kg, total_value, escrow_state, paid_70) VALUES
  ('L001', '11111111-1111-1111-1111-111111111111', 'Ramesh Patil', 'रमेश पाटिल', 'Orange', 800, 'A', 84, 12.5, 3.2, 91, 'a3f7c2e1d4b89f560a3f7c2e1d4b89f560a3f7c2e1d4b89f560a3f7c2e1d4b8', 'shipped', 38, 30400, 'PARTIAL_RELEASED', 21280),
  ('L002', '22222222-2222-2222-2222-222222222222', 'Sunita Devi', 'सुनीता देवी', 'Orange', 450, 'B', 61, 9.1, 9.8, 78, 'b1e2f3a4c5d6e7f8b1e2f3a4c5d6e7f8b1e2f3a4c5d6e7f8b1e2f3a4c5d6e7f8', 'at-pacs', 28, 12600, 'LOCKED', 0),
  ('L003', '33333333-3333-3333-3333-333333333333', 'Balu Shinde', 'बालू शिंदे', 'Orange', 620, 'C', 38, 6.8, 22.5, 65, 'c9d8e7f6a5b4c3d2c9d8e7f6a5b4c3d2c9d8e7f6a5b4c3d2c9d8e7f6a5b4c3d2', 'diverted', 15, 9300, 'LOCKED', 0),
  ('L004', '11111111-1111-1111-1111-111111111111', 'Ramesh Patil', 'रमेश पाटिल', 'Orange', 380, 'A', 91, 13.2, 1.8, 95, 'd4e5f6a7b8c9d0e1d4e5f6a7b8c9d0e1d4e5f6a7b8c9d0e1d4e5f6a7b8c9d0e1', 'delivered', 42, 15960, 'FULLY_RELEASED', 11172)
ON CONFLICT (id) DO NOTHING;

INSERT INTO harvest_slots (farmer_id, farmer_code, advised_date, advice, price_expected, cohort_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'f1', CURRENT_DATE + INTERVAL '2 days', 'now', 40.00, 'COHORT-A1-NAGPUR'),
  ('22222222-2222-2222-2222-222222222222', 'f2', CURRENT_DATE + INTERVAL '5 days', 'wait', 33.00, 'COHORT-B2-WARDHA'),
  ('33333333-3333-3333-3333-333333333333', 'f3', CURRENT_DATE + INTERVAL '3 days', 'soon', 36.50, 'COHORT-A2-AMRAVATI')
ON CONFLICT DO NOTHING;

INSERT INTO shipments (id, lot_ids, origin, destination, truck_id, driver_name, driver_phone, total_weight_kg, total_crates, ble_pod_id, status) VALUES
  ('SH001', ARRAY['L001'], 'Nagpur Central PACS Hub', 'Mumbai Vashi APMC B2B Hub', 'MH-31-RF-8840', 'Vinod Yadav', '+91 98221 44510', 800, 32, 'BLE-POD-8821', 'en-route'),
  ('SH002', ARRAY['L003'], 'Amravati PACS Hub', 'Nagpur Juice Plant', 'MH-31-TR-7823', 'Raju Bhai', '+91 94230 11223', 620, 25, 'BLE-POD-7714', 'diverted')
ON CONFLICT (id) DO NOTHING;
