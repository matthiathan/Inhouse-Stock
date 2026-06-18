import { BaseRepository } from '../../services/api/baseRepository';
import { StockItem } from '../../types';
import { uploadStockPhoto } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

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
    const { error } = await supabase.rpc('decrement_stock', {
      target_item_id: itemId,
      decrement_amount: amount
    });

    if (error) throw error;
  }
}

export const decrementStockItem = async (itemId: number, amount: number) => {
  return stockRepository.decrement(itemId, amount);
};

export const stockRepository = new StockRepository();
