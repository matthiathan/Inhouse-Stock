import { BaseRepository } from '../../services/api/baseRepository';
import { MaintenanceTicket } from '../../types';
import { supabase } from '../../lib/supabase';

export class TicketRepository extends BaseRepository<MaintenanceTicket> {
  constructor() {
    super('maintenance_tickets');
  }

  async getUnassigned(): Promise<MaintenanceTicket[] | null> {
    const { data, error } = await supabase.from(this.tableName).select('*').is('tech_id', null);
    if (error) throw error;
    return data as MaintenanceTicket[];
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
