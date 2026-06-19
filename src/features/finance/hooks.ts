import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export const useBillingReport = () => {
  return useQuery({
    queryKey: ['finance-billing-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_billing_report')
        .select(`
          region,
          "Customer Code",
          "Client Name",
          "Date",
          "Closed Date",
          "CURRENT STATUS",
          billing_fee
        `)
        // Optional: Order by the newest opened date first
        .order('Date', { ascending: false }); 

      if (error) throw error;
      return data;
    }
  });
};
