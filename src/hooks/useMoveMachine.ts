import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useMoveMachine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ machineId, newSectionId }: { machineId: string; newSectionId: number }) => {
      const { data, error } = await supabase
        .from('machines')
        .update({ section_id: newSectionId })
        .eq('id', machineId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
    },
  });
};
