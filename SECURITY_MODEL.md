# INHOUSE STOCK: Security Model & RLS Architecture

This document specifies the security controls, authentication bindings, and access structures securing Dallmayr SA's central operations portal.

## 1. Least Privilege Matrix (RBAC)

The application models permissions based on explicit workforce roles. All requests must validate the user's role server-side.

| Domain / Resource | Admin | Ops Manager | Warehouse | Driver | Technician | Finance | Standard User |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **All Assets / FAM** | READ/WRITE | READ/WRITE | READ | READ | READ | READ | READ (Lookup Only) |
| **Stock Adjustments** | READ/WRITE | READ | READ/WRITE | NONE | NONE | NONE | NONE |
| **Order Fulfillment** | READ/WRITE | READ/WRITE | READ/WRITE | NONE | NONE | NONE | NONE |
| **Logistics / Routes** | READ/WRITE | READ/WRITE | NONE | OWN ROUTE | NONE | NONE | NONE |
| **Live GPS Ingestion** | READ/WRITE | READ | NONE | INSERT OWN | NONE | NONE | NONE |
| **Maintenance Work** | READ/WRITE | READ/WRITE | NONE | NONE | OWN JOBS | NONE | NONE |
| **Audit Logs** | READ | NONE | NONE | NONE | NONE | NONE | NONE |

## 2. Row Level Security (RLS) Policies

Every operational table in the PostgreSQL database has Row Level Security active. The central policies are structured as follows:

### A. Geolocation Tracking Privacy (`driver_locations`)
- **Insert Policy**: Drivers may only insert entries linking to their own authenticated user ID and referencing an active shift.
  ```sql
  CREATE POLICY "Drivers can insert own locations" ON public.driver_locations
    FOR INSERT WITH CHECK (
      auth.uid() = driver_id AND 
      EXISTS (
        SELECT 1 FROM public.driver_shifts 
        WHERE id = shift_id AND driver_id = auth.uid() AND status = 'Active'
      )
    );
  ```
- **Read Policy**: Coordinates are accessible only to `ops_manager` and `admin` roles, or to the drivers themselves for history checks.
  ```sql
  CREATE POLICY "Authorized view of driver locations" ON public.driver_locations
    FOR SELECT USING (
      auth.uid() = driver_id OR 
      auth_user_role() IN ('admin', 'ops_manager')
    );
  ```

### B. Maintenance Workflows (`maintenance_tickets` & `service_call_logs`)
- **View Access**: Standard field service calls are filtered by the logged-in technician's geographical territory (region: JHB, KZN, CPT, NATIONAL).
- **Modification Access**: Technicians can only alter service logs where `technician_id == auth.uid()`.

### C. Inventory Ledger Protection (`stock` & `warehouse_transactions`)
- **Modification Access**: Only `warehouse` and `admin` roles are authorized to trigger stock updates, which must pass through the atomic `record_warehouse_transaction` transaction block.

## 3. Web Client Safeguards
1. **Input Validation**: Zero-trust client-server data exchange. Every form field uses explicit Zod schema validation (Zod parsing matches requirements for alphanumeric, date range, and GPS accuracy).
2. **Session Security**: Authentication token transport uses Supabase auth contexts. Role membership is evaluated inside database-level `SECURITY DEFINER` procedures (`auth_user_role()`).
3. **No Secrets Exposed**: Never compile or bundle administrative credentials (e.g., Supabase service role keys) within public-facing client bundles.
