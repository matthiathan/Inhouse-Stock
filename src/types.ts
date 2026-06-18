export interface UnifiedCustomer {
  id: string;
  name: string;
  address: string;
}

export interface MaintenanceTicket {
  id: string;
  machine_id: string;
  issue_description: string;
  status: string;
  priority: string;
  created_at: string;
  tech_id: string;
  scheduled_time: string;
  contact_person: string;
  contact_phone: string;
  unified_customers?: UnifiedCustomer;
}

export type Region = 'KZN' | 'JHB' | 'CPT';

export interface Customer {
  id: string;
  name: string;
  region: Region;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  details: Record<string, any>;
  created_at: string;
}

export interface Asset {
  id: string;
  serial_number: string;
  qr_code: string;
  asset_name: string;
  customer_id: string;
  machine_type_id: string;
  created_at: string;
}

export interface StockItem {
  id: string;
  sku: string;
  item_name: string;
  barcode: string;
  quantity: number;
  box_quantity: number;
  pallet_quantity: number; // Added
  units_per_box: number;
  notes?: string; // Added
  image_url?: string; // Added
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  delivery_date: string;
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  stock_barcode: string;
  item_name: string;
  required_quantity: number;
  scanned_quantity: number;
  is_fulfilled: boolean;
}

export interface ServiceCallLog {
  id: string;
  customer_id: string;
  asset_id: string;
  assigned_employee_id: string;
  status: 'Open' | 'In Progress' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  doc_no: string;
  do_number: string;
  narration: string;
  photo_url: string | null;
  closed_remarks: string | null;
  closed_date: string | null;
  created_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'ops_manager' | 'tech' | 'warehouse' | 'user';
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Machine {
  id: string;
  serial_number: string;
  qr_code: string;
  asset_name: string;
  section: string;
  photo_url?: string | null;
  [key: string]: any;
}

export interface Section {
  id: string;
  section_name: string;
  [key: string]: any;
}
