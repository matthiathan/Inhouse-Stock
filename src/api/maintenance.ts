import { supabase } from '../lib/supabase';

export const createMaintenanceTicket = async (machineId: string, issueDescription: string) => {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .insert([{ machine_id: machineId, issue_description: issueDescription, status: 'Open' }]);
  
  if (error) throw error;
  return data;
};

export const closeMaintenanceTicket = async (ticketId: string, resolutionNotes: string, evidencePhotoUrl: string) => {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .update({
      status: 'Resolved',
      resolution_notes: resolutionNotes,
      evidence_photo_url: evidencePhotoUrl,
      resolved_at: new Date().toISOString()
    })
    .eq('id', ticketId);

  if (error) throw error;
  return data;
};
