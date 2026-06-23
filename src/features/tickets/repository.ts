import { BaseRepository } from '../../services/api/baseRepository';
import { MaintenanceTicket } from '../../types';
import { supabase } from '../../lib/supabase';

const mapTicketToDatabase = (item: Partial<MaintenanceTicket> & Record<string, any>) => {
  const mapped: Record<string, any> = {};
  const setIfDefined = (key: string, value: any) => {
    if (value !== undefined) mapped[key] = value;
  };

  setIfDefined('machine_id', item.machine_id);
  setIfDefined('issue_description', item.issue_description);
  setIfDefined('status', item.status);
  setIfDefined('priority', item.priority);
  setIfDefined('resolution_notes', item.resolution_notes);
  setIfDefined('photo_url', item.photo_url);
  setIfDefined('tech_id', item.tech_id);
  setIfDefined('scheduled_time', item.scheduled_time);
  setIfDefined('customer_id', item.customer_id);
  setIfDefined('contact_person', item.contact_person);
  setIfDefined('contact_phone', item.contact_phone);
  setIfDefined('service_notes', item.service_notes);
  setIfDefined('resolved_at', item.resolved_at ?? item.completed_at);

  return mapped;
};

export class TicketRepository extends BaseRepository<MaintenanceTicket> {
  constructor() {
    super('maintenance_tickets');
  }

  override async create(item: Omit<MaintenanceTicket, 'id' | 'created_at'>): Promise<MaintenanceTicket | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([mapTicketToDatabase(item)])
      .select()
      .single();
    if (error) throw error;
    return data as MaintenanceTicket;
  }

  override async update(id: string, item: Partial<MaintenanceTicket>): Promise<MaintenanceTicket | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(mapTicketToDatabase(item))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as MaintenanceTicket;
  }

  async getUnassigned(): Promise<MaintenanceTicket[] | null> {
    const { data, error } = await supabase.from(this.tableName).select('*').is('tech_id', null);
    if (error) throw error;
    return data as MaintenanceTicket[];
  }

  async getById(id: string): Promise<MaintenanceTicket | null> {
    const { data, error } = await supabase.from(this.tableName).select('*, unified_customers(*)').eq('id', id).single();
    if (error) throw error;
    return data as MaintenanceTicket;
  }

  async getOpenTickets(): Promise<MaintenanceTicket[] | null> {
    const { data, error } = await supabase.from(this.tableName).select('*').neq('status', 'Closed');
    if (error) throw error;
    return data as MaintenanceTicket[];
  }

  async getTicketsByMachineId(machineId: string): Promise<MaintenanceTicket[] | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as MaintenanceTicket[];
  }
}

export const ticketRepository = new TicketRepository();
