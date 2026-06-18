import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { createMaintenanceTicket } from '../api/assetApi';

export function RoutePlannerPage() {
  const { role } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [machineDescription, setMachineDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [issue, setIssue] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch tickets, customers, techs
    const [ticketsRes, customersRes, techsRes] = await Promise.all([
      supabase.from('maintenance_tickets').select('*').is('tech_id', null),
      supabase.from('unified_customers').select('*'),
      supabase.from('users').select('id, email').eq('role', 'tech')
    ]);

    if (ticketsRes.data) setTickets(ticketsRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    if (techsRes.data) setTechnicians(techsRes.data);
    setLoading(false);
  };

  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech || !selectedDate || !selectedCustomer || !scheduledTime) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    const scheduledTimestamp = `${selectedDate}T${scheduledTime}:00Z`;

    const ticketData = {
      tech_id: selectedTech,
      customer_id: selectedCustomer,
      scheduled_time: scheduledTimestamp,
      description: issue,
      status: 'scheduled'
    };

    const res = await createMaintenanceTicket(ticketData);
    if (res.success) {
      toast.success("Route stop assigned!");
      fetchData();
      // Reset form
      setSelectedTech('');
      setSelectedDate('');
      setSelectedCustomer('');
      setScheduledTime('');
      setIssue('');
    } else {
      toast.error("Failed to assign stop: " + res.error);
    }
  };

  if (!['admin', 'ops_manager'].includes(role || '')) {
    return <div>Access Denied</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dispatch Board</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Unassigned Tickets</h2>
          <div className="bg-white p-4 rounded-lg shadow">
            {tickets.map(t => <div key={t.id} className="border-b p-2 font-mono text-sm">{t.description || 'No description'}</div>)}
          </div>
          <h2 className="text-xl font-semibold">Customers</h2>
          <div className="bg-white p-4 rounded-lg shadow max-h-60 overflow-y-auto">
            {customers.map(c => <div key={c.id} className="border-b p-2">{c.name} ({c.region_source})</div>)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Daily Route Builder</h2>
          <form onSubmit={handleAssignTicket} className="space-y-4">
            <select className="w-full border p-2 rounded" value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} required>
              <option value="">Select Technician</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
            </select>
            <input type="date" className="w-full border p-2 rounded" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required />
            <input type="time" className="w-full border p-2 rounded" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required />
            <select className="w-full border p-2 rounded" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} required>
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea className="w-full border p-2 rounded" placeholder="Issue Description" value={issue} onChange={(e) => setIssue(e.target.value)} required />
            <button type="submit" className="w-full bg-brand-gold text-white p-2 rounded">Assign Stop</button>
          </form>
        </div>
      </div>
    </div>
  );
}
