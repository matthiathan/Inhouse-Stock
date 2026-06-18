
import { supabase } from '../../lib/supabase';

export class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async getAll(): Promise<T[] | null> {
    const { data, error } = await supabase.from(this.tableName).select('*');
    if (error) throw error;
    return data as T[];
  }

  async getById(id: string): Promise<T | null> {
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data as T;
  }

  async create(item: Omit<T, 'id' | 'created_at'>): Promise<T | null> {
    const { data, error } = await supabase.from(this.tableName).insert([item as any]).select().single();
    if (error) throw error;
    return data as T;
  }

  async update(id: string, item: Partial<T>): Promise<T | null> {
    const { data, error } = await supabase.from(this.tableName).update(item as any).eq('id', id).select().single();
    if (error) throw error;
    return data as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
  }
}
