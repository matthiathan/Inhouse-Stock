-- Supabase Database Schema for Dallmayr Coffee South Africa

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Regions
CREATE TYPE app_region AS ENUM ('JHB', 'KZN', 'CPT');

-- Enum for Service Call Log Status
CREATE TYPE service_call_status AS ENUM ('Open', 'In Progress', 'Closed');

-- Enum for Priority
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- Role enum
CREATE TYPE app_role AS ENUM ('admin', 'user', 'tech', 'road_tech', 'warehouse', 'ops_manager', 'finance');

-- 1. Users Table (Extension to auth.users if needed, or standalone app_users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Often tied to auth.uid()
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    region app_region NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customers Table
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

-- 3. Warehouse Inventory (Stock)
CREATE TABLE IF NOT EXISTS public.stock_items (
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

-- 4. Machines / Assets
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number TEXT UNIQUE NOT NULL,
    qr_code TEXT UNIQUE NOT NULL,
    asset_name TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    section TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Service Call Logs (SCL)
CREATE TABLE IF NOT EXISTS public.service_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    assigned_employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    current_status service_call_status NOT NULL DEFAULT 'Open',
    priority priority_level NOT NULL DEFAULT 'Medium',
    doc_no TEXT,
    do_number TEXT,
    narration TEXT,
    photo_url TEXT,
    closed_remarks TEXT,
    closed_date TIMESTAMP WITH TIME ZONE,
    service_type TEXT,
    region app_region NOT NULL, -- Added tracking of region here for RLS performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Orders (Fulfillment)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    stock_barcode TEXT NOT NULL REFERENCES public.stock_items(barcode) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    required_quantity INTEGER NOT NULL DEFAULT 1,
    scanned_quantity INTEGER NOT NULL DEFAULT 0,
    is_fulfilled BOOLEAN NOT NULL DEFAULT FALSE
);

-------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-------------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Utility function to get current user's role and region
CREATE OR REPLACE FUNCTION auth_user_region() RETURNS app_region AS $$
  SELECT region FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_user_role() RETURNS app_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS: Customers
-- Users can read customers in their own region, unless they are admin/finance
CREATE POLICY "Users can view customers in their region"
  ON public.customers FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'finance') OR region = auth_user_region()
  );

-- RLS: Machines / Assets
-- Derived from customer region
CREATE POLICY "Users can view machines in their region"
  ON public.machines FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'finance') OR
    customer_id IN (SELECT id FROM public.customers WHERE region = auth_user_region())
  );

-- RLS: Service Call Logs
-- Users view logs in their region
CREATE POLICY "Users can view service call logs in their region"
  ON public.service_call_logs FOR SELECT
  USING (
    auth_user_role() IN ('admin', 'finance') OR
    region = auth_user_region()
  );

CREATE POLICY "Users can update service call logs in their region"
  ON public.service_call_logs FOR UPDATE
  USING (
    auth_user_role() IN ('admin', 'ops_manager') OR
    (auth_user_role() IN ('tech', 'road_tech') AND assigned_employee_id = auth.uid() AND region = auth_user_region())
  );

-- RLS: Stock Items and Orders (Warehouse globally or per region based on requirements. Assuming global for central warehouse, but restricting mutability)
CREATE POLICY "Everyone can view stock"
  ON public.stock_items FOR SELECT USING (true);

CREATE POLICY "Only warehouse and admin can update stock"
  ON public.stock_items FOR UPDATE
  USING (auth_user_role() IN ('admin', 'warehouse', 'ops_manager'));

CREATE POLICY "Everyone can view orders"
  ON public.orders FOR SELECT USING (true);

CREATE POLICY "Everyone can view order items"
  ON public.order_items FOR SELECT USING (true);

