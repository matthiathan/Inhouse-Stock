import { BaseRepository } from '../../services/api/baseRepository';
import { StockItem } from '../../types';
import { uploadStockPhoto } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

export class InsufficientStockError extends Error {
  constructor(message: string = 'Insufficient stock available to perform this action') {
    super(message);
    this.name = 'InsufficientStockError';
  }
}

export class StockRepository extends BaseRepository<StockItem> {
  constructor() {
    super('stock');
  }

  async uploadAndReceive(file: File | null, stockData: Partial<StockItem>) {
    let imageUrl = stockData.image_url || '';

    if (file && stockData.barcode) {
      imageUrl = await uploadStockPhoto(file, stockData.barcode);
    }

    const { data, error } = await supabase
      .from('stock')
      .insert([{
        ...stockData,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async performTransaction(
    stockId: string,
    type: 'RECEIVE' | 'DISPATCH' | 'TRANSFER' | 'ADJUST' | 'ARCHIVE',
    quantityChange: number,
    referenceNumber?: string,
    notes?: string
  ): Promise<StockItem> {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.rpc('record_warehouse_transaction', {
      p_stock_id: stockId,
      p_user_id: user.user?.id || null,
      p_type: type,
      p_quantity_change: quantityChange,
      p_reference_number: referenceNumber || null,
      p_notes: notes || null
    });

    if (error) {
       const msg = (error.message || '').toLowerCase();
       if (msg.includes('insufficient')) {
          throw new InsufficientStockError('Insufficient stock to perform this transaction.');
       }
       throw error;
    }
    
    return data as StockItem;
  }

  async getTransactions(stockId?: string) {
    let query = supabase.from('warehouse_transactions').select(`
      *,
      users!warehouse_transactions_user_id_fkey(full_name),
      stock!warehouse_transactions_stock_id_fkey(item_name, sku, barcode)
    `).order('created_at', { ascending: false });
    
    if (stockId) query = query.eq('stock_id', stockId);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async decrement(itemId: string, amount: number) {
    await this.performTransaction(itemId, 'DISPATCH', -Math.abs(amount), 'API_DECREMENT');
  }
}

export const decrementStockItem = async (itemId: string, amount: number) => {
  return stockRepository.decrement(itemId, amount);
};

export const stockRepository = new StockRepository();
