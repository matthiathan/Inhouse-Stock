export interface Asset {
  id: string;
  'Asset Name': string;
  'Serial#': string;
  'QR Code': string;
  'Current Location': string;
  'Current Customer Name': string;
  'C.Code': string;
  [key: string]: any;
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
