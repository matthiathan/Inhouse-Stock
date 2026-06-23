import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useMachineLookup = (qrCode: string | null) => {
  return useQuery({
    queryKey: ['machine', qrCode],
    queryFn: async () => {
      if (!qrCode) return null;
      const { data, error } = await supabase
        .from('fam')
        .select('*, section(id, section_name)')
        .eq('QR Code', qrCode)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return { data, isNotFound: !data };
    },
    enabled: !!qrCode,
  });
};
