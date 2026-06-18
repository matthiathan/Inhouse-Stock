import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sclRepository } from './repository';
import { ServiceCallLog } from '../../types';

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
