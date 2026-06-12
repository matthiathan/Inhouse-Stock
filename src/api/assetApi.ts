import { supabase } from '../lib/supabase';

export const getAssetByQR = async (qr: string) => {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('qr_code', qr)
    .maybeSingle();

  if (error) {
    console.error("Error fetching machine by QR:", error);
    throw error;
  }
  return data;
};

export const getSections = async () => {
  const { data, error } = await supabase
    .from('section')
    .select('*')
    .order('section_name', { ascending: true });

  if (error) {
    console.error("Error fetching sections:", error);
    throw error;
  }
  return data;
};

export const updateAssetSection = async (id: string, newSectionName: string) => {
  const { data, error } = await supabase
    .from('machines')
    .update({ section: newSectionName })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating machine section:", error);
    throw error;
  }
  return data;
};

