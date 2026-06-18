import { BaseRepository } from './baseRepository';
import { Machine } from '../../types';
import { supabase } from '../../lib/supabase';

export class AssetRepository extends BaseRepository<Machine> {
  constructor() {
    super('machines');
  }

  async getByQrCode(qrCode: string): Promise<Machine | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('qr_code', qrCode)
      .single();
    if (error) {
      console.warn(`Asset with QR ${qrCode} not found in machines table.`);
      return null;
    }
    return data as Machine;
  }

  async updateSection(id: string, newSectionName: string): Promise<Machine | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ section: newSectionName })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Machine;
  }

  async getMachineModels(): Promise<string[]> {
    const { data, error } = await supabase
      .from('machine_types')
      .select('type_name');
    
    if (error) {
      console.error("Error fetching machine types:", error);
      return [];
    }
    return (data || []).map(row => row.type_name);
  }
}

export const assetRepository = new AssetRepository();
