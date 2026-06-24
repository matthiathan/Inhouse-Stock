# INHOUSE STOCK: Database Migration Plan

This document outlines the schema evolution strategy for **INHOUSE STOCK (Dallmayr SA Operations Portal)**. It describes how we add required tables for vehicle tracking, driver routes, and asset section logs without disrupting existing relational structures.

## 1. Migration Goals & Schema Constraints
- **Preserve Existing Data**: Existing tables (`users`, `stock`, `orders`, `machines`, `maintenance_tickets`, `service_call_logs`) are fully populated and must not be altered destructively.
- **Strict Referential Integrity**: Ensure all foreign key constraints are mapped cleanly with cascade/restrict rules.
- **Optimize Logistics Queries**: Build indices for coordinate ranges, active shifts, and descending timestamps.
- **Append-Only Auditing**: Ensure audit logs and driver locations are physically structured to prevent ordinary updates or deletions.

## 2. Extended Logistics Schema (Non-Destructive)

The following tables must be added to support Phase 5 (Driver & Vehicle Tracking):

```sql
-- Create vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number TEXT UNIQUE NOT NULL,
    fleet_number TEXT UNIQUE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'In Transit', 'Maintenance', 'Inactive')),
    current_driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver routes table
CREATE TABLE IF NOT EXISTS public.driver_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_number TEXT UNIQUE NOT NULL,
    driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    route_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Active', 'Completed', 'Cancelled')),
    planned_start TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver shifts table
CREATE TABLE IF NOT EXISTS public.driver_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    route_id UUID REFERENCES public.driver_routes(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Ended')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    start_latitude NUMERIC,
    start_longitude NUMERIC,
    end_latitude NUMERIC,
    end_longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create route stops table
CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES public.driver_routes(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    service_call_id UUID REFERENCES public.maintenance_tickets(id) ON DELETE SET NULL,
    stop_type TEXT NOT NULL CHECK (stop_type IN ('Delivery', 'Maintenance', 'Upliftment', 'Collection')),
    title TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Arrived', 'Departed', 'Failed', 'Completed')),
    planned_arrival TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    departed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    proof_photo_url TEXT,
    recipient_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver locations table (Highly optimized append-only log)
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.driver_shifts(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.driver_routes(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    accuracy_m NUMERIC,
    altitude_m NUMERIC,
    heading_degrees NUMERIC,
    speed_kph NUMERIC,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT DEFAULT 'browser_gps',
    battery_level NUMERIC,
    is_mocked BOOLEAN DEFAULT FALSE
);

-- Create asset section history (To track machines relocation history)
CREATE TABLE IF NOT EXISTS public.asset_section_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    previous_section_id UUID REFERENCES public.section(id) ON DELETE SET NULL,
    new_section_id UUID REFERENCES public.section(id) ON DELETE SET NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. High-Performance Logistics Indexes

The following indices optimize geospatial range lookups and chronological status reads:

```sql
CREATE INDEX IF NOT EXISTS idx_driver_locations_captured_at_desc ON public.driver_locations(driver_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_shift_id ON public.driver_locations(shift_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_driver_routes_driver_date ON public.driver_routes(driver_id, route_date);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_seq ON public.route_stops(route_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_driver_started ON public.driver_shifts(driver_id, started_at DESC);
```

## 4. Migration Execution Process
1. Save this migration payload into `/supabase/migrations/202606240000_logistics_extension.sql`.
2. Apply the migration using the local Supabase CLI or execute via the SQL Editor inside the Supabase console.
3. Validate columns, triggers, and indices under testing contexts.
