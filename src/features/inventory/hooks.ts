import { useQuery } from '@tanstack/react-query';
import { stockRepository } from './repository';

export const useStock = () => {
  return useQuery({
    queryKey: ['stock'],
    queryFn: () => stockRepository.getAll(),
  });
};
