import { useQuery } from '@tanstack/react-query';
import { userRepository } from './repository';

export const useTechnicians = () => {
    return useQuery({
        queryKey: ['technicians'], 
        // Need to refactor to filter in supabase, but for now this works.
        queryFn: () => userRepository.getTechnicians(),
        select: (users) => users?.filter((u) => u.role === 'tech') || [],
    });
};
