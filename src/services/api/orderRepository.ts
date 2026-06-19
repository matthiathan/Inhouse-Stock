import { BaseRepository } from './baseRepository';
import { Order } from '../../types';
import { supabase } from '../../lib/supabase';

export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders');
  }

  async getAllOrdersWithItems(): Promise<{ orders: Order[]; orderItems: any[] }> {
    const { data: orders, error: oError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (oError) throw oError;

    const { data: orderItems, error: oiError } = await supabase
      .from('order_items')
      .select('*');

    if (oiError) throw oiError;

    return {
      orders: orders as Order[],
      orderItems: orderItems || []
    };
  }

  async getPendingOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Order[];
  }

  async createOrderWithItems(
    orderNumber: string, 
    deliveryDate: string, 
    items: Array<{ barcode: string; requiredQty: number; item_name: string }>
  ): Promise<Order> {
    // 1. Insert order
    const { data: order, error: orderError } = await supabase
      .from(this.tableName)
      .insert({
        order_number: orderNumber,
        delivery_date: deliveryDate,
        status: 'Pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert items
    for (const item of items) {
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          stock_barcode: item.barcode,
          item_name: item.item_name,
          required_quantity: item.requiredQty,
          scanned_quantity: 0,
          is_fulfilled: false
        });
      
      if (itemError) throw itemError;
    }

    return order as Order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Order;
  }

  async completeOrderTransaction(orderId: string): Promise<void> {
    const { error } = await supabase.rpc('complete_order_transaction', { order_id_param: orderId });
    if (error) throw error;
  }
}

export const orderRepository = new OrderRepository();
