import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { MapPin, Clock, User, Wrench, CheckCircle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TechRoutePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select('*, unified_customers(*)')
      .eq('tech_id', user?.id)
      .neq('status', 'Closed')
      .gte('scheduled_time', `${today}T00:00:00Z`)
      .lte('scheduled_time', `${today}T23:59:59Z`)
      .order('scheduled_time', { ascending: true });

    if (error) {
        toast.error("Failed to load tasks");
    } else {
        setTasks(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('maintenance_tickets').update({ status: newStatus }).eq('id', id);
    if (error) {
        toast.error("Failed to update status");
    } else {
        toast.success("Status updated");
        fetchTasks();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">My Route Today</h1>
      {tasks.length === 0 && <p className="text-gray-500">No tasks for today.</p>}
      
      {tasks.map(task => {
        const address = `${task.unified_customers?.name || ''}, ${task.unified_customers?.address || ''}`;
        const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

        return (
          <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
             <div className="flex items-center gap-2 font-semibold">
                <Clock size={18} className="text-blue-500" />
                {new Date(task.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </div>
             <div>
                <h2 className="font-bold text-lg">{task.unified_customers?.name}</h2>
                <div className="text-sm text-gray-600 font-mono">{task.unified_customers?.address}</div>
             </div>
             
             <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-gray-700">
                    <User size={16} /> {task.contact_person}
                </div>
                <div className="text-blue-600">{task.contact_phone}</div>
             </div>

             <div className="text-sm p-2 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-800">Issue:</div>
                {task.description}
             </div>

             <div className="flex gap-2 pt-2">
                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-gray-800 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-medium">
                    <MapPin size={18} /> Navigate
                </a>
                
                {task.status !== 'In Progress' && (
                    <button onClick={() => updateStatus(task.id, 'In Progress')} className="flex-1 bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-medium">
                        <Play size={18} /> Start
                    </button>
                )}
                
                <button onClick={() => navigate(`/tech-closure/${task.id}`)} className="flex-1 bg-green-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 font-medium">
                    <CheckCircle size={18} /> Complete
                </button>
             </div>
          </div>
        )
      })}
    </div>
  );
}
