import { BaseRepository } from '../../services/api/baseRepository';
import { ServiceCallLog } from '../../types';
import { supabase } from '../../lib/supabase';

type ServiceCallLogWrite = Partial<ServiceCallLog> & Record<string, any>;

const normalizeStatus = (row: Record<string, any>) => row.current_status || row['CURRENT STATUS'] || row.status || 'Open';

export const mapSclFromDatabase = (row: Record<string, any>): ServiceCallLog => ({
  id: row.id,
  customer_id: row.customer_id || '',
  asset_id: row.asset_id || row.machine_id || undefined,
  assigned_employee_id: row.assigned_employee_id || row.technician_id || '',
  current_status: normalizeStatus(row),
  status: normalizeStatus(row),
  priority: row.priority || row.Priority || 'Medium',
  doc_no: row.doc_no || row.DocNo || '',
  do_number: row.do_number || row['DO#'] || null,
  narration: row.narration || row.Narration || '',
  photo_url: row.photo_url || null,
  closed_remarks: row.closed_remarks || row['Closed Remarks'] || null,
  closed_date: row.closed_date || row['Closed Date'] || null,
  created_at: row.created_at || row.Date || row['ASSIGNED DATE TIME'] || new Date().toISOString(),
  assigned_date_time: row.assigned_date_time || row['ASSIGNED DATE TIME'] || undefined,
  serial_number: row.serial_number || row['Serial #'] || undefined,
  assigned_employee: row.assigned_employee || row['Assigned Employee'] || undefined,
  client_name: row.client_name || row['Client Name'] || undefined,
  address: row.address || row.Address || row['Client location'] || undefined,
  qrcode: row.qrcode || row.QRCODE || undefined,
  customer_code: row.customer_code || row['Customer Code'] || undefined,
  service_type: row.service_type || row['Service Type'] || undefined,
  sub_task: row.sub_task || row['Sub Task'] || undefined,
});

export const mapSclToDatabase = (item: ServiceCallLogWrite) => {
  const mapped: Record<string, any> = {};
  const setIfDefined = (key: string, value: any) => {
    if (value !== undefined) mapped[key] = value;
  };

  setIfDefined('DocNo', item.doc_no ?? item.DocNo);
  setIfDefined('DO#', item.do_number ?? item['DO#']);
  setIfDefined('Priority', item.priority ?? item.Priority);
  setIfDefined('Service Type', item.service_type ?? item['Service Type']);
  setIfDefined('Sub Task', item.sub_task ?? item['Sub Task']);
  setIfDefined('Narration', item.narration ?? item.Narration);
  setIfDefined('customer_id', item.customer_id);
  setIfDefined('assigned_employee_id', item.assigned_employee_id);
  setIfDefined('Serial #', item.serial_number ?? item['Serial #']);
  setIfDefined('QRCODE', item.qrcode ?? item.QRCODE);
  setIfDefined('Client Name', item.client_name ?? item['Client Name']);
  setIfDefined('Client location', item.address ?? item['Client location']);
  setIfDefined('Address', item.address ?? item.Address);
  setIfDefined('Customer Code', item.customer_code ?? item['Customer Code']);
  setIfDefined('Assigned Employee', item.assigned_employee ?? item['Assigned Employee']);
  setIfDefined('CURRENT STATUS', item.current_status ?? item.status ?? item['CURRENT STATUS']);
  setIfDefined('ASSIGNED DATE TIME', item.assigned_date_time ?? item['ASSIGNED DATE TIME']);
  setIfDefined('Closed Remarks', item.closed_remarks ?? item['Closed Remarks']);
  setIfDefined('Closed Date', item.closed_date ?? item['Closed Date']);
  setIfDefined('Latitude', item.latitude ?? item.Latitude);
  setIfDefined('Longitude', item.longitude ?? item.Longitude);

  return mapped;
};

export class SclRepository extends BaseRepository<ServiceCallLog> {
  constructor() {
    super('service_call_logs');
  }

  override async getAll(): Promise<ServiceCallLog[] | null> {
    const { data, error } = await supabase.from(this.tableName).select('*');
    if (error) throw error;
    return (data || []).map(mapSclFromDatabase);
  }

  override async getById(id: string): Promise<ServiceCallLog | null> {
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data ? mapSclFromDatabase(data) : null;
  }

  override async create(item: Omit<ServiceCallLog, 'id' | 'created_at'>): Promise<ServiceCallLog | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([mapSclToDatabase(item)])
      .select()
      .single();
    if (error) throw error;
    return data ? mapSclFromDatabase(data) : null;
  }

  override async update(id: string, item: Partial<ServiceCallLog>): Promise<ServiceCallLog | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(mapSclToDatabase(item))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data ? mapSclFromDatabase(data) : null;
  }
}

export const sclRepository = new SclRepository();
