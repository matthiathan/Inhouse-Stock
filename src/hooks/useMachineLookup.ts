import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useMachineLookup = (qrCode: string | null) => {
  return useQuery({
    queryKey: ['machine', qrCode],
    queryFn: async () => {
      if (!qrCode) return null;
      const { data, error } = await supabase
        .from('machines')
        .select('*, fam(*), section(section_name)')
        .eq('qr_code', qrCode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Machine Not Found');
        }
        throw error;
      }
      return data;
    },
    enabled: !!qrCode,
  });
};
