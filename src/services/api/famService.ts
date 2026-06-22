import { supabase } from '../../lib/supabase';
import { Machine } from '../../types';

/**
 * Service function to look up a machine by its barcode (QR Code).
 * Performs a relational join to fetch customer and section details.
 */
export async function getMachineByBarcode(barcode: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('machines')
    .select(`
      *,
      customer:customers(name, code, contract_number),
      section:sections(name)
    `)
    .eq('qr_code', barcode)
    .single();

  if (error) {
    console.error(`Error fetching machine by barcode ${barcode}:`, error);
    return null;
  }

  return data;
}
