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

/**
 * Service function to look up a machine by its QR Code.
 * Performs a nested join to pull both the asset info and the location.
 */
export async function getMachineDataByQRCode(qrCode: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('machines')
    .select('*, fam(*), section(section_name)')
    .eq('qr_code', qrCode)
    .single();

  if (error) {
    console.error(`Error fetching machine by QR code ${qrCode}:`, error);
    return null;
  }

  return data;
}
