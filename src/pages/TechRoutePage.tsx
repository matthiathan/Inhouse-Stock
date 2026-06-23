import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { MapPin, Clock, User, Phone, Navigation, Play, Pause, CheckCircle2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTechRoute, useUpdateTaskStatus } from '../features/techRoute/hooks';
import { motion, AnimatePresence } from 'motion/react';
import { MaintenanceTicket } from '../types';

export function TechRoutePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: rawTasks = [], isLoading, error } = useTechRoute(user?.id || '');
  const { mutate: updateStatus } = useUpdateTaskStatus();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  useEffect(() => {
    if (error) {
      toast.error("Failed to load your route: " + (error as any).message);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-medium text-gray-500 uppercase tracking-widest text-xs">Optimizing Route...</p>
      </div>
    );
  }

  const tasks = rawTasks.filter(t => 
    activeTab === 'pending' 
      ? !['Completed', 'Closed', 'Resolved'].includes(t.status)
      : ['Completed', 'Closed', 'Resolved'].includes(t.status)
  );

  const handleStateTransition = (task: MaintenanceTicket, newStatus: string) => {
    updateStatus({ id: task.id, status: newStatus }, {
      onSuccess: () => toast.success(`Status updated to ${newStatus}`)
    });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 pt-6 pb-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Route</h1>
            <p className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric'})}</p>
          </div>
          <div className="bg-gray-100 rounded-xl px-3 py-1 text-center">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Remaining</span>
            <span className="block text-lg font-black text-gray-900">{rawTasks.filter(t => !['Completed', 'Closed', 'Resolved'].includes(t.status)).length}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
           <button 
             onClick={() => setActiveTab('pending')}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             Pending Tasks
           </button>
           <button 
             onClick={() => setActiveTab('completed')}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'completed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
           >
             Completed
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm mt-8"
            >
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500 text-sm">You have no tasks in this queue.</p>
            </motion.div>
          ) : (
            tasks.map((task, index) => {
              const address = `${task.unified_customers?.name || ''}, ${task.unified_customers?.address || ''}`;
              const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
              const isTraveling = task.status === 'Travelling';
              const isOnSite = task.status === 'On Site';
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  key={task.id} 
                  className={`bg-white rounded-3xl overflow-hidden shadow-sm border ${isOnSite ? 'border-brand-gold ring-1 ring-brand-gold/20' : 'border-gray-100'}`}
                >
                  <div className="p-5">
                    {/* Top Row: Meta */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {task.priority || 'Standard'} • {new Date(task.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        isOnSite ? 'bg-brand-gold/10 text-brand-gold' :
                        isTraveling ? 'bg-blue-50 text-blue-600' :
                        task.status === 'Completed' ? 'bg-green-50 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-4">
                      <h2 className="font-black text-xl text-gray-900 leading-tight mb-1">
                        {task.unified_customers?.name}
                      </h2>
                      <div className="flex items-start gap-1.5 text-gray-500 text-sm">
                        <MapPin size={16} className="shrink-0 mt-0.5" />
                        <span className="font-medium line-clamp-2">{task.unified_customers?.address}</span>
                      </div>
                    </div>

                    {/* Contact & Issue */}
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-700 font-medium whitespace-nowrap overflow-hidden">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <span className="truncate">{task.contact_person || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 font-medium whitespace-nowrap overflow-hidden">
                          <Phone size={14} className="text-gray-400 shrink-0" />
                          <a href={`tel:${task.contact_phone}`} className="text-blue-600 truncate">{task.contact_phone || 'N/A'}</a>
                        </div>
                      </div>
                      <div className="border-t border-gray-200/60 pt-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Reported Issue</span>
                        <p className="text-sm font-medium text-gray-800 line-clamp-3 leading-relaxed">
                          {task.issue_description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    {activeTab === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {/* Start Travel / GPS Check-in */}
                        {task.status === 'Open' || task.status === 'Assigned' || task.status === 'Dispatched' ? (
                          <button 
                            onClick={() => handleStateTransition(task, 'Travelling')} 
                            className="col-span-2 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm transition-transform active:scale-95"
                          >
                            <Navigation size={18} /> Start Travel
                          </button>
                        ) : isTraveling ? (
                          <>
                            <a 
                              href={mapsLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="h-14 bg-gray-100 text-gray-900 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm transition-transform active:scale-95"
                            >
                              <Navigation size={18} /> Map
                            </a>
                            <button 
                              onClick={() => handleStateTransition(task, 'On Site')} 
                              className="h-14 bg-brand-gold text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm transition-transform active:scale-95 shadow-lg shadow-brand-gold/20"
                            >
                              <MapPin size={18} /> GPS Check-in
                            </button>
                          </>
                        ) : isOnSite ? (
                          <button 
                            onClick={() => navigate(`/tech-ticket/${task.id}`)} 
                            className="col-span-2 h-14 bg-brand-gold text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm transition-transform active:scale-95 shadow-lg shadow-brand-gold/20"
                          >
                            <QrCode size={18} /> Scan Machine & Solve
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate(`/tech-ticket/${task.id}`)} 
                            className="col-span-2 h-14 bg-gray-100 text-gray-900 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-wider text-sm transition-transform active:scale-95"
                          >
                            Resume Work
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

