import { useQuery } from '@tanstack/react-query';
import { customerRepository } from './repository';

export const useCustomers = () => {
    return useQuery({
        queryKey: ['customers'],
        queryFn: () => customerRepository.getAll(),
    });
};
