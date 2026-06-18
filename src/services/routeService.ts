import { supabase } from '../lib/supabase';
import { MaintenanceTicket } from '../types';

export class RouteService {
  /**
   * Fetches maintenance tickets assigned to a technician for a specific date
   * and calculates/optimizes the route sequence based on priority and geographical distance.
   */
  async calculateRouteSequence(techId: string, dateStr?: string): Promise<MaintenanceTicket[]> {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    
    // Fetch all active/in-progress/open tickets for the technician on this day
    const { data: tickets, error } = await supabase
      .from('maintenance_tickets')
      .select('*, unified_customers(*)')
      .eq('tech_id', techId)
      .neq('status', 'Closed')
      .gte('scheduled_time', `${todayStr}T00:00:00Z`)
      .lte('scheduled_time', `${todayStr}T23:59:59Z`);

    if (error) throw error;
    if (!tickets || tickets.length === 0) return [];

    // Simple priority ordering: Critical -> High -> Medium -> Low, then by scheduled_time
    const priorityWeight: Record<string, number> = {
      'Critical': 4,
      'High': 3,
      'Medium': 2,
      'Low': 1
    };

    const sortedTickets = [...tickets].sort((a, b) => {
      const weightA = priorityWeight[a.priority || 'Low'] || 0;
      const weightB = priorityWeight[b.priority || 'Low'] || 0;
      
      if (weightA !== weightB) {
        return weightB - weightA; // Higher priority first
      }
      
      // Secondary: scheduled_time
      return new Date(a.scheduled_time || '').getTime() - new Date(b.scheduled_time || '').getTime();
    });

    return sortedTickets as MaintenanceTicket[];
  }
}

export const routeService = new RouteService();
