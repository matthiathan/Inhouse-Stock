-- Repair script for the live Supabase project.
-- The hosted database currently rejects service_call_logs inserts because
-- a database-side trigger/function references public.finance_service_data.
-- Run this in the Supabase SQL editor for project xwdltghqqaobsgefrczy.

CREATE TABLE IF NOT EXISTS public.finance_service_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "DocNo" TEXT,
  "DO#" TEXT,
  "Serial #" TEXT,
  "Date" TEXT,
  "Customer Code" TEXT,
  "Client Name" TEXT,
  "Client location" TEXT,
  "Service Type" TEXT,
  "Sub Task" TEXT,
  "Narration" TEXT,
  "Assigned Employee" TEXT,
  "ASSIGNED DATE TIME" TEXT,
  "Closed Remarks" TEXT,
  "Closed Date" TEXT,
  "CURRENT STATUS" TEXT,
  "Created By" TEXT,
  "ASSIGNED BY" TEXT,
  "LOCATION(Floor)" TEXT,
  "BUILDING NAME" TEXT,
  "QRCODE" TEXT,
  "Address" TEXT,
  "Location Link" TEXT,
  "Priority" TEXT,
  "SCL_CLOSEDBY_DOCNO" TEXT,
  "End Date" TEXT,
  "START TIME" TEXT,
  "END TIME" TEXT,
  "Time Taken" TEXT,
  "Latitude" TEXT,
  "Longitude" TEXT,
  customer_id UUID,
  assigned_employee_id UUID
);

ALTER TABLE public.finance_service_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance data readable by operations roles" ON public.finance_service_data;
CREATE POLICY "Finance data readable by operations roles"
ON public.finance_service_data
FOR SELECT
USING (
  auth_user_role() IN ('admin', 'finance', 'ops_manager')
);

DROP POLICY IF EXISTS "Finance data writable by operations roles" ON public.finance_service_data;
CREATE POLICY "Finance data writable by operations roles"
ON public.finance_service_data
FOR ALL
USING (
  auth_user_role() IN ('admin', 'finance', 'ops_manager')
)
WITH CHECK (
  auth_user_role() IN ('admin', 'finance', 'ops_manager')
);
