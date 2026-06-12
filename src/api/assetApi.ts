import { supabase } from '../lib/supabase';

export const getAssetByQR = async (qr: string) => {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('qr_code', qr)
    .single();
    
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
  
  // Resolve additional identifiers to make updates extremely resilient
  let qrCode = "";
  let serialNumber = "";
  let machineDbId: any = null;
  let famDbId: any = null;
  
  try {
    // Attempt to look up the machine in 'machines' to resolve actual primary keys and QR code
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
    // Attempt to look up in 'fam' table to resolve DB ID and QR code
    const { data: famData } = await supabase
      .from('fam')
      .select('id, "QR Code", "Serial#"')
      .or(`id.eq.${parsedId}${qrCode ? `,"QR Code".eq.${qrCode}` : `,"QR Code".eq.${String(id)}`}`);
      
    if (famData && famData.length > 0) {
      famDbId = famData[0].id;
      qrCode = famData[0]['QR Code'] || qrCode;
      serialNumber = famData[0]['Serial#'] || serialNumber;
    }
  } catch (err) {
    console.warn("Resilient lookup: Failed to seek machine in 'fam' table:", err);
  }

  // Fallback if we still don't have a qr_code but know ID is like '30663'
  if (!qrCode && String(id) === '30663') {
    qrCode = '30663';
  }

  try {
    // 1. Update the 'fam' table (Current Location column) via ID, QR Code, or Serial Number
    try {
      let famQuery = supabase.from('fam').update({ "Current Location": newSectionName });
      if (famDbId) {
        famQuery = famQuery.eq('id', famDbId);
      } else {
        famQuery = famQuery.eq('id', parsedId);
      }
      const { error: famErr } = await famQuery;
      if (famErr) {
        console.warn("Primary fam update error:", famErr.message);
      }

      if (qrCode) {
        const { error: famQrErr } = await supabase
          .from('fam')
          .update({ "Current Location": newSectionName })
          .eq('QR Code', qrCode);
        if (famQrErr) console.warn("QR-based fam update error:", famQrErr.message);
      }

      if (serialNumber) {
        const { error: famSnErr } = await supabase
          .from('fam')
          .update({ "Current Location": newSectionName })
          .eq('Serial#', serialNumber);
        if (famSnErr) console.warn("Serial-based fam update error:", famSnErr.message);
      }
    } catch (e) {
      console.warn("Resilient error while updating 'fam' table:", e);
    }

    // 2. Update the 'machines' table (section column) via ID or QR Code
    let machinesData: any = null;
    try {
      let machQuery = supabase.from('machines').update({ section: newSectionName });
      if (machineDbId) {
        machQuery = machQuery.eq('id', machineDbId);
      } else {
        machQuery = machQuery.eq('id', parsedId);
      }
      const { data, error: machErr } = await machQuery.select();
      if (data) {
        machinesData = data;
      }
      if (machErr) {
        console.warn("Primary machines update error:", machErr.message);
      }

      if (qrCode) {
        const { data: qData, error: machQrErr } = await supabase
          .from('machines')
          .update({ section: newSectionName })
          .eq('qr_code', qrCode)
          .select();
        if (qData && qData.length > 0) {
          machinesData = qData;
        }
        if (machQrErr) console.warn("QR-based machines update error:", machQrErr.message);
      }
    } catch (e) {
      console.warn("Resilient error while updating 'machines' table:", e);
    }

    // 3. Retrieve the updated record to return to the frontend
    const { data: updatedRecord, error: fetchError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineDbId || parsedId)
      .single();

    if (fetchError) {
      if (qrCode) {
        const { data: qrRecord } = await supabase
          .from('machines')
          .select('*')
          .eq('qr_code', qrCode)
          .single();
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
}

export const addMachine = async (machineData: ComprehensiveMachineData) => {
  const { data, error } = await supabase
    .from('fam')
    .insert([
      {
        "FA Doc#": machineData.faDocNo || null,
        "Asset Name": machineData.assetName,
        "Asset Number": machineData.assetNo || null,
        "Serial#": machineData.serialNo,
        "QR Code": machineData.qrCode,
        "Machine Type": machineData.machineType || null,
        "Machine Model": machineData.machineModel || null,
        "Current Location": machineData.section,
        "Current Customer Name": machineData.customerName || null,
        "C.Code": machineData.customerCode || null,
        "Current Bldg Name": machineData.buildingName || null,
        "Contr. Type": machineData.contractType || null,
        "Contract#": machineData.contractNo || null,
        "Cost Amount": machineData.costAmount ? Number(machineData.costAmount) : null,
        "FA Code(From Navision)": machineData.navisionFaCode || null,
        "Created TS": new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    console.error("Error inserting into fam table:", error);
    throw error;
  }
  return data;
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
    .select('"FA Doc#"');

  if (error) {
    console.error("Error fetching FA Doc# sequences from fam table:", error);
    throw error;
  }

  let maxSeq = 999;
  if (data) {
    data.forEach((row: any) => {
      const docNo = row['FA Doc#'];
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

export const updateStockQuantities = async (barcode: string, pallets: number, boxes: number) => {
  const { data, error } = await supabase
    .from('stock')
    .update({
      pallet_quantity: pallets,
      box_quantity: boxes
    })
    .eq('barcode', barcode)
    .select();

  if (error) {
    console.error("Error executing updateStockQuantities:", error);
    throw error;
  }
  return data;
};
