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

export async function updateAssetSection(machineId: string, newSection: string) {
  try {
    // 1. We MUST target the 'machines' table, and update the 'section' column
    const { data, error } = await supabase
      .from('machines')
      .update({ section: newSection })
      .eq('id', machineId)
      .select()
      .single();

    if (error) {
      console.error('Supabase Update Error:', error.message);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update machine section:', error);
    throw error;
  }
}

export interface ComprehensiveMachineData {
  faDocNo?: string;
  assetName: string;
  assetNo?: string;
  serialNo: string;
  qrCode: string;
  machineType?: string;
  machineModel?: string;
  section: string; // matches Current Location
  customerName?: string;
  customerCode?: string; // C.Code
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


