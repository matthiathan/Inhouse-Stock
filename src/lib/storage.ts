import { supabase } from './supabase';

export const uploadAssetPhoto = async (file: File, assetId: string) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `assets/${assetId}-${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('assets') // Ensure you have a bucket named 'assets'
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
  return data.publicUrl;
};
