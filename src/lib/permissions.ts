import { AppRole } from '../types';

export const APP_ROLES = [
  'admin',
  'ops_manager',
  'warehouse',
  'warehouse_staff',
  'driver',
  'tech',
  'road_tech',
  'finance',
  'user',
] as const satisfies readonly AppRole[];

export type Permission =
  | 'assets:read'
  | 'assets:write'
  | 'assets:move'
  | 'stock:read'
  | 'stock:write'
  | 'orders:read'
  | 'orders:write'
  | 'dispatch:read'
  | 'dispatch:write'
  | 'routes:own'
  | 'drivers:track'
  | 'service:own'
  | 'finance:read'
  | 'settings:read'
  | 'settings:write';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    'assets:read',
    'assets:write',
    'assets:move',
    'stock:read',
    'stock:write',
    'orders:read',
    'orders:write',
    'dispatch:read',
    'dispatch:write',
    'routes:own',
    'drivers:track',
    'service:own',
    'finance:read',
    'settings:read',
    'settings:write',
  ],
  ops_manager: [
    'assets:read',
    'assets:write',
    'assets:move',
    'stock:read',
    'orders:read',
    'orders:write',
    'dispatch:read',
    'dispatch:write',
    'drivers:track',
    'finance:read',
    'settings:read',
  ],
  warehouse: ['assets:read', 'stock:read', 'stock:write', 'orders:read', 'orders:write'],
  warehouse_staff: ['assets:read', 'stock:read', 'stock:write', 'orders:read', 'orders:write'],
  driver: ['routes:own'],
  tech: ['assets:read', 'service:own', 'routes:own'],
  road_tech: ['assets:read', 'service:own', 'routes:own'],
  finance: ['finance:read'],
  user: ['assets:read'],
};

export const roleHasPermission = (role: AppRole | null | undefined, permission: Permission) => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

export const normalizeRole = (role: string | null | undefined): AppRole => {
  if (role && (APP_ROLES as readonly string[]).includes(role)) {
    return role as AppRole;
  }
  return 'user';
};
