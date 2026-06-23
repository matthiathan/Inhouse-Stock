import React, { useState } from 'react';
import { Activity, Map, ClipboardList } from 'lucide-react';
import { RoutePlannerPage } from './RoutePlannerPage';
import { SCLDispatchForm } from '../components/SCLDispatchForm';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert } from 'lucide-react';

export const DispatchRoutingHub: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'dispatch' | 'planner'>('dispatch');

  if (!['admin', 'ops_manager'].includes(role || '')) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-text-primary">Access Restricted</h2>
        <p className="text-text-secondary text-sm">This page requires Administrator or Operations Manager permissions.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 bg-bg-base min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-brand-border">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <Activity className="text-brand-gold" size={36} /> 
            Dispatch & Routing Hub
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-bg-elevated p-1 rounded-2xl border border-brand-border">
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'dispatch' 
                  ? 'bg-brand-gold text-white shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ClipboardList size={14} className="inline mr-2" /> Task Dispatch
            </button>
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'planner' 
                  ? 'bg-brand-gold text-white shadow-lg' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Map size={14} className="inline mr-2" /> Route Planner
            </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'dispatch' && <SCLDispatchForm />}
        {activeTab === 'planner' && <RoutePlannerPage />}
      </div>
    </div>
  );
};
