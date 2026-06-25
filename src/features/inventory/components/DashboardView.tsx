import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  Boxes,
  CheckCircle2,
  Package,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  Truck,
} from 'lucide-react';
import { StockItem } from '../../../types';

interface DashboardViewProps {
  stock?: StockItem[] | null;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isDemo?: boolean;
}

const numberFormatter = new Intl.NumberFormat('en-ZA');
const formatNumber = (value: number) => numberFormatter.format(value);

const getErrorMessage = (error: unknown) => {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  return String(error);
};

export function DashboardView({ stock, loading = false, error, onRetry, isDemo = false }: DashboardViewProps) {
  const stats = useMemo(() => {
    const items = stock || [];
    const base = items.reduce((acc, item) => {
      const quantity = Number(item.quantity || 0);
      acc.totalItems += 1;
      acc.totalUnits += quantity;
      if (quantity === 0) acc.zeroStock += 1;
      if (quantity > 0 && quantity < 50) acc.lowStock += 1;
      if (quantity < 10) acc.criticalStock += 1;
      return acc;
    }, { totalItems: 0, totalUnits: 0, lowStock: 0, zeroStock: 0, criticalStock: 0 });

    const healthyItems = base.totalItems - base.lowStock - base.zeroStock;
    const healthScore = base.totalItems > 0 ? Math.round((healthyItems / base.totalItems) * 100) : 0;
    const reorderItems = items
      .filter(item => Number(item.quantity || 0) < 50)
      .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
      .slice(0, 6);
    const topAvailable = [...items]
      .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
      .slice(0, 3);

    return { ...base, healthScore, reorderItems, topAvailable };
  }, [stock]);

  if (loading) {
    return (
      <div className="grid gap-4 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-4">
        {[0, 1, 2, 3].map(item => (
          <div key={item} className="h-28 animate-pulse rounded-lg border border-divider bg-bg-base" />
        ))}
        <div className="h-80 animate-pulse rounded-lg border border-divider bg-bg-base md:col-span-2 xl:col-span-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[520px] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-400/20 dark:bg-red-500/10">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-white text-red-600 shadow-subtle dark:bg-bg-elevated dark:text-red-300">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-black text-text-primary">Warehouse data unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{getErrorMessage(error)}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-dallmayr-blue px-4 text-sm font-bold text-white transition hover:bg-dallmayr-blue-light"
            >
              <RefreshCw size={16} />
              Retry Sync
            </button>
          )}
        </div>
      </div>
    );
  }

  const hasStock = (stock?.length || 0) > 0;

  return (
    <div className="space-y-6 overflow-y-auto p-5 md:p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Package}
          label="Active SKUs"
          value={formatNumber(stats.totalItems)}
          detail={`${formatNumber(stats.totalUnits)} units under control`}
          tone="gold"
        />
        <MetricCard
          icon={Activity}
          label="Inventory Health"
          value={`${stats.healthScore}%`}
          detail={`${formatNumber(Math.max(stats.totalItems - stats.lowStock - stats.zeroStock, 0))} SKUs above reorder`}
          tone="success"
        />
        <MetricCard
          icon={TrendingDown}
          label="Reorder Watch"
          value={formatNumber(stats.lowStock)}
          detail="Below 50 units"
          tone="warning"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Stockouts"
          value={formatNumber(stats.zeroStock)}
          detail="Immediate procurement risk"
          tone="critical"
        />
      </div>

      {!hasStock ? (
        <div className="rounded-lg border border-divider bg-bg-base p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-divider bg-bg-elevated text-text-tertiary">
            <Boxes size={25} />
          </div>
          <h2 className="text-lg font-black text-text-primary">No stock records loaded</h2>
          <p className="mt-2 text-sm text-text-secondary">Connect Supabase or receive stock to populate the command view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <section className="rounded-lg border border-divider bg-bg-base">
            <div className="flex items-center justify-between border-b border-divider px-5 py-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-text-primary">Action Queue</h2>
                <p className="mt-1 text-xs text-text-secondary">Ranked by lowest available quantity.</p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                stats.criticalStock > 0
                  ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200'
              }`}>
                {stats.criticalStock > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                {stats.criticalStock > 0 ? `${stats.criticalStock} Critical` : 'Stable'}
              </span>
            </div>

            <div className="divide-y divide-divider">
              {stats.reorderItems.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center text-text-secondary">
                  <CheckCircle2 size={34} className="mb-3 text-status-success" />
                  <p className="font-bold text-text-primary">All tracked SKUs are above reorder level.</p>
                </div>
              ) : (
                stats.reorderItems.map(item => {
                  const quantity = Number(item.quantity || 0);
                  const isStockout = quantity === 0;

                  return (
                    <div key={item.id} className="grid gap-3 px-5 py-4 transition hover:bg-bg-elevated md:grid-cols-[minmax(0,1fr)_160px_140px] md:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-text-primary">{item.item_name}</p>
                        <p className="mt-1 truncate font-mono text-xs text-text-secondary">{item.sku} | {item.barcode}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ${
                          isStockout
                            ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'
                        }`}>
                          {formatNumber(quantity)} units
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-tertiary md:justify-end">
                        <ArrowDownRight size={15} className={isStockout ? 'text-status-critical' : 'text-status-warning'} />
                        {isStockout ? 'Stockout' : 'Reorder'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-divider bg-bg-base p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-text-primary">Control Status</h2>
                <ShieldCheck size={18} className="text-brand-gold" />
              </div>
              <div className="space-y-3">
                <StatusRow label="Mode" value={isDemo ? 'Demo data' : 'Live database'} />
                <StatusRow label="Audit path" value="Warehouse ledger" />
                <StatusRow label="Risk floor" value="50 units" />
                <StatusRow label="Critical floor" value="10 units" />
              </div>
            </section>

            <section className="rounded-lg border border-divider bg-bg-base p-5">
              <div className="mb-4 flex items-center gap-2">
                <Truck size={18} className="text-brand-gold" />
                <h2 className="text-sm font-black uppercase tracking-widest text-text-primary">Highest Availability</h2>
              </div>
              <div className="space-y-3">
                {stats.topAvailable.map(item => (
                  <div key={item.id} className="rounded-md border border-divider bg-bg-elevated p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text-primary">{item.item_name}</p>
                        <p className="mt-1 font-mono text-xs text-text-tertiary">{item.sku}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                        {formatNumber(Number(item.quantity || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone: 'gold' | 'success' | 'warning' | 'critical';
}

function MetricCard({ icon: Icon, label, value, detail, tone }: MetricCardProps) {
  const toneClass = {
    gold: 'bg-brand-gold/10 text-brand-gold',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200',
    critical: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200',
  }[tone];

  return (
    <div className="rounded-lg border border-divider bg-bg-base p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClass}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-text-tertiary">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-text-primary">{value}</p>
      <p className="mt-2 text-xs font-medium text-text-secondary">{detail}</p>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-divider pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs font-bold uppercase tracking-widest text-text-tertiary">{label}</span>
      <span className="text-right text-sm font-bold text-text-primary">{value}</span>
    </div>
  );
}
