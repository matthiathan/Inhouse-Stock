import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contractRepository } from '../services/api/contractRepository';
import { useQuery } from '@tanstack/react-query';
import { userRepository } from '../features/users/repository';
import { assetRepository } from '../services/api/assetRepository';
import { sclRepository } from '../features/dispatch/repository';
import { toast } from 'sonner';
import { sclSchema, SclSchemaValue } from '../features/dispatch/schema';
import { useContractLookup, useSubmitSCL } from '../features/dispatch/hooks';
import { ComboBox } from './ui/ComboBox';
import { AlertCircle, ShieldAlert, CheckCircle, RefreshCcw } from 'lucide-react';
import { DB_COLS } from '../constants/db';
import { 
  checkAssetThresholds, 
  isAssetDispatchDisabled, 
  approveDefectiveAsset, 
  logStateTransition 
} from '../utils/sclStateMachine';
import { User, Machine } from '../types';

interface SCLCustomer {
  id: string;
  name: string;
  code: string;
  address: string;
}

const EMPTY_ARRAY: SCLCustomer[] = [];

export function SCLDispatchForm({ onSuccess }: { onSuccess?: () => void }) {
  const [region, setRegion] = useState<'KZN' | 'JHB' | 'CPT'>('KZN');
  const submitSclMutation = useSubmitSCL();

  const { data: customers = EMPTY_ARRAY, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['contract-customers', region],
    queryFn: async () => {
      const names = await contractRepository.getContractCustomers(region);
      return names.map(name => ({
        id: name,
        name: name,
        code: '',
        address: ''
      }));
    }
  });

  const handleRegionChange = (newRegion: 'KZN' | 'JHB' | 'CPT') => {
    setRegion(newRegion);
    setValue('customer_id', '');
    setValue('serial_number', '');
    setValue('qrcode', '');
  };

  const [techs, setTechs] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [predictiveAlert, setPredictiveAlert] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [activeSerial, setActiveSerial] = useState<string>('');

  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<SclSchemaValue>({
    resolver: zodResolver(sclSchema),
    defaultValues: {
      doc_no: '',
      do_number: '',
      priority: 'Low',
      current_status: 'Open',
      service_type: 'Maintenance',
      sub_task: '',
      customer_id: '',
      assigned_employee_id: '',
      serial_number: '',
      qrcode: '',
      narration: '',
    }
  });

  const selectedCustomerId = watch('customer_id');
  const selectedSerialNumber = watch('serial_number');

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch customer, tech and machine data
  const fetchData = async () => {
    try {
      const [tData, mData] = await Promise.all([
        userRepository.getTechnicians(),
        assetRepository.getAll()
      ]);

      if (tData) setTechs(tData);
      if (mData) setMachines(mData);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Failed to load auxiliary dispatch data: ' + message);
    }
  };

  // Filter machines based on selected customer and check thresholds
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        // Filter machines comparing to customer.code or customer name/info
        const filtered = machines.filter(m => 
          m.customer_code === customer.code || 
          m.customer_id === customer.id ||
          m.client_name === customer.name
        );
        setFilteredMachines(filtered);
        
        // Reset serial select if no longer matching
        if (selectedSerialNumber && !filtered.some(m => m.serial_number === selectedSerialNumber)) {
          setValue('serial_number', '');
          setValue('qrcode', '');
        }
      } else {
        setFilteredMachines([]);
      }
    } else {
      setFilteredMachines([]);
    }
    setPredictiveAlert(null);
    setIsBlocked(false);
  }, [selectedCustomerId, customers, machines, setValue]);

  // Handle serial number selection and asset predictive check
  useEffect(() => {
    if (selectedSerialNumber) {
      setActiveSerial(selectedSerialNumber);
      const machine = machines.find(m => m.serial_number === selectedSerialNumber);
      if (machine) {
        setValue('qrcode', machine.qr_code || '');
        
        // Check predictive asset thresholds (3 calls in 30 days)
        const checkThresholds = async () => {
          const result = await checkAssetThresholds(selectedSerialNumber);
          if (result.exceeded) {
            setPredictiveAlert(result.alertMessage || null);
            setIsBlocked(isAssetDispatchDisabled(selectedSerialNumber));
          } else {
            setPredictiveAlert(null);
            setIsBlocked(false);
          }
        };
        checkThresholds();
      }
    } else {
      setValue('qrcode', '');
      setPredictiveAlert(null);
      setIsBlocked(false);
    }
  }, [selectedSerialNumber, machines, setValue]);

  // Derive contract document reference and fetch details
  const selectedMachine = machines.find(m => m.serial_number === selectedSerialNumber);
  const faDocId = selectedMachine 
    ? (selectedMachine[DB_COLS.FA_DOC_NO.replace(/"/g, '')] || selectedMachine[DB_COLS.CONTRACT_NUM.replace(/"/g, '')] || selectedMachine.contractNo || selectedMachine.faDocNo || selectedMachine.fa_doc_id || selectedMachine.contract_no) 
    : null;

  const { data: contract } = useContractLookup(faDocId || undefined);

  // Sync region selector to the selected machine's document region representation
  useEffect(() => {
    if (faDocId) {
      if (faDocId.startsWith('CA21')) {
        setRegion('JHB');
      } else if (faDocId.startsWith('CA31')) {
        setRegion('CPT');
      } else if (faDocId.startsWith('CA41')) {
        setRegion('KZN');
      }
    }
  }, [faDocId]);

  useEffect(() => {
    if (contract) {
      // Auto-fill customer if a match is found based on customer name or customer code
      const contractCustomerCode = contract.customer_code || contract[DB_COLS.CUSTOMER_CODE_ALT.replace(/"/g, '')] || contract[DB_COLS.CUST_CODE.replace(/"/g, '')] || contract[DB_COLS.CUST_NO.replace(/"/g, '')];
      const contractCustomerName = contract.customer_name || contract[DB_COLS.CUSTOMER_NAME.replace(/"/g, '')] || contract['client_name'];
      
      const matchedCustomer = customers.find(c => {
        if (contractCustomerCode && c.code && String(c.code).toLowerCase() === String(contractCustomerCode).toLowerCase()) {
          return true;
        }
        if (contractCustomerName && c.name && String(c.name).toLowerCase() === String(contractCustomerName).toLowerCase()) {
          return true;
        }
        return false;
      });

      if (matchedCustomer) {
        setValue('customer_id', matchedCustomer.id);
      }

      // Map agreement/contract type to standard service type
      const aggType = (contract.agreement_type || contract.service_type || contract[DB_COLS.SERVICE_TYPE.replace(/"/g, '')] || contract[DB_COLS.AGREEMENT_TYPE.replace(/"/g, '')] || '').toLowerCase();
      if (aggType.includes('install')) {
        setValue('service_type', 'Installation');
      } else if (aggType.includes('repair') || aggType.includes('break') || aggType.includes('corr')) {
        setValue('service_type', 'Repair');
      } else {
        setValue('service_type', 'Maintenance');
      }
    }
  }, [contract, customers, setValue]);

  const handleManagerApprove = () => {
    if (activeSerial) {
      approveDefectiveAsset(activeSerial);
      setIsBlocked(false);
      toast.success(`Asset ${activeSerial} has been approved by Manager. Dispatch block removed.`);
    }
  };

  const onSubmit = async (data: SclSchemaValue) => {
    if (isAssetDispatchDisabled(data.serial_number)) {
      toast.error('Dispatch is disabled for this DEFECTIVE asset pending manager approval.');
      return;
    }

    const customer = customers.find(c => c.id === data.customer_id);
    // Find technicial using id, supporting both name and full_name
    const tech = techs.find(t => t.id === data.assigned_employee_id);
    const techName = tech ? (tech.full_name || tech.name || 'Technician') : 'Technician';

    const payload = {
      "DocNo": data.doc_no,
      "DO#": data.do_number,
      "Priority": data.priority,
      "Service Type": data.service_type,
      "Sub Task": data.sub_task,
      "Narration": data.narration,
      customer_id: data.customer_id,
      assigned_employee_id: data.assigned_employee_id,
      "Serial #": data.serial_number,
      "QRCODE": data.qrcode,
      "Client Name": customer?.name || '',
      "Client location": customer?.address || '',
      "Address": customer?.address || '',
      "Customer Code": customer?.code || '',
      "Assigned Employee": techName,
      "CURRENT STATUS": data.current_status,
      "ASSIGNED DATE TIME": new Date().toISOString(),
    };

    submitSclMutation.mutate(payload, {
      onSuccess: async (insertData) => {
        toast.success('Service call logged and dispatched successfully!');
        
        // Audit log action
        if (insertData && insertData.id) {
          try {
            await logStateTransition(
              insertData.id,
              'None',
              data.current_status,
              data.assigned_employee_id,
              techName,
              'Initial SCL Dispatch Creation'
            );
          } catch (auditErr) {
            console.warn("Audit log failed (might be offline):", auditErr);
          }
        }

        onSuccess?.();
      },
      onError: (err: Error) => {
        if (err.message === 'OFFLINE_SAVED') {
           // handled by hook toast
           onSuccess?.(); // Close modal anyway since it's saved offline
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 bg-white p-6 rounded-xl border border-gray-200/90 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-base font-semibold text-gray-900">Log New Service Call (SCL)</h3>
        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-mono border border-blue-100">scl_driven</span>
      </div>

      {predictiveAlert && (
        <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-lg space-y-2">
          <div className="flex items-start gap-2.5 text-amber-800 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">{predictiveAlert}</p>
          </div>
          {isBlocked && (
            <div className="flex items-center gap-2 bg-red-50 text-red-800 border border-red-200/80 rounded p-3 text-xs justify-between mt-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="w-4 h-4 text-red-600" /> Dispatch Locked
              </span>
              <button 
                type="button" 
                onClick={handleManagerApprove}
                className="bg-red-600 font-bold text-white px-3 py-1 rounded shadow hover:bg-red-700 transition"
              >
                Manager Override / Approve
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Doc No</label>
          <Controller
            name="doc_no"
            control={control}
            render={({ field }) => (
              <input 
                {...field} 
                placeholder="DOC-001" 
                className="w-full text-sm p-2 border border-gray-300 rounded focus:border-brand-gold focus:outline-none" 
              />
            )}
          />
          {errors.doc_no && <p className="text-red-500 text-xs mt-1">{errors.doc_no.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">DO Number</label>
          <Controller
            name="do_number"
            control={control}
            render={({ field }) => (
              <input 
                {...field} 
                placeholder="DO-12345" 
                className="w-full text-sm p-2 border border-gray-300 rounded focus:border-brand-gold focus:outline-none" 
              />
            )}
          />
          {errors.do_number && <p className="text-red-500 text-xs mt-1">{errors.do_number.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-500">Division / Region</label>
        <div className="flex gap-2">
          {(['KZN', 'JHB', 'CPT'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRegionChange(r)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                region === r 
                  ? 'bg-brand-gold text-white border-brand-gold shadow-sm font-bold' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
        <Controller
          name="customer_id"
          control={control}
          render={({ field }) => (
            <ComboBox
              options={customers.map(c => ({ label: c.name, value: c.id }))}
              value={field.value}
              onChange={field.onChange}
              placeholder={isCustomersLoading ? "Loading customers..." : "Search and select customer from contracts..."}
            />
          )}
        />
        {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id.message}</p>}
      </div>

      {selectedCustomerId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Asset Serial Number</label>
            <Controller
              name="serial_number"
              control={control}
              render={({ field }) => (
                <ComboBox
                  options={filteredMachines.map(m => ({ label: `${m.serial_number} - ${m.asset_name}`, value: m.serial_number }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select serial number..."
                />
              )}
            />
            {errors.serial_number && <p className="text-red-500 text-xs mt-1">{errors.serial_number.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Asset QR Code</label>
            <Controller
              name="qrcode"
              control={control}
              render={({ field }) => (
                <input 
                  type="text" 
                  value={field.value} 
                  disabled 
                  placeholder="QR Code auto-fills" 
                  className="w-full text-sm p-2 border border-blue-100 bg-blue-50/20 text-gray-500 rounded font-mono" 
                />
              )}
            />
            {errors.qrcode && <p className="text-red-500 text-xs mt-1">{errors.qrcode.message}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <ComboBox
                options={[
                  { label: 'Low', value: 'Low' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'High', value: 'High' },
                  { label: 'Critical', value: 'Critical' }
                ]}
                value={field.value}
                onChange={field.onChange}
                searchable={false}
              />
            )}
          />
          {errors.priority && <p className="text-red-500 text-xs mt-1">{errors.priority.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Service Type</label>
          <Controller
            name="service_type"
            control={control}
            render={({ field }) => (
              <ComboBox
                options={[
                  { label: 'Maintenance', value: 'Maintenance' },
                  { label: 'Installation', value: 'Installation' },
                  { label: 'Repair', value: 'Repair' }
                ]}
                value={field.value}
                onChange={field.onChange}
                searchable={false}
              />
            )}
          />
          {errors.service_type && <p className="text-red-500 text-xs mt-1">{errors.service_type.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Call Status</label>
          <Controller
            name="current_status"
            control={control}
            render={({ field }) => (
              <ComboBox
                options={[
                  { label: 'Open', value: 'Open' },
                  { label: 'In Progress', value: 'In Progress' },
                  { label: 'Closed', value: 'Closed' }
                ]}
                value={field.value}
                onChange={field.onChange}
                searchable={false}
              />
            )}
          />
          {errors.current_status && <p className="text-red-500 text-xs mt-1">{errors.current_status.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Assigned Technician</label>
          <Controller
            name="assigned_employee_id"
            control={control}
            render={({ field }) => (
              <ComboBox
                options={techs.map(t => ({ label: t.full_name || t.name || 'Tech', value: t.id }))}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select technician..."
              />
            )}
          />
          {errors.assigned_employee_id && <p className="text-red-500 text-xs mt-1">{errors.assigned_employee_id.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sub Task</label>
          <Controller
            name="sub_task"
            control={control}
            render={({ field }) => (
              <input 
                {...field} 
                placeholder="e.g. Pump replacement" 
                className="w-full text-sm p-2 border border-gray-300 rounded focus:border-brand-gold focus:outline-none" 
              />
            )}
          />
          {errors.sub_task && <p className="text-red-500 text-xs mt-1">{errors.sub_task.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Narration/Issue Details</label>
        <Controller
          name="narration"
          control={control}
          render={({ field }) => (
            <textarea 
              {...field} 
              placeholder="Provide detailed description of the reported issue..." 
              className="w-full text-sm p-2 border border-gray-300 rounded h-20 focus:border-brand-gold focus:outline-none" 
            />
          )}
        />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting || submitSclMutation.isPending || isBlocked} 
        className="w-full bg-brand-gold disabled:bg-gray-200 disabled:text-gray-400 font-semibold text-white p-3 rounded-lg text-sm transition-all hover:bg-brand-gold/90 flex items-center justify-center gap-2"
      >
        {isSubmitting || submitSclMutation.isPending ? (
          <>
            <RefreshCcw className="w-4 h-4 animate-spin" />
            Dispatching SCL...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Dispatch Service Call
          </>
        )}
      </button>
    </form>
  );
}
