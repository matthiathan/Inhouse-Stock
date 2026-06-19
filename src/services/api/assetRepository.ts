import { BaseRepository } from './baseRepository';
import { Machine } from '../../types';
import { supabase } from '../../lib/supabase';
import { machineSchema, RepositoryValidationError } from '../../lib/schemas';

export class AssetRepository extends BaseRepository<Machine> {
  constructor() {
    super('machines');
  }

  override async create(item: Omit<Machine, 'id' | 'created_at'>): Promise<Machine | null> {
    const validation = machineSchema.partial().safeParse(item);
    if (!validation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Failed to create machine asset due to invalid input fields.',
        validation.error.format()
      );
    }
    return super.create(item);
  }

  override async update(id: string, item: Partial<Machine>): Promise<Machine | null> {
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Asset ID must be a non-empty string.');
    }
    const validation = machineSchema.partial().safeParse(item);
    if (!validation.success) {
      throw new RepositoryValidationError(
        'Validation Guard: Failed to update machine asset due to invalid update fields.',
        validation.error.format()
      );
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

  async updateSection(id: string, newSectionName: string): Promise<Machine | null> {
    if (!id || typeof id !== 'string') {
      throw new RepositoryValidationError('Validation Guard: Asset ID must be a non-empty string.');
    }
    const validation = machineSchema.shape.section.safeParse(newSectionName);
    if (!validation.success) {
      throw new RepositoryValidationError(
        `Validation Guard: Failed to update section to '${newSectionName}' due to invalid location format.`,
        validation.error.format()
      );
    }

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

