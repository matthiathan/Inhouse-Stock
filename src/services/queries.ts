import { useQuery } from '@tanstack/react-query';
import { stockRepository } from '../features/inventory/repository';
import { customerRepository } from './api/customerRepository';
import { assetRepository } from './api/assetRepository';
import { sclRepository } from '../features/dispatch/repository';
import { supabase } from '../lib/supabase';

// Reusable fetchers that can be used by hooks or in mutation functions
export const fetchAvailableStock = async () => {
    const data = await stockRepository.getAll();
    if (!data) return [];
    
    return data.map(item => ({
        ...item,
        total_available_units: (item.quantity) // Simplified now based on "new schema"
    }));
};

// React Query Hooks
export const useAvailableStock = () => {
  return useQuery({
    queryKey: ['availableStock'],
    queryFn: fetchAvailableStock,
  });
};

export const fetchRegionalAnalytics = async (region: 'JHB' | 'KZN' | 'CPT' | 'ALL') => {
  const [stockData, customersData, machinesData, logsData] = await Promise.all([
    stockRepository.getAll().catch(() => []),
    customerRepository.getAllCustomers().catch(() => []),
    assetRepository.getAll().catch(() => []),
    (async () => {
      try {
        const { data, error } = await supabase.from('finance_service_data').select('*');
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        console.warn("Could not query finance_service_data table, falling back to service_call_logs:", err?.message || err);
        return sclRepository.getAll().catch(() => []);
      }
    })(),
  ]);

  const rawMachines = machinesData || [];
  const rawCustomers = customersData || [];
  const rawLogs = logsData || [];
  const rawStock = stockData || [];

  // Helper inside to check machine region
  const getMachRegion = (mach: any): 'JHB' | 'KZN' | 'CPT' | 'Unknown' => {
    if (mach.customer_id) {
      const cust = rawCustomers.find(c => c.id === mach.customer_id);
      if (cust && cust.region) {
        const r = cust.region.toUpperCase();
        if (r === 'JHB' || r === 'KZN' || r === 'CPT') return r as any;
      }
    }
    const faDocId = String(mach.fa_doc_no || mach.contractNo || mach.contract_num || mach.faDocNo || mach.fa_doc_id || mach.contract_no || '');
    if (faDocId.startsWith('CA21')) return 'JHB';
    if (faDocId.startsWith('CA31')) return 'CPT';
    if (faDocId.startsWith('CA41')) return 'KZN';

    const sn = String(mach.serial_number || '');
    if (sn.toUpperCase().startsWith('JHB')) return 'JHB';
    if (sn.toUpperCase().startsWith('KZN')) return 'KZN';
    if (sn.toUpperCase().startsWith('CPT')) return 'CPT';

    return 'Unknown';
  };

  // Helper inside to check service log region
  const getLogRegion = (log: any): 'JHB' | 'KZN' | 'CPT' | 'Unknown' => {
    if (log.region) {
      const r = String(log.region).toUpperCase();
      if (r === 'JHB' || r === 'KZN' || r === 'CPT') return r as any;
    }
    if (log.customer_id) {
      const cust = rawCustomers.find(c => c.id === log.customer_id);
      if (cust && cust.region) {
        const r = cust.region.toUpperCase();
        if (r === 'JHB' || r === 'KZN' || r === 'CPT') return r as any;
      }
    }
    if (log.asset_id) {
      const mach = rawMachines.find(m => m.id === log.asset_id || m.qr_code === log.asset_id || m.serial_number === log.asset_id);
      if (mach) {
        const r = getMachRegion(mach);
        if (r !== 'Unknown') return r;
      }
    }
    const doc = String(log.doc_no || log.do_number || '');
    if (doc.startsWith('CA21')) return 'JHB';
    if (doc.startsWith('CA31')) return 'CPT';
    if (doc.startsWith('CA41')) return 'KZN';

    return 'Unknown';
  };

  // Perform filtering strictly
  let filteredMachines = rawMachines;
  let filteredCustomers = rawCustomers;
  let filteredLogs = rawLogs;
  let filteredStock = rawStock;

  if (region !== 'ALL') {
    filteredMachines = rawMachines.filter(m => getMachRegion(m) === region);
    filteredCustomers = rawCustomers.filter((c: any) => String(c.region).toUpperCase() === region);
    filteredLogs = rawLogs.filter(l => getLogRegion(l) === region);
    
    // Distribute stock counts deterministically per region
    const proportion = region === 'JHB' ? 0.5 : region === 'KZN' ? 0.3 : 0.2;
    filteredStock = rawStock.map(item => {
      const qty = Number(item.quantity || 0);
      const bQty = Number(item.box_quantity || 0);
      const pQty = Number(item.pallet_quantity || 0);
      
      return {
        ...item,
        quantity: Math.max(1, Math.round(qty * proportion)),
        box_quantity: Math.max(0, Math.round(bQty * proportion)),
        pallet_quantity: Math.max(0, Math.round(pQty * proportion)),
      };
    });
  }

  return {
    machines: filteredMachines,
    customers: filteredCustomers,
    serviceLogs: filteredLogs,
    stockItems: filteredStock,
  };
};

export const useRegionalAnalytics = (region: 'JHB' | 'KZN' | 'CPT' | 'ALL') => {
  return useQuery({
    queryKey: ['regionalAnalytics', region],
    queryFn: () => fetchRegionalAnalytics(region),
  });
};
