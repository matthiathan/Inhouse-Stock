import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const useFulfillment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string): Promise<unknown> => {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${itemId}-${Date.now()}`;
      const { data, error } = await supabase.rpc('fulfill_order_item', {
        p_order_item_id: itemId,
        p_quantity: 1,
        p_idempotency_key: idempotencyKey,
      });
      if (error) throw error;
      return data;
    },
    onMutate: async (itemId) => {
      // Optimistically update the UI before the network call
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      // Update UI state here...
      // Note: Implementation depends on how the state is managed, 
      // but according to user request, we just implement the hook structure.
    },
    onError: () => {
      // Rollback UI if error
      toast.error("Failed to fulfill. Please try again.");
    }
  });
};
