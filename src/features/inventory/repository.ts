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

  async decrement(itemId: number, amount: number) {
    try {
      const { error } = await supabase.rpc('decrement_stock', {
        target_item_id: itemId,
        decrement_amount: amount
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('insufficient') || msg.includes('stock') || msg.includes('constraint') || msg.includes('below') || msg.includes('negative')) {
          throw new InsufficientStockError(error.message);
        }
        throw error;
      }
    } catch (err: any) {
      if (err instanceof InsufficientStockError) {
        throw err;
      }
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('insufficient') || msg.includes('stock') || msg.includes('constraint') || msg.includes('below') || msg.includes('negative')) {
        throw new InsufficientStockError(err?.message || 'Insufficient stock available to perform this action');
      }
      throw err;
    }
  }
}

export const decrementStockItem = async (itemId: number, amount: number) => {
  return stockRepository.decrement(itemId, amount);
};

export const stockRepository = new StockRepository();
