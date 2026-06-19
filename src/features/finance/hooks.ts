import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface BillingReportRecord {
  id: string; // We'll use doc# or a combination as ID
  region: string;
  customerCode: string;
  clientName: string;
  openedDate: string;
  closedDate: string | null;
  status: 'Open' | 'Closed' | string;
  billingFee: number;
}

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
        .order('Date', { ascending: false }); 

      if (error) throw error;

      // Data Mapping Layer
      return (data || []).map((dbRow: any, idx: number) => ({
        id: dbRow.id || `${dbRow["Customer Code"]}-${idx}`,
        region: dbRow.region,
        customerCode: dbRow["Customer Code"],
        clientName: dbRow["Client Name"],
        openedDate: dbRow["Date"],
        closedDate: dbRow["Closed Date"],
        status: dbRow["CURRENT STATUS"],
        billingFee: Number(dbRow.billing_fee || 0)
      })) as BillingReportRecord[];
    }
  });
};
