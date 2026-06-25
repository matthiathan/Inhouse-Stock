import { 
  Package, 
  Database, 
  QrCode, 
  Settings, 
  BarChart3, 
  Map, 
  MapPin,
  ClipboardList,
  ShieldAlert,
  PieChart,
  ListTodo
} from 'lucide-react';
import { AppRole } from '../types';

interface NavigationItem {
  name: string;
  path: string;
  icon: typeof Package;
  roles: AppRole[];
}

export const ALL_NAV_ITEMS: NavigationItem[] = [
  { name: 'Warehouse', path: '/warehouse', icon: Package, roles: ['admin', 'ops_manager', 'warehouse', 'warehouse_staff'] },
  { name: 'Orders', path: '/orders', icon: ClipboardList, roles: ['admin', 'ops_manager', 'warehouse', 'warehouse_staff'] },
  { name: 'Fulfillment', path: '/fulfillment', icon: ClipboardList, roles: ['admin', 'ops_manager', 'warehouse', 'warehouse_staff'] },
  { name: 'Dispatch & Routing', path: '/dispatch', icon: Map, roles: ['admin', 'ops_manager'] },
  { name: 'My Route', path: '/my-route', icon: MapPin, roles: ['tech', 'road_tech'] },
  { name: 'Assets', path: '/assets', icon: Database, roles: ['admin', 'ops_manager', 'warehouse', 'tech', 'road_tech', 'user'] },
  { name: 'Scanner', path: '/scanner', icon: QrCode, roles: ['admin', 'ops_manager', 'warehouse', 'warehouse_staff', 'driver', 'tech', 'road_tech', 'user'] },
  { name: 'Service Tasks Monitor', path: '/tasks', icon: ClipboardList, roles: ['admin', 'finance'] },
  { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'ops_manager'] },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'ops_manager'] },
];
