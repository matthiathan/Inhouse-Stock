import { supabase } from '../../lib/supabase';
import { MaintenanceTicket } from '../../types';

export const fetchTechTasks = async (techId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select('*, unified_customers(*)')
    .eq('tech_id', techId)
    .neq('status', 'Closed')
    .gte('scheduled_time', `${today}T00:00:00Z`)
    .lte('scheduled_time', `${today}T23:59:59Z`)
    .order('scheduled_time', { ascending: true });

  if (error) throw error;
  return data as MaintenanceTicket[];
};

export const updateTaskStatus = async ({ id, status }: { id: string; status: string }) => {
    const { error } = await supabase.from('maintenance_tickets').update({ status }).eq('id', id);
    if (error) throw error;
};
