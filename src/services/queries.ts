import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Reusable fetchers that can be used by hooks or in mutation functions
export const fetchAvailableStock = async () => {
    const { data, error } = await supabase.from('stock').select('*');
    if (error) throw error;
    
    return data.map(item => ({
        ...item,
        total_available_units: (item.quantity) // Simplified now based on "new schema"
    }));
};

// React Query Hooks
export const useAvailableStock = () => {
  return useQuery({
    queryKey: ['availableStock'],
    queryFn: fetchAvailableStock,
  });
};
