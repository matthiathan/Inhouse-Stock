# Enterprise Dallmayr SA Testing Checklist

This standard operating checklist details verification runs for developers and QA engineers prior to releasing builds.

## 1. Authentication & RBAC Policy Verification
- [ ] **Admin Login Verification**: Sign in as administrator and ensure the Operations Dashboard, settings, and fleet analytics load with zero access errors.
- [ ] **Standard User & Tech Isolation**: Sign in as `tech` and verify that any unauthorized access attempts to `Admin Settings`, `Service Tasks Monitor`, or analytical panels redirect correctly to `/scanner` or `/my-route`.
- [ ] **Regional Boundary Testing**: Create two accounts (`user1` in `JHB`, `user2` in `CPT`). Confirm `user1` cannot see or scan inventory mapped to CPT’s warehouse bay.

## 2. Inventory Transaction Reliability
- [ ] **Dual Scan Concurrency Test**: Scan the same stock item with two concurrent connections to confirm concurrency controls block negative quantities.
- [ ] **Warehouse Audit Trail Test**: Receive a pallet of raw coffee, or dispatch stock items, and verify that name, time, inventory delta, and transaction notes are registered accurately in `warehouse_transactions`.
- [ ] **State Machine Enforcement**: Relocate a VM from the `Receiving Bay` to `Client Site` and verify the QR update triggers an audit log and a technician notification log.

## 3. High-Load, Backups & Reliability
- [ ] **Simulated Failure Catching**: Manually disconnect the network adapter and verify the offline-sync cache correctly buffers transactional scanner actions for subsequent sync.
- [ ] **Simulated DB Recovery Run**: Trigger a backup, delete a temporary test record, and run the restore trigger on a staging instance to verify zero datalock, zero corruption.
- [ ] **Rendering Lag Metrics**: Bench-test with 5,000 inventory items, validating that virtual lists load items in under 60ms.
