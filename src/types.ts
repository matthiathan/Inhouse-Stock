export interface Machine {
  id: string;
  serial_number: string;
  qr_code: string;
  asset_name: string;
  section: string;
}

export interface Customer {
  id: string;
  ac_code: string;
  customer_name: string;
  telephone: string;
  email: string;
  ship_to: string;
  region: string;
}

export interface Section {
  id: string;
  section_name: string;
}

export interface Order {
  id: string;
  order_number: string;
  delivery_date: string;
  status: 'Pending' | 'Completed';
  created_at: string;
  completed_at?: string;
}
export interface OrderItem {
  id: string;
  order_id: string;
  stock_barcode: string;
  required_quantity: number;
  scanned_quantity: number;
  is_fulfilled: boolean;
}

export interface StockItem {
  id: string;
  barcode: string;
  units_per_box: number;
  box_quantity: number;
  pallet_quantity: number;
  item_name: string;
  notes: string;
  quantity: number;
  sku: string;
}
