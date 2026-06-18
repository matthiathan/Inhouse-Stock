import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTechTasks, updateTaskStatus } from './api';

export const useTechRoute = (techId: string) => {
  return useQuery({
    queryKey: ['techRoute', techId],
    queryFn: () => fetchTechTasks(techId),
    enabled: !!techId,
  });
};

export const useUpdateTaskStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTaskStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['techRoute'] });
        }
    });
};
