import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { FinanceServiceRecord } from '../../types';

export const useFinanceServiceData = () => {
  return useQuery<FinanceServiceRecord[]>({
    queryKey: ['financeServiceData'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_service_data')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      return (data || []) as FinanceServiceRecord[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes fresh cache
    gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection time
  });
};
