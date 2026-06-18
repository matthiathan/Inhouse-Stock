import { supabase } from './supabase';

export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const uploadAssetPhoto = async (file: File, assetId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `assets/${assetId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('assets') // Ensure you have a bucket named 'assets'
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.warn('Storage upload error (fallback active):', uploadError.message);
      return await fileToBase64(file);
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err: any) {
    console.warn('Unexpected upload failure, falling back to base64 encoding:', err.message || err);
    return await fileToBase64(file);
  }
};

export const uploadStockPhoto = async (file: File, barcode: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `stock/${barcode}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('assets') // Using 'assets' bucket
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.warn('Storage stock upload error (fallback active):', uploadError.message);
      return await fileToBase64(file);
    }

    const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err: any) {
    console.warn('Unexpected stock upload failure, falling back to base64 encoding:', err.message || err);
    return await fileToBase64(file);
  }
};

export const uploadMaintenancePhoto = async (file: File | Blob, sclId: string): Promise<string> => {
  try {
    const fileExt = 'jpg';
    const filePath = `maintenance/${sclId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('maintenance-photos')
      .upload(filePath, file, { contentType: 'image/jpeg', cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.warn('Storage maintenance upload error (fallback active):', uploadError.message);
      return await fileToBase64(file);
    }

    const { data } = supabase.storage.from('maintenance-photos').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err: any) {
    console.warn('Unexpected maintenance upload failure, falling back to base64 encoding:', err.message || err);
    return await fileToBase64(file);
  }
};
