import { useQuery } from '@tanstack/react-query';
import { stockRepository } from '../features/inventory/repository';
import { toast } from 'sonner';

// Reusable fetchers that can be used by hooks or in mutation functions
export const fetchAvailableStock = async () => {
    const data = await stockRepository.getAll();
    if (!data) return [];
    
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
