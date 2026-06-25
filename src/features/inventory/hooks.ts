import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockRepository } from './repository';
import { StockItem } from '../../types';
import { isConfigured } from '../../lib/supabase';
import { demoStockItems, demoWarehouseTransactions } from './demoData';

export const useStock = () => {
  return useQuery({
    queryKey: ['stock'],
    queryFn: () => isConfigured ? stockRepository.getAll() : Promise.resolve(demoStockItems),
    staleTime: isConfigured ? 30_000 : Infinity,
  });
};

export const useStockTransactions = (stockId?: string) => {
  return useQuery({
    queryKey: ['stock_transactions', stockId],
    queryFn: () => {
      if (isConfigured) {
        return stockRepository.getTransactions(stockId);
      }
      return Promise.resolve(
        stockId
          ? demoWarehouseTransactions.filter(transaction => transaction.stock_id === stockId)
          : demoWarehouseTransactions,
      );
    },
    staleTime: isConfigured ? 30_000 : Infinity,
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
    }) => {
      if (isConfigured) {
        return stockRepository.performTransaction(stockId, type, quantityChange, referenceNumber, notes);
      }

      const currentStock = queryClient.getQueryData<StockItem[]>(['stock']) || demoStockItems;
      const target = currentStock.find(item => item.id === stockId);

      if (!target) {
        throw new Error('Stock item not found in demo inventory.');
      }

      const nextQuantity = target.quantity + quantityChange;

      if (nextQuantity < 0) {
        throw new Error('Insufficient stock to perform this transaction.');
      }

      const updatedItem = { ...target, quantity: nextQuantity };
      const updatedStock = currentStock.map(item => item.id === stockId ? updatedItem : item);
      const transaction = {
        id: `demo-tx-${Date.now()}`,
        stock_id: stockId,
        user_id: 'demo-user',
        type,
        quantity_change: quantityChange,
        previous_quantity: target.quantity,
        new_quantity: nextQuantity,
        reference_number: referenceNumber || 'DEMO',
        notes: notes || null,
        created_at: new Date().toISOString(),
        stock: {
          item_name: target.item_name,
          sku: target.sku,
          barcode: target.barcode,
        },
      };

      queryClient.setQueryData(['stock'], updatedStock);
      queryClient.setQueryData(['stock_transactions', undefined], (current: any[] = demoWarehouseTransactions) => [
        transaction,
        ...current,
      ]);
      queryClient.setQueryData(['stock_transactions', stockId], (current: any[] = []) => [
        transaction,
        ...current,
      ]);

      return Promise.resolve(updatedItem);
    },
    onSuccess: (_, variables) => {
      if (!isConfigured) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock_transactions', variables.stockId] });
      queryClient.invalidateQueries({ queryKey: ['stock_transactions', undefined] }); // invalidate global
    }
  });
};
