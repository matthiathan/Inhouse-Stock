import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderRepository } from '../../services/api/orderRepository';
import { orderItemRepository } from '../../services/api/orderItemRepository';
import { Order, OrderItem } from '../../types';

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const all = await orderRepository.getAll();
      return all || [];
    }
  });
};

export const useOrdersWithItems = () => {
  return useQuery({
    queryKey: ['ordersWithItems'],
    queryFn: () => orderRepository.getAllOrdersWithItems()
  });
};

export const usePendingOrders = () => {
  return useQuery({
    queryKey: ['orders', 'pending'],
    queryFn: () => orderRepository.getPendingOrders()
  });
};

export const useOrderItemsByOrderId = (orderId: string) => {
  return useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => orderItemRepository.getByOrderId(orderId),
    enabled: !!orderId
  });
};

export const useAllOrderItems = () => {
  return useQuery({
    queryKey: ['orderItems', 'all'],
    queryFn: () => orderItemRepository.getAllItems()
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderNumber,
      deliveryDate,
      items
    }: {
      orderNumber: string;
      deliveryDate: string;
      items: Array<{ barcode: string; requiredQty: number }>;
    }) => orderRepository.createOrderWithItems(orderNumber, deliveryDate, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithItems'] });
    }
  });
};

export const useUpdateFulfillItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      scannedQuantity,
      isFulfilled
    }: {
      id: string;
      scannedQuantity: number;
      isFulfilled: boolean;
    }) => orderItemRepository.updateFulfillment(id, scannedQuantity, isFulfilled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithItems'] });
    }
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      orderRepository.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithItems'] });
    }
  });
};

export const useCompleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => orderRepository.completeOrderTransaction(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithItems'] });
    }
  });
};
