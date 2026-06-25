import { BaseRepository } from './baseRepository';
import { Machine } from '../../types';
import { supabase } from '../../lib/supabase';
import { RepositoryValidationError } from '../../lib/schemas';

export class AssetRepository extends BaseRepository<Machine> {
  constructor() {
    super('machines');
  }

  override async getAll(sectionId?: string): Promise<Machine[] | null> {
    let query = supabase.from(this.tableName).select('*');
    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as Machine[];
  }

  async getAssetDetails(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('v_machine_details')
      .select('*')
      .eq('machine_id', id)
      .single();
    if (error) {
      console.error(`Asset details for ID ${id} not found.`);
      return null;
    }
    // Also inject the raw section_id for the edit modal
    const { data: raw } = await supabase.from('machines').select('section_id').eq('id', id).single();
    if (raw) {
       data.section_id = raw.section_id;
    }
    return data;
  }

  override async create(item: Omit<Machine, 'id' | 'created_at'>): Promise<Machine | null> {
    return super.create(item);
  }

  override async update(id: string, item: Partial<Machine>): Promise<Machine | null> {
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Asset ID must be a non-empty string.');
    }
    return super.update(id, item);
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

  async updateSection(id: string, sectionId: string | null): Promise<Machine | null> {
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Asset ID must be a non-empty string.');
    }

    if (!sectionId) {
      throw new RepositoryValidationError('Validation Guard: Section ID is required.');
    }

    const { data: movedMachine, error: rpcError } = await supabase.rpc('change_machine_section', {
      p_machine_id: id,
      p_new_section_id: Number(sectionId),
      p_reason: 'Asset section update from operations portal',
    });

    if (!rpcError) {
      return movedMachine as Machine;
    }

    if (!/could not find|schema cache|function/i.test(rpcError.message || '')) {
      throw rpcError;
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .update({ section_id: sectionId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Machine;
  }

  async getMachineModels(): Promise<string[]> {
    const { data, error } = await supabase
      .from('fam')
      .select('model_name');
    
    if (error) {
      console.error("Error fetching machine types:", error);
      return [];
    }
    return (data || []).map(row => row.model_name);
  }
}

export const assetRepository = new AssetRepository();
