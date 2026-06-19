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

export const ALL_NAV_ITEMS = [
  { name: 'Stock', path: '/stock', icon: Package, roles: ['admin', 'ops_manager', 'warehouse'] },
  { name: 'Orders', path: '/orders', icon: ClipboardList, roles: ['admin', 'ops_manager', 'warehouse'] },
  { name: 'Fulfillment', path: '/fulfillment', icon: ClipboardList, roles: ['admin', 'ops_manager', 'warehouse'] },
  { name: 'Route Planner', path: '/route-planner', icon: Map, roles: ['admin', 'ops_manager'] },
  { name: 'Dispatch', path: '/dispatch', icon: Map, roles: ['admin', 'ops_manager'] },
  { name: 'My Route', path: '/my-route', icon: MapPin, roles: ['tech', 'road_tech'] },
  { name: 'Assets', path: '/assets', icon: Database, roles: ['admin', 'ops_manager', 'warehouse', 'tech', 'road_tech', 'user'] },
  { name: 'Scanner', path: '/scanner', icon: QrCode, roles: ['admin', 'ops_manager', 'warehouse', 'tech', 'road_tech', 'user'] },
  { name: 'Service Tasks Monitor', path: '/tasks', icon: ClipboardList, roles: ['admin', 'finance'] },
  { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'ops_manager'] },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'ops_manager'] },
];
