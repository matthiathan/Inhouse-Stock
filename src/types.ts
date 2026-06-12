export interface Machine {
  id: string;
  serial_number: string;
  qr_code: string;
  asset_name: string;
  section: string;
}

export interface Customer {
  id: string;
  'A/C Code': string;
  'Customer Name': string;
  'Telephone-1': string;
  'Email-1': string;
  'Ship To': string;
  [key: string]: any;
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
