import React, { useState, useEffect } from 'react';
import { useStock, useStockTransactions, usePerformTransaction } from '../hooks';
import { 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  RefreshCw, 
  AlertTriangle, 
  History, 
  Search,
  ScanLine
} from 'lucide-react';
import { InventoryView } from './InventoryView';
import { ReceivingView } from './ReceivingView';
import { DispatchView } from './DispatchView';
import { HistoryView } from './HistoryView';
import { DashboardView } from './DashboardView';

export function WarehouseDashboard() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RECEIVING' | 'DISPATCH' | 'INVENTORY' | 'HISTORY'>('DASHBOARD');
  const { data: stockData, isLoading: stockLoading } = useStock();

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses if focused in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
        case 'd': setActiveTab('DASHBOARD'); break;
        case 'r': setActiveTab('RECEIVING'); break;
        case 's': setActiveTab('DISPATCH'); break; // S for Send/Dispatch
        case 'i': setActiveTab('INVENTORY'); break;
        case 'h': setActiveTab('HISTORY'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-full flex-col font-sans max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Package size={28} />
            Warehouse Operations
          </h1>
          <p className="text-text-secondary mt-1 tracking-wide text-sm flex gap-4">
            <span>Core Inventory Module</span>
            <span className="hidden md:inline-flex items-center gap-1"><kbd className="bg-bg-base border border-divider rounded px-1 text-xs">R</kbd> Receive</span>
            <span className="hidden md:inline-flex items-center gap-1"><kbd className="bg-bg-base border border-divider rounded px-1 text-xs">S</kbd> Dispatch</span>
            <span className="hidden md:inline-flex items-center gap-1"><kbd className="bg-bg-base border border-divider rounded px-1 text-xs">I</kbd> Inventory</span>
          </p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-divider hide-scrollbar">
        {[
          { id: 'DASHBOARD', label: 'Dashboard', icon: Package },
          { id: 'INVENTORY', label: 'Overview', icon: Search },
          { id: 'RECEIVING', label: 'Receive Stock', icon: ArrowDownToLine },
          { id: 'DISPATCH', label: 'Dispatch', icon: ArrowUpFromLine },
          { id: 'HISTORY', label: 'Ledger', icon: History },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-text-tertiary hover:text-text-primary hover:border-divider'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-bg-elevated border border-divider rounded-xl shadow-sm overflow-hidden flex flex-col">
        {activeTab === 'DASHBOARD' && <DashboardView stock={stockData} />}
        {activeTab === 'INVENTORY' && <InventoryView stock={stockData} loading={stockLoading} />}
        {activeTab === 'RECEIVING' && <ReceivingView />}
        {activeTab === 'DISPATCH' && <DispatchView />}
        {activeTab === 'HISTORY' && <HistoryView />}
      </div>
    </div>
  );
}
