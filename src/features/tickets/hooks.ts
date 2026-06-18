import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketRepository } from './repository';
import { MaintenanceTicket } from '../../types';

export const useUnassignedTickets = () => {
    return useQuery({
        queryKey: ['tickets', 'unassigned'],
        queryFn: () => ticketRepository.getUnassigned(),
    });
};

export const useOpenTickets = () => {
    return useQuery({
        queryKey: ['tickets', 'allOpen'],
        queryFn: () => ticketRepository.getOpenTickets(),
    });
};

export const useCreateTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<MaintenanceTicket, 'id' | 'created_at'>) => ticketRepository.create(data as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }
    });                
};
