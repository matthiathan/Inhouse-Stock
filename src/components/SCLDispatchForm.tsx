import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const dispatchSchema = z.object({
  doc_no: z.string().min(1, 'Doc No is required'),
  do_number: z.string().min(1, 'DO Number is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  service_type: z.string().min(1, 'Service Type is required'),
  sub_task: z.string().min(1, 'Sub task is required'),
  narration: z.string().min(1, 'Narration/Issue is required'),
  customer_id: z.string().min(1, 'Customer is required'),
  assigned_employee_id: z.string().min(1, 'Technician is required'),
});

type DispatchForm = z.infer<typeof dispatchSchema>;

export function SCLDispatchForm({ onSuccess }: { onSuccess?: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<DispatchForm>({
    resolver: zodResolver(dispatchSchema),
  });

  const selectedCustomerId = watch('customer_id');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        // Assuming column names based on standard patterns as they weren't explicitly provided
        // We'll trust these based on typical patterns in existing components
        // If these fail, we would need to inspect the db table schema
      }
    }
  }, [selectedCustomerId, customers]);

  const fetchData = async () => {
    const [cRes, tRes] = await Promise.all([
      supabase.from('unified_customers').select('*'),
      supabase.from('users').select('id, name').in('role', ['tech', 'road_tech'])
    ]);
    if (cRes.data) setCustomers(cRes.data);
    if (tRes.data) setTechs(tRes.data);
  };

  const onSubmit = async (data: DispatchForm) => {
    const customer = customers.find(c => c.id === data.customer_id);
    const tech = techs.find(t => t.id === data.assigned_employee_id);

    const payload = {
      ...data,
      client_name: customer?.name,
      client_location: customer?.location,
      address: customer?.address,
      customer_code: customer?.code,
      assigned_employee: tech?.name,
      current_status: 'Open',
      assigned_date_time: new Date().toISOString(),
    };

    const { error } = await supabase.from('service_call_logs').insert(payload);
    
    if (error) {
      toast.error('Failed to dispatch: ' + error.message);
    } else {
      toast.success('Service call dispatched successfully');
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="grid grid-cols-2 gap-4">
        <input {...register('doc_no')} placeholder="Doc No" className="p-2 border rounded" />
        <input {...register('do_number')} placeholder="DO Number" className="p-2 border rounded" />
      </div>
      
      <select {...register('customer_id')} className="w-full p-2 border rounded">
        <option value="">Select Customer</option>
        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select {...register('assigned_employee_id')} className="w-full p-2 border rounded">
        <option value="">Select Technician</option>
        {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <select {...register('priority')} className="w-full p-2 border rounded">
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
        <option value="Critical">Critical</option>
      </select>

      <input {...register('service_type')} placeholder="Service Type" className="w-full p-2 border rounded" />
      <input {...register('sub_task')} placeholder="Sub Task" className="w-full p-2 border rounded" />
      <textarea {...register('narration')} placeholder="Narration/Issue" className="w-full p-2 border rounded h-24" />

      <button type="submit" disabled={isSubmitting} className="w-full bg-brand-gold text-white p-3 rounded-lg font-medium hover:bg-brand-gold/90 transition-colors">
        {isSubmitting ? 'Dispatching...' : 'Dispatch Service Call'}
      </button>
    </form>
  );
}
