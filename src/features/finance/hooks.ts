import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { FinanceServiceRecord } from '../../types';

export const useFinanceServiceData = () => {
  return useQuery<FinanceServiceRecord[]>({
    queryKey: ['financeServiceData'],
    queryFn: async (): Promise<FinanceServiceRecord[]> => {
      // Direct query to the Service Call Log table
      const { data, error } = await supabase
        .from('service_call_logs') // Replaced finance_service_data
        .select('*');
      
      if (error) throw error;
      
      return (data || []).map((record: Record<string, unknown>) => ({
        ...record,
        created_at: (record.created_ts || record.created_at) as string | undefined,
        closed_date: record.closed_date as string | null | undefined,
        status: record.current_status as string | undefined // Deriving billing/finance status directly from SCL status
      })) as FinanceServiceRecord[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
