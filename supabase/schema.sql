-- Supabase Database Schema for INHOUSE STOCK

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE app_region AS ENUM ('JHB', 'KZN', 'CPT', 'NATIONAL');
CREATE TYPE app_role AS ENUM ('admin', 'user', 'tech', 'road_tech', 'warehouse', 'ops_manager', 'finance');
CREATE TYPE ticket_status AS ENUM ('Open', 'Dispatched', 'Assigned', 'Travelling', 'In Progress', 'On Site', 'On Hold', 'Resolved', 'Completed', 'Closed');
CREATE TYPE log_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- ==========================================
-- 1. IDENTITIES & ORGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    region app_region NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    region app_region NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    contract_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- e.g., 'Lease', 'SLA', 'Outright'
    start_date DATE NOT NULL,
    end_date DATE,
    sla_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. WAREHOUSE & STOCK
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT UNIQUE NOT NULL,
    item_name TEXT NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    box_quantity INTEGER NOT NULL DEFAULT 0,
    pallet_quantity INTEGER NOT NULL DEFAULT 0,
    units_per_box INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. FIXED ASSET MANAGEMENT (FAM) & PLACEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.fam (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    model_number TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Vending', 'Coffee', 'Water'
    theoretical_throughput INTEGER,
    specs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.section (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL, -- e.g., 'Canteen', 'Reception'
    floor_level TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fam_id UUID NOT NULL REFERENCES public.fam(id) ON DELETE RESTRICT,
    section_id UUID REFERENCES public.section(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    serial_number TEXT UNIQUE NOT NULL,
    qr_code TEXT UNIQUE NOT NULL,
    asset_name TEXT NOT NULL,
    photo_url TEXT,
    status TEXT DEFAULT 'Operational',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. DISPATCH WORKFLOW (ORDERS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES public.stock(id) ON DELETE RESTRICT,
    item_name TEXT NOT NULL,
    required_quantity INTEGER NOT NULL DEFAULT 1,
    scanned_quantity INTEGER NOT NULL DEFAULT 0,
    is_fulfilled BOOLEAN NOT NULL DEFAULT FALSE
);

-- ==========================================
-- 5. SERVICE MANAGEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    assigned_employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status ticket_status NOT NULL DEFAULT 'Open',
    priority priority_level NOT NULL DEFAULT 'Medium',
    issue_description TEXT NOT NULL,
    resolution_notes TEXT,
    photo_url TEXT,
    reported_by TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    resolved_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status log_status NOT NULL DEFAULT 'Draft',
    travel_time_mins INTEGER DEFAULT 0,
    labor_time_mins INTEGER DEFAULT 0,
    doc_no TEXT,
    narration TEXT,
    resolution_notes TEXT,
    photo_url TEXT,
    customer_signature_url TEXT,
    region app_region NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs FOR SELECT
  USING (auth_user_role() = 'admin');

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_customers_region ON public.customers(region);
CREATE INDEX IF NOT EXISTS idx_machines_fam ON public.machines(fam_id);
CREATE INDEX IF NOT EXISTS idx_machines_section ON public.machines(section_id);
CREATE INDEX IF NOT EXISTS idx_machines_customer ON public.machines(customer_id);
CREATE INDEX IF NOT EXISTS idx_machines_qr ON public.machines(qr_code);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_machine ON public.maintenance_tickets(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_tech ON public.maintenance_tickets(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_status ON public.maintenance_tickets(status);

CREATE INDEX IF NOT EXISTS idx_service_call_logs_ticket ON public.service_call_logs(maintenance_ticket_id);
CREATE INDEX IF NOT EXISTS idx_service_call_logs_tech ON public.service_call_logs(technician_id);

CREATE INDEX IF NOT EXISTS idx_orders_machine ON public.orders(machine_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_barcode ON public.stock(barcode);

-- ==========================================
-- VIEWS
-- ==========================================
CREATE OR REPLACE VIEW v_machine_details AS
SELECT 
    m.id AS machine_id,
    m.serial_number,
    m.qr_code,
    m.asset_name,
    m.status AS machine_status,
    f.model_name,
    f.manufacturer,
    f.category,
    s.section_name,
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    c.region AS customer_region,
    ct.id AS contract_id,
    ct.contract_number,
    ct.type AS contract_type
FROM public.machines m
LEFT JOIN public.fam f ON m.fam_id = f.id
LEFT JOIN public.section s ON m.section_id = s.id
LEFT JOIN public.customers c ON m.customer_id = c.id
LEFT JOIN public.contracts ct ON m.contract_id = ct.id;

CREATE OR REPLACE VIEW v_tech_dispatch_queue AS
SELECT 
    t.id AS ticket_id,
    t.ticket_number,
    t.status AS ticket_status,
    t.priority,
    t.issue_description,
    t.due_date,
    t.assigned_employee_id,
    m.id AS machine_id,
    m.asset_name,
    m.qr_code,
    c.name AS customer_name,
    c.address AS customer_address,
    c.region AS customer_region
FROM public.maintenance_tickets t
JOIN public.machines m ON t.machine_id = m.id
JOIN public.customers c ON t.customer_id = c.id
WHERE t.status IN ('Open', 'Dispatched', 'In Progress', 'On Hold');

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fam ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_call_logs ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION auth_user_region() RETURNS app_region AS $$
  SELECT region FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_role() RETURNS app_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Master Role Overrides (Admin/Finance/Ops) generally view everything.
-- For brevity, we implement regional separation for standard users.

CREATE POLICY "Users can view customers in their region" ON public.customers FOR SELECT
  USING (auth_user_role() IN ('admin', 'finance', 'ops_manager') OR region = auth_user_region());

CREATE POLICY "Users can view tickets assigned to them or in region" ON public.maintenance_tickets FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'finance', 'ops_manager') OR 
    assigned_employee_id = auth.uid() OR
    customer_id IN (SELECT id FROM public.customers WHERE region = auth_user_region())
  );

CREATE POLICY "Techs can update their own tickets" ON public.maintenance_tickets FOR UPDATE
  USING (auth_user_role() IN ('admin', 'ops_manager') OR assigned_employee_id = auth.uid());

CREATE POLICY "Users can view service call logs" ON public.service_call_logs FOR SELECT
  USING (auth_user_role() IN ('admin', 'finance', 'ops_manager') OR region = auth_user_region());

CREATE POLICY "Techs can manage their own logs" ON public.service_call_logs FOR ALL
  USING (auth_user_role() IN ('admin', 'ops_manager') OR technician_id = auth.uid());

-- Global Read for Inventory & Assets
CREATE POLICY "Global Read FAM" ON public.fam FOR SELECT USING (true);
CREATE POLICY "Global Read Stock" ON public.stock FOR SELECT USING (true);
CREATE POLICY "Regional Read Machines" ON public.machines FOR SELECT
  USING (auth_user_role() IN ('admin', 'finance', 'ops_manager') OR 
         customer_id IN (SELECT id FROM public.customers WHERE region = auth_user_region()));

CREATE TYPE transaction_type AS ENUM ('RECEIVE', 'DISPATCH', 'TRANSFER', 'ADJUST', 'ARCHIVE');

CREATE TABLE IF NOT EXISTS public.warehouse_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL REFERENCES public.stock(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.warehouse_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view warehouse transactions" ON public.warehouse_transactions FOR SELECT USING (true);
CREATE POLICY "Only admin/warehouse can insert transactions" ON public.warehouse_transactions FOR INSERT
  USING (auth_user_role() IN ('admin', 'ops_manager', 'warehouse'));

-- Add a transaction-safe RPC for recording stock updates
CREATE OR REPLACE FUNCTION record_warehouse_transaction(
  p_stock_id UUID,
  p_user_id UUID,
  p_type transaction_type,
  p_quantity_change INTEGER,
  p_reference_number TEXT,
  p_notes TEXT
) RETURNS public.stock AS $$
DECLARE
  v_stock public.stock;
  v_previous_quantity INTEGER;
  v_new_quantity INTEGER;
BEGIN
  -- Obtain a lock on the stock row
  SELECT * INTO v_stock FROM public.stock WHERE id = p_stock_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock item not found';
  END IF;

  v_previous_quantity := v_stock.quantity;
  v_new_quantity := v_previous_quantity + p_quantity_change;

  IF v_new_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient stock available';
  END IF;

  -- Update the stock
  UPDATE public.stock
  SET quantity = v_new_quantity
  WHERE id = p_stock_id
  RETURNING * INTO v_stock;

  -- Insert the transaction record
  INSERT INTO public.warehouse_transactions(
    stock_id, user_id, type, quantity_change, previous_quantity, new_quantity, reference_number, notes
  ) VALUES (
    p_stock_id, p_user_id, p_type, p_quantity_change, v_previous_quantity, v_new_quantity, p_reference_number, p_notes
  );

  RETURN v_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restricted Writes
CREATE POLICY "Only Admin/Ops/Warehouse update Stock" ON public.stock FOR UPDATE
  USING (auth_user_role() IN ('admin', 'ops_manager', 'warehouse'));

