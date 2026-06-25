import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { normalizeScannedAssetCode } from '../utils/qr';

export const useMachineLookup = (qrCode: string | null) => {
  return useQuery({
    queryKey: ['machine', qrCode],
    queryFn: async () => {
      if (!qrCode) return null;
      const normalizedCode = normalizeScannedAssetCode(qrCode);
      const { data, error } = await supabase
        .from('fam')
        .select('*')
        .eq('QR Code', normalizedCode)
        .maybeSingle();

      if (error) {
        throw error;
      }
      return { data, isNotFound: !data };
    },
    enabled: !!qrCode,
  });
};
