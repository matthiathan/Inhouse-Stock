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
