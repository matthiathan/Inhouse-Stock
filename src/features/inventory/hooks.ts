import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockRepository } from './repository';
import { StockItem } from '../../types';

export const useStock = () => {
  return useQuery({
    queryKey: ['stock'],
    queryFn: () => stockRepository.getAll(),
  });
};

export const useStockTransactions = (stockId?: string) => {
  return useQuery({
    queryKey: ['stock_transactions', stockId],
    queryFn: () => stockRepository.getTransactions(stockId),
  });
};

export const usePerformTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ 
      stockId, 
      type, 
      quantityChange, 
      referenceNumber, 
      notes 
    }: { 
      stockId: string, 
      type: 'RECEIVE' | 'DISPATCH' | 'TRANSFER' | 'ADJUST' | 'ARCHIVE', 
      quantityChange: number,
      referenceNumber?: string,
      notes?: string 
    }) => stockRepository.performTransaction(stockId, type, quantityChange, referenceNumber, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock_transactions', variables.stockId] });
      queryClient.invalidateQueries({ queryKey: ['stock_transactions', undefined] }); // invalidate global
    }
  });
};
