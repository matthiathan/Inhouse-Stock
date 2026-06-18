import { BaseRepository } from './baseRepository';
import { OrderItem } from '../../types';
import { supabase } from '../../lib/supabase';

export class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor() {
    super('order_items');
  }

  async getByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('order_id', orderId);
    if (error) throw error;
    return data as OrderItem[];
  }

  async getAllItems(): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');
    if (error) throw error;
    return data as OrderItem[];
  }

  async updateFulfillment(id: string, scannedQuantity: number, isFulfilled: boolean): Promise<OrderItem> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        scanned_quantity: scannedQuantity,
        is_fulfilled: isFulfilled
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as OrderItem;
  }
}

export const orderItemRepository = new OrderItemRepository();
