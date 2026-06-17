import { supabase } from '../lib/supabase';

export const createMaintenanceTicket = async (machineId: string, issueDescription: string) => {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .insert([{ machine_id: machineId, issue_description: issueDescription, status: 'Open' }]);
  
  if (error) throw error;
  return data;
};

export const closeMaintenanceTicket = async (
  ticketId: string, 
  resolutionNotes: string, 
  photoFile?: File | null
) => {
  try {
    let uploadedPhotoUrl = null;

    // 1. If a photo was attached, upload it to Supabase Storage first
    if (photoFile) {
      // Create a unique file name to prevent overwriting
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `ticket-${ticketId}-${Date.now()}.${fileExt}`;
      const filePath = `resolutions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('maintenance-photos')
        .upload(filePath, photoFile, {
           cacheControl: '3600',
           upsert: false 
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error("Failed to upload the photo. Please check your connection.");
      }

      // Get the public URL of the uploaded photo
      const { data: publicUrlData } = supabase.storage
        .from('maintenance-photos')
        .getPublicUrl(filePath);
        
      uploadedPhotoUrl = publicUrlData.publicUrl;
    }

    // 2. Update the ticket in the database with the notes AND the photo URL
    const { error: dbError } = await supabase
      .from('maintenance_tickets')
      .update({
        status: 'Closed',
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes,
        photo_url: uploadedPhotoUrl // <--- Save the new photo URL here
      })
      .eq('id', ticketId);

    if (dbError) {
      console.error("Database update error:", dbError);
      throw new Error("Task closed, but failed to save to the database.");
    }

    return { success: true };

  } catch (error: any) {
    console.error("Error closing task:", error);
    return { success: false, error: error.message };
  }
};

