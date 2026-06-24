# INHOUSE STOCK: Comprehensive Test Plan

This document governs the quality-assurance framework for the **INHOUSE STOCK** Operations Portal. It specifies the critical test suites, integration patterns, and operational verification procedures.

## 1. Testing Taxonomy

We implement a multi-layered testing paradigm to ensure zero regressions across logistics, stock, and service desks:

1. **Unit Testing (Vitest)**:
   - Covers pure calculations, date helpers, coordinate accuracy, and telemetry parsing.
   - Core focus: Barcode parsing, URL-based QR extraction, chronological offline sync queue sorting, and stock deduction arithmetic.
2. **Component Testing (React Testing Library)**:
   - Validates UI component outputs, form errors, responsive panels, and accessibility standards.
   - Core focus: `SCLDispatchForm` validations, `BarcodeScanner` permission handlers, and the searchable section movement select drawer.
3. **Integration Testing (Supabase Mock Context)**:
   - Asserts RLS validation blocks, transaction-safe warehouse RPC flows, and role-based route permissions.
4. **End-to-End Testing (Playwright)**:
   - Validates complete system integration scenarios on simulated mobile and desktop window viewports.

## 2. Core End-to-End Scenarios

We prioritize the following 10 critical workflows in our automated test plan:

### Scenario A: Secure Connection Error Boundary
- **Preconditions**: Supabase environment parameters (`VITE_SUPABASE_URL`) are omitted.
- **Steps**: Load root application path `/`.
- **Expected Outcome**: Application intercepts state, prevents app initialization, and displays a prominent instructions card detailing settings variable updates.

### Scenario B: Mobile QR Asset Scanner
- **Preconditions**: Logged in, camera permissions mock-allowed.
- **Steps**: Scan a code of form `https://portal.dallmayr.co.za/assets/12345` or plain string `12345`.
- **Expected Outcome**: Scans must parse accurately, normalize whitespace, and navigate immediately to `/assets/12345`.

### Scenario C: Section Movement Workflow & Auditing
- **Preconditions**: Asset exists in database under `Canteen` section. Authorized role.
- **Steps**: Choose "Change Section", select `Level 2 Cafeteria`, enter reasoning note, and save.
- **Expected Outcome**: Transaction updates `machines.section_id`, appends a row to `asset_section_history`, and flashes a modern success banner.

### Scenario D: Double-Scan Prevention in Inventory
- **Preconditions**: Warehouse worker picking an order.
- **Steps**: Scan barcode `6001102233` twice in rapid succession (within 600ms).
- **Expected Outcome**: First scan registers required increment; second scan is identified as a bounce and is throttled to prevent double-deduction.

### Scenario E: Zero-Negative Stock Transaction Safeguard
- **Preconditions**: Warehouse stock record has quantity `5`.
- **Steps**: Execute concurrent order deduction requests totaling `6`.
- **Expected Outcome**: The first transaction succeeds. The overlapping execution is blocked at database-level inside the `record_warehouse_transaction` RPC and throws an `'Insufficient stock available'` exception.

### Scenario F: Foreground Driver GPS Tracking Control
- **Preconditions**: Driver is logged in, shift is not active.
- **Steps**: Verify GPS geolocation tracking is completely inactive. Start shift.
- **Expected Outcome**: Request location permissions, activate watch, and capture positions. End shift. Geolocation watch must terminate immediately.

## 3. Mock Configurations & Fixtures
- **Geolocation API Mock**: Mock `navigator.geolocation.watchPosition` to return coordinates at simulated intervals.
- **Camera Stream Mock**: Mock `MediaDevices.getUserMedia` to feed a static test card or barcode pattern.
