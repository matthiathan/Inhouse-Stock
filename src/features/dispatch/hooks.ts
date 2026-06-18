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
        .eq('"doc#"', faDocId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!faDocId,
  });
};

