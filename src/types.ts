export interface UnifiedCustomer {
  id: string;
  name: string;
  address: string;
}

export interface NormalizedCustomer {
  id: string;
  code: string;
  name: string;
  address: string;
  region: string;
  latitude: number;
  longitude: number;
  created_at: string;
  "A/C Code": string;
  "Name": string;
  "Address": string;
  "Region": string;
  details: Record<string, unknown>;
}

export interface MaintenanceTicket {
  id: string;
  ticket_number?: string;
  machine_id: string;
  issue_description: string;
  resolution_notes?: string;
  photo_url?: string;
  completed_at?: string;
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
  details: Record<string, unknown>;
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
  machine_id?: string | null;
  machine?: Machine;
  delivery_date: string;
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
  created_at: string;
  order_items?: OrderItem[];
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
  customer_id?: string;
  asset_id?: string;
  assigned_employee_id?: string;
  current_status?: 'Open' | 'In Progress' | 'Closed';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  doc_no?: string;
  do_number?: string;
  narration?: string;
  photo_url?: string | null;
  closed_remarks?: string | null;
  closed_date?: string | null;
  created_at?: string;
  assigned_date_time?: string;
  serial_number?: string;
  assigned_employee?: string;
  client_name?: string;
  address?: string;
  qrcode?: string;
  service_type?: string;
  status?: string;

  // Uppercase legacy properties for backwards compatibility
  "DocNo"?: string;
  "DO#"?: string;
  "Priority"?: 'Low' | 'Medium' | 'High' | 'Critical';
  "Service Type"?: string;
  "Sub Task"?: string;
  "Narration"?: string;
  "Serial #"?: string;
  "QRCODE"?: string;
  "Client Name"?: string;
  "Client location"?: string;
  "Address"?: string;
  "Customer Code"?: string;
  "Assigned Employee"?: string;
  "CURRENT STATUS"?: string;
  "ASSIGNED DATE TIME"?: string;
}

export interface FinanceServiceRecord {
  id: string;
  customer_id?: string;
  asset_id?: string;
  assigned_employee_id?: string;
  status?: string;
  current_status?: string;
  priority?: string;
  doc_no?: string;
  do_number?: string;
  narration?: string;
  photo_url?: string | null;
  closed_remarks?: string | null;
  closed_date?: string | null;
  date_closed?: string | null;
  created_at?: string;
  date_created?: string | null;
  region?: string | null;
}

export type AppRole = 'admin' | 'user' | 'tech' | 'road_tech' | 'warehouse' | 'ops_manager' | 'finance';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  region: Region;
  latitude: number;
  longitude: number;
  created_at: string;
  name?: string;
}

export interface Machine {
  id: string;
  fam_id?: string;
  section_id?: string | null;
  customer_id?: string | null;
  contract_id?: string | null;
  customer_code?: string | null;
  serial_number: string;
  qr_code: string;
  asset_name: string;
  status: string;
  photo_url?: string | null;
  created_at?: string;
}

export interface VMachineDetails {
  machine_id: string;
  serial_number: string;
  qr_code: string;
  asset_name: string;
  machine_status: string;
  model_name: string;
  manufacturer: string;
  category: string;
  section_name: string | null;
  customer_id: string | null;
  customer_code: string | null;
  customer_name: string | null;
  customer_region: string | null;
  contract_id: string | null;
  contract_number: string | null;
  contract_type: string | null;
  section_id?: string | null;
}

export type TransactionType = 'RECEIVE' | 'DISPATCH' | 'TRANSFER' | 'ADJUST' | 'ARCHIVE';

export interface WarehouseTransaction {
  id: string;
  stock_id: string;
  user_id: string | null;
  type: TransactionType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_number?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface Section {
  id: string;
  section_name: string;
}
