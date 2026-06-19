import { BaseRepository } from './baseRepository';
import { OrderItem } from '../../types';
import { supabase } from '../../lib/supabase';
import { dbOrderItemSchema, RepositoryValidationError } from '../../lib/schemas';

export class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor() {
    super('order_items');
  }

  override async create(item: Omit<OrderItem, 'id'>): Promise<OrderItem | null> {
    const validation = dbOrderItemSchema.safeParse({
      order_id: item.order_id,
      stock_barcode: item.stock_barcode,
      item_name: item.item_name,
      required_quantity: item.required_quantity,
      scanned_quantity: item.scanned_quantity,
      is_fulfilled: item.is_fulfilled
    });
    if (!validation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Failed to create order item due to invalid fields.',
        validation.error.format()
      );
    }
    return super.create(item);
  }

  override async update(id: string, item: Partial<OrderItem>): Promise<OrderItem | null> {
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Order Item ID must be a non-empty string.');
    }
    const validation = dbOrderItemSchema.partial().safeParse({
      order_id: item.order_id,
      stock_barcode: item.stock_barcode,
      item_name: item.item_name,
      required_quantity: item.required_quantity,
      scanned_quantity: item.scanned_quantity,
      is_fulfilled: item.is_fulfilled
    });
    if (!validation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Failed to update order item due to invalid fields.',
        validation.error.format()
      );
    }
    return super.update(id, item);
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
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Order Item ID must be a non-empty string.');
    }

    const validation = dbOrderItemSchema.partial().safeParse({
      scanned_quantity: scannedQuantity,
      is_fulfilled: isFulfilled
    });
    
    if (!validation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Failed to update fulfillment because of invalid quantity or status values.',
        validation.error.format()
      );
    }

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

