import { BaseRepository } from '../../services/api/baseRepository';
import { StockItem } from '../../types';

export class StockRepository extends BaseRepository<StockItem> {
  constructor() {
    super('stock');
  }
}

export const stockRepository = new StockRepository();
