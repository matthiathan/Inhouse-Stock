import { describe, expect, it } from 'vitest';
import { normalizeRole, roleHasPermission } from './permissions';

describe('permissions', () => {
  it('normalizes unknown roles to user', () => {
    expect(normalizeRole('warehouse_staff')).toBe('warehouse_staff');
    expect(normalizeRole('unexpected_role')).toBe('user');
    expect(normalizeRole(undefined)).toBe('user');
  });

  it('allows warehouse staff to operate warehouse workflows without admin access', () => {
    expect(roleHasPermission('warehouse_staff', 'stock:write')).toBe(true);
    expect(roleHasPermission('warehouse_staff', 'orders:write')).toBe(true);
    expect(roleHasPermission('warehouse_staff', 'settings:write')).toBe(false);
  });

  it('keeps drivers scoped to their own route foundation', () => {
    expect(roleHasPermission('driver', 'routes:own')).toBe(true);
    expect(roleHasPermission('driver', 'drivers:track')).toBe(false);
    expect(roleHasPermission('driver', 'stock:read')).toBe(false);
  });

  it('denies permissions when no role is available', () => {
    expect(roleHasPermission(null, 'assets:read')).toBe(false);
  });
});
