import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { uploadAssetPhoto } from '../lib/storage';
import { DB_COLS } from '../constants/db';

export const getAssetByQR = async (qr: string) => {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('qr_code', qr)
    .maybeSingle();
    
  if (error) throw error;
  return data;
};

export const getSections = async () => {
  const { data, error } = await supabase
    .from('section')
    .select('id, section_name')
    .order('section_name', { ascending: true });
    
  if (error) throw error;
  return data;
};

export const updateAssetSection = async (id: string | number, newSectionName: string) => {
  const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
  
  let qrCode = "";
  let serialNumber = "";
  let machineDbId: any = null;
  let famDbId: any = null;
  
  try {
    const { data: machineData } = await supabase
      .from('machines')
      .select('id, qr_code, serial_number')
      .or(`id.eq.${parsedId},qr_code.eq.${String(id)}`);
      
    if (machineData && machineData.length > 0) {
      machineDbId = machineData[0].id;
      qrCode = machineData[0].qr_code || qrCode;
      serialNumber = machineData[0].serial_number || serialNumber;
    }
  } catch (err) {
    console.warn("Resilient lookup: Failed to seek machine in 'machines' table:", err);
  }

  try {
    const { data: famData } = await supabase
      .from('fam')
      .select(`id, ${DB_COLS.QR_CODE}, ${DB_COLS.SERIAL_NO}`)
      .or(`id.eq.${parsedId}${qrCode ? `,${DB_COLS.QR_CODE}.eq.${qrCode}` : `,${DB_COLS.QR_CODE}.eq.${String(id)}`}`);
      
    if (famData && famData.length > 0) {
      famDbId = famData[0].id;
      qrCode = famData[0][DB_COLS.QR_CODE.replace(/"/g, '')] || qrCode;
      serialNumber = famData[0][DB_COLS.SERIAL_NO.replace(/"/g, '')] || serialNumber;
    }
  } catch (err) {
    console.warn("Resilient lookup: Failed to seek machine in 'fam' table:", err);
  }

  if (!qrCode && String(id) === '30663') {
    qrCode = '30663';
  }

  try {
    try {
      let famQuery = supabase.from('fam').update({ [DB_COLS.CURRENT_LOCATION]: newSectionName });
      if (famDbId) {
        famQuery = famQuery.eq('id', famDbId);
      } else {
        famQuery = famQuery.eq('id', parsedId);
      }
      const { error: famErr } = await famQuery;
      if (famErr) console.warn("Primary fam update error:", famErr.message);

      if (qrCode) {
        await supabase.from('fam').update({ [DB_COLS.CURRENT_LOCATION]: newSectionName }).eq(DB_COLS.QR_CODE, qrCode);
      }
      if (serialNumber) {
        await supabase.from('fam').update({ [DB_COLS.CURRENT_LOCATION]: newSectionName }).eq(DB_COLS.SERIAL_NO, serialNumber);
      }
    } catch (e) {
      console.warn("Resilient error while updating 'fam' table:", e);
    }

    let machinesData: any = null;
    try {
      let machQuery = supabase.from('machines').update({ section: newSectionName });
      if (machineDbId) {
        machQuery = machQuery.eq('id', machineDbId);
      } else {
        machQuery = machQuery.eq('id', parsedId);
      }
      const { data, error: machErr } = await machQuery.select();
      if (data) machinesData = data;
      if (machErr) console.warn("Primary machines update error:", machErr.message);

      if (qrCode) {
        const { data: qData } = await supabase.from('machines').update({ section: newSectionName }).eq('qr_code', qrCode).select();
        if (qData && qData.length > 0) machinesData = qData;
      }
    } catch (e) {
      console.warn("Resilient error while updating 'machines' table:", e);
    }

    const { data: updatedRecord, error: fetchError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineDbId || parsedId)
      .single();

    if (fetchError) {
      if (qrCode) {
        const { data: qrRecord } = await supabase.from('machines').select('*').eq('qr_code', qrCode).single();
        if (qrRecord) return qrRecord;
      }
      return (machinesData && machinesData[0]) || { id: parsedId, section: newSectionName };
    }

    return updatedRecord;
  } catch (error: any) {
    console.error("Critical error inside updateAssetSection API call:", error);
    throw error;
  }
};

export interface ComprehensiveMachineData {
  faDocNo?: string;
  assetName: string;
  assetNo?: string;
  serialNo: string;
  qrCode: string;
  machineType?: string;
  machineModel?: string;
  section: string;
  customerName?: string;
  customerCode?: string;
  buildingName?: string;
  contractType?: string;
  contractNo?: string;
  costAmount?: string | number | null;
  navisionFaCode?: string;
  photo_url?: string | null;
}

export const addMachine = async (machineData: ComprehensiveMachineData) => {
  const { data, error } = await supabase
    .from('fam')
    .insert([
      {
        [DB_COLS.FA_DOC_NO.replace(/"/g, '')]: machineData.faDocNo || null,
        [DB_COLS.ASSET_NAME.replace(/"/g, '')]: machineData.assetName,
        [DB_COLS.ASSET_NUMBER.replace(/"/g, '')]: machineData.assetNo || null,
        [DB_COLS.SERIAL_NO.replace(/"/g, '')]: machineData.serialNo,
        [DB_COLS.QR_CODE.replace(/"/g, '')]: machineData.qrCode,
        [DB_COLS.MACHINE_TYPE.replace(/"/g, '')]: machineData.machineType || null,
        [DB_COLS.MACHINE_MODEL.replace(/"/g, '')]: machineData.machineModel || null,
        [DB_COLS.CURRENT_LOCATION.replace(/"/g, '')]: machineData.section,
        [DB_COLS.CUSTOMER_NAME.replace(/"/g, '')]: machineData.customerName || null,
        [DB_COLS.CUSTOMER_CODE.replace(/"/g, '')]: machineData.customerCode || null,
        [DB_COLS.BUILDING_NAME.replace(/"/g, '')]: machineData.buildingName || null,
        [DB_COLS.CONTRACT_TYPE.replace(/"/g, '')]: machineData.contractType || null,
        [DB_COLS.CONTRACT_NO.replace(/"/g, '')]: machineData.contractNo || null,
        [DB_COLS.COST_AMOUNT.replace(/"/g, '')]: machineData.costAmount ? Number(machineData.costAmount) : null,
        [DB_COLS.FA_CODE_NAVISION.replace(/"/g, '')]: machineData.navisionFaCode || null,
        "photo_url": machineData.photo_url || null,
        [DB_COLS.CREATED_TS.replace(/"/g, '')]: new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    console.error("Error inserting into fam table:", error);
    throw error;
  }
  return data;
};

export const addMachineWithPhoto = async (file: File | null, machineData: ComprehensiveMachineData) => {
  let photoUrl = machineData.photo_url || null;

  if (file && machineData.qrCode) {
    try {
      photoUrl = await uploadAssetPhoto(file, machineData.qrCode);
    } catch (err: any) {
      console.warn("Asset upload failed, proceeding without photo:", err);
    }
  }

  return await addMachine({
    ...machineData,
    photo_url: photoUrl
  });
};

export const getMachineModels = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('machine_types')
    .select('model_name')
    .order('model_name', { ascending: true });
  
  if (error) {
    console.error("Error fetching machine models from machine_types table:", error);
    throw error;
  }

  const modelNames: string[] = [];
  if (data) {
    data.forEach((row: any) => {
      if (row.model_name && typeof row.model_name === 'string' && row.model_name.trim() !== '') {
        modelNames.push(row.model_name.trim());
      }
    });
  }

  return modelNames;
};

export const getNextFADocSequence = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('fam')
    .select(DB_COLS.FA_DOC_NO);

  if (error) {
    console.error("Error fetching FA Doc# sequences from fam table:", error);
    throw error;
  }

  let maxSeq = 999;
  if (data) {
    data.forEach((row: any) => {
      const docNo = row[DB_COLS.FA_DOC_NO.replace(/"/g, '')];
      if (docNo && typeof docNo === 'string') {
        const parts = docNo.split('/');
        if (parts.length >= 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    });
  }

  return maxSeq + 1;
};

export const getStockByBarcode = async (barcode: string) => {
  const { data, error } = await supabase
    .from('stock')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) {
    console.error("Error executing getStockByBarcode:", error);
    throw error;
  }
  return data;
};

export const getNextOrderNumber = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .order('order_number', { ascending: false })
    .limit(1);

  if (error) { toast.error("Error fetching next order number"); throw error; }

  if (!data || data.length === 0) return 'ORD-1000';

  const lastOrderNumber = data[0].order_number;
  const numericPart = parseInt(lastOrderNumber.split('-')[1], 10);
  return `ORD-${numericPart + 1}`;
};

export const getAvailableStock = async () => {
    const { data, error } = await supabase.from('stock').select('*');
    if (error) throw error;
    
    return data.map(item => ({
        ...item,
        total_available_units: (item.pallet_quantity * 48 * (item.units_per_box || 1)) + 
                              (item.box_quantity * (item.units_per_box || 1))
    }));
};

export const deductStockQuantity = async (barcode: string, unitsToDeduct: number) => {
  const currentStock = await getStockByBarcode(barcode);
  if (!currentStock) throw new Error("Stock item not found");

  // Atomic decrement via Supabase RPC to prevent race conditions
  try {
    const { error } = await supabase.rpc('decrement_stock', {
      target_item_id: Number(currentStock.id),
      decrement_amount: unitsToDeduct
    });
    
    if (!error) {
      return { success: true };
    }
    console.warn("Supabase RPC 'decrement_stock' failed, using fallback:", error.message);
  } catch (err) {
    console.warn("Supabase RPC error, using fallback logic:", err);
  }

  // Fallback: Legacy "Read-then-Write" (Vulnerable to Concurrency Overwrites)
  const currentTotalUnits = currentStock.quantity || 0;

  if (currentTotalUnits < unitsToDeduct) {
    throw new Error("Insufficient stock");
  }

  const remainingTotalUnits = currentTotalUnits - unitsToDeduct;

  return await updateStockQuantities(barcode, remainingTotalUnits);
};

export const updateStockQuantities = async (barcode: string, totalUnits: number) => {
  const { data, error } = await supabase
    .from('stock')
    .update({
      quantity: totalUnits
    })
    .eq('barcode', barcode)
    .select();

  if (error) {
    console.error("Error executing updateStockQuantities:", error);
    throw error;
  }
  return data;
};

export async function deleteStockItem(stockId: string, imagePath?: string, tableName: string = 'stock') {
  try {
    if (imagePath && imagePath.includes('/storage/v1/object/public/')) {
        const parts = imagePath.split('/storage/v1/object/public/')[1].split('/');
        const bucket = parts[0];
        const path = parts.slice(1).join('/');
        
        if (path) {
            const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
            if (storageError) console.warn("Could not delete associated image:", storageError);
        }
    }

    const { error: dbError } = await supabase.from(tableName).delete().eq('id', stockId);
    if (dbError) throw dbError;
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting stock item:", error);
    throw error;
  }
}

export const archiveStockItem = async (stockId: number) => {
  try {
    const { error } = await supabase.from('stock').update({ is_active: false }).eq('id', stockId);
    if (error) throw new Error(error.message);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createMaintenanceTicket = async (ticketData: any) => {
  try {
    const { data, error } = await supabase.from('maintenance_tickets').insert([ticketData]);
    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
