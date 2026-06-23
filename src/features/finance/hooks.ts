import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { FinanceServiceRecord } from '../../types';
import { mapSclFromDatabase } from '../dispatch/repository';

export const useFinanceServiceData = () => {
  return useQuery<FinanceServiceRecord[]>({
    queryKey: ['financeServiceData'],
    queryFn: async (): Promise<FinanceServiceRecord[]> => {
      // Direct query to the Service Call Log table
      const { data, error } = await supabase
        .from('service_call_logs') // Replaced finance_service_data
        .select('*');
      
      if (error) throw error;
      
      return (data || []).map((record: Record<string, unknown>) => {
        const mapped = mapSclFromDatabase(record);
        return {
          ...record,
          ...mapped,
          status: mapped.current_status,
        };
      }) as FinanceServiceRecord[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
