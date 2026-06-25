import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  LayoutDashboard,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { isConfigured } from '../../../lib/supabase';
import { useStock } from '../hooks';
import { DashboardView } from './DashboardView';
import { DispatchView } from './DispatchView';
import { HistoryView } from './HistoryView';
import { InventoryView } from './InventoryView';
import { ReceivingView } from './ReceivingView';

type WarehouseTab = 'DASHBOARD' | 'RECEIVING' | 'DISPATCH' | 'INVENTORY' | 'HISTORY';

const tabs: Array<{ id: WarehouseTab; label: string; icon: React.ElementType }> = [
  { id: 'DASHBOARD', label: 'Command', icon: LayoutDashboard },
  { id: 'INVENTORY', label: 'Inventory', icon: Search },
  { id: 'RECEIVING', label: 'Receiving', icon: ArrowDownToLine },
  { id: 'DISPATCH', label: 'Dispatch', icon: ArrowUpFromLine },
  { id: 'HISTORY', label: 'Ledger', icon: History },
];

export function WarehouseDashboard() {
  const [activeTab, setActiveTab] = useState<WarehouseTab>('DASHBOARD');
  const {
    data: stockData,
    isLoading: stockLoading,
    isFetching,
    error,
    refetch,
  } = useStock();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'd':
          setActiveTab('DASHBOARD');
          break;
        case 'r':
          setActiveTab('RECEIVING');
          break;
        case 's':
          setActiveTab('DISPATCH');
          break;
        case 'i':
          setActiveTab('INVENTORY');
          break;
        case 'h':
          setActiveTab('HISTORY');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col space-y-5 p-4 font-sans md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-text-primary md:text-3xl">
            <Package size={28} className="shrink-0 text-brand-gold" />
            Warehouse Operations
          </h1>
          <p className="mt-1 text-sm font-medium text-text-secondary">
            Stock command, inbound receiving, dispatch control, and audited warehouse ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold ${
            isConfigured
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200'
          }`}>
            {isConfigured ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isConfigured ? 'Live Supabase' : 'Demo Workspace'}
          </div>
          <div className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-border bg-bg-elevated px-3 text-xs font-bold text-text-secondary">
            <ShieldCheck size={15} className="text-brand-gold" />
            RLS Ready
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-brand-border bg-bg-elevated px-3 text-xs font-bold text-text-primary transition hover:bg-bg-muted disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="hide-scrollbar flex overflow-x-auto border-b border-divider">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
              activeTab === tab.id
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-text-tertiary hover:border-divider hover:text-text-primary'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-divider bg-bg-elevated shadow-subtle">
        {activeTab === 'DASHBOARD' && (
          <DashboardView
            stock={stockData}
            loading={stockLoading}
            error={error}
            onRetry={() => refetch()}
            isDemo={!isConfigured}
          />
        )}
        {activeTab === 'INVENTORY' && <InventoryView stock={stockData} loading={stockLoading} />}
        {activeTab === 'RECEIVING' && <ReceivingView />}
        {activeTab === 'DISPATCH' && <DispatchView />}
        {activeTab === 'HISTORY' && <HistoryView />}
      </div>
    </div>
  );
}
