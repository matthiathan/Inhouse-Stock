import { supabase } from '../../lib/supabase';

export const getGhostBillingAudit = async (minimumDays: number = 60) => {
  const { data, error } = await supabase
    .from('finance_ghost_billing_audit')
    .select('*')
    .gte('days_without_service', minimumDays) // Only get high-risk customers
    .order('days_without_service', { ascending: false });

  if (error) throw error;
  return data;
};

export const getServiceBillingReport = async () => {
  const { data, error } = await supabase
    .from('finance_billing_report')
    .select('*')
    .order('date_closed', { ascending: false });

  if (error) throw error;
  return data;
};
