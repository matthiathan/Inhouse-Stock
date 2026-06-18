export interface UnifiedCustomer {
  id: string;
  name: string;
  address: string;
  code: string;
  location: string;
}

export interface ServiceCallLog {
  id: string;
  doc_no: string;
  do_number: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  service_type: string;
  sub_task: string;
  narration: string;
  customer_id: string;
  assigned_employee_id: string;
  client_name: string;
  client_location: string;
  address: string;
  customer_code: string;
  assigned_employee: string;
  current_status: 'Open' | 'Closed';
  assigned_date_time: string;
  serial_number?: string | null;
  qrcode?: string | null;
  photo_url?: string | null;
  closed_remarks?: string | null;
  closed_date?: string | null;
  unified_customers?: UnifiedCustomer | null;
}

export interface MaintenanceTicket {
  id: string;
  customer_code: string;
  assigned_employee_id: string;
  status: 'Open' | 'In Progress' | 'Closed';
  // Additional fields as per typical maintenance workflow
  notes?: string | null;
  created_at: string;
  unified_customers?: UnifiedCustomer | null;
}
