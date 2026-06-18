import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sclRepository } from './repository';
import { ServiceCallLog } from '../../types';
import { supabase } from '../../lib/supabase';
import { getTableByPrefix } from '../../services/routeService';

export const useSclTasks = () => {
  return useQuery({
    queryKey: ['sclTasks'],
    queryFn: () => sclRepository.getAll(),
  });
};

export const useUpdateSclTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; update: Partial<ServiceCallLog> }) => 
        sclRepository.update(data.id, data.update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sclTasks'] });
    },
  });
};

export const useContractLookup = (faDocId?: string) => {
  return useQuery({
    queryKey: ['contract-lookup', faDocId],
    queryFn: async () => {
      if (!faDocId) return null;
      
      const tableName = getTableByPrefix(faDocId);
      if (!tableName) return null;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('doc#', faDocId) // Try both raw and double-quoted depending on supabase/postgresql requirements. The prompt uses eq('"doc#"', faDocId) to ensure special characters like symbol '#' are wrapped if double quotes are needed, or we can use '"doc#"' exactly as requested.
        .single();

      if (error) {
        // Fallback: system can try with '"doc#"' if needed, or if error we'll throw, let's stick to the prompt's instruction: eq('"doc#"', faDocId)
        const { data: retryData, error: retryError } = await supabase
          .from(tableName)
          .select('*')
          .eq('"doc#"', faDocId)
          .single();

        if (retryError) throw retryError;
        return retryData;
      }
      return data;
    },
    enabled: !!faDocId,
  });
};

