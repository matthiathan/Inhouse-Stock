import { BaseRepository } from './baseRepository';
import { Order } from '../../types';
import { supabase } from '../../lib/supabase';
import { dbOrderSchema, dbOrderItemSchema, RepositoryValidationError } from '../../lib/schemas';

export class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super('orders');
  }

  override async create(item: Omit<Order, 'id' | 'created_at'>): Promise<Order | null> {
    const mappedItem = {
      order_number: (item as any).order_number || (item as any).orderNumber,
      delivery_date: (item as any).delivery_date || (item as any).deliveryDate,
      status: item.status || 'Pending'
    };
    const validation = dbOrderSchema.safeParse(mappedItem);
    if (!validation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Failed to create order due to invalid input fields.',
        validation.error.format()
      );
    }
    return super.create(item);
  }

  override async update(id: string, item: Partial<Order>): Promise<Order | null> {
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Order ID must be a non-empty string.');
    }
    const mappedItem: Record<string, any> = {};
    if ((item as any).order_number !== undefined) mappedItem.order_number = (item as any).order_number;
    if ((item as any).orderNumber !== undefined) mappedItem.order_number = (item as any).orderNumber;
    if ((item as any).delivery_date !== undefined) mappedItem.delivery_date = (item as any).delivery_date;
    if ((item as any).deliveryDate !== undefined) mappedItem.delivery_date = (item as any).deliveryDate;
    if (item.status !== undefined) mappedItem.status = item.status;

    const validation = dbOrderSchema.partial().safeParse(mappedItem);
    if (!validation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Failed to update order due to invalid properties.',
        validation.error.format()
      );
    }
    return super.update(id, item);
  }

  async getAllOrdersWithItems(): Promise<Order[]> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return orders as any as Order[];
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
    // Standardize validation utilizing Zod schemas before any database interactions
    const orderValidation = dbOrderSchema.safeParse({
      order_number: orderNumber,
      delivery_date: deliveryDate,
      status: 'Pending'
    });

    if (!orderValidation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Cannot create order with invalid basic fields.',
        orderValidation.error.format()
      );
    }

    // Guard checking each nested order item attributes
    for (const item of items) {
      const itemValidation = dbOrderItemSchema.safeParse({
        order_id: '00000000-0000-0000-0000-000000000000', // placeholder uuid for static attribute verification
        stock_barcode: item.barcode,
        item_name: item.item_name,
        required_quantity: item.requiredQty,
        scanned_quantity: 0,
        is_fulfilled: false
      });

      if (!itemValidation.success) {
        throw new RepositoryValidationError(
          `Validation Guard: Cannot create order line item '${item.item_name || item.barcode}' with invalid field values.`,
          itemValidation.error.format()
        );
      }
    }

    // 1. Insert order
    const { data: order, error: orderError } = await supabase
      .from(this.tableName)
      .insert({
        order_number: orderNumber,
        delivery_date: deliveryDate,
        status: 'Pending',
        items_summary: items.map(item => ({
          barcode: item.barcode,
          item_name: item.item_name,
          required_qty: item.requiredQty
        }))
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
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Order ID must be a non-empty string.');
    }

    const statusValidation = dbOrderSchema.shape.status.safeParse(status);
    if (!statusValidation.success) {
      throw new RepositoryValidationError(
        `Validation Guard: Cannot update status to '${status}' because it is not a recognized enum value.`,
        statusValidation.error.format()
      );
    }

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
    if (!orderId || typeof orderId !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Order ID must be a genuine string.');
    }

    const { error } = await supabase.rpc('complete_order_transaction', { order_id_param: orderId });
    if (error) throw error;
  }
}

export const orderRepository = new OrderRepository();

