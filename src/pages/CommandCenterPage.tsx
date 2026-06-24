import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { useStock } from '../features/inventory/hooks';
import { useRegionalAnalytics } from '../services/queries';

type EnterpriseMetric = {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-ZA').format(value);

const getStockQuantity = (item: any) => {
  const quantity = Number(item?.quantity ?? 0);
  const boxes = Number(item?.box_quantity ?? 0);
  const pallets = Number(item?.pallet_quantity ?? 0);
  const unitsPerBox = Number(item?.units_per_box ?? 0);

  if (quantity > 0) return quantity;
  if (boxes > 0 && unitsPerBox > 0) return boxes * unitsPerBox;
  if (pallets > 0 && unitsPerBox > 0) return pallets * 48 * unitsPerBox;
  return 0;
};

const getStatus = (item: any) => String(item?.status || item?.current_status || item?.task_status || '').trim().toLowerCase();
const isOpenWork = (item: any) => !['closed', 'resolved', 'complete', 'completed', 'cancelled'].includes(getStatus(item));

const MetricCard: React.FC<{ metric: EnterpriseMetric }> = ({ metric }) => {
  const Icon = metric.icon;
  return (
    <div className="enterprise-panel rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${metric.tone}`}>
          <Icon size={22} />
        </div>
        <span className="rounded-full border border-brand-border bg-bg-canvas px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
          Live
        </span>
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-text-tertiary">{metric.label}</p>
      <p className="mt-2 text-3xl font-black text-text-primary">{metric.value}</p>
      <p className="mt-2 text-sm text-text-secondary">{metric.helper}</p>
    </div>
  );
};

export function CommandCenterPage() {
  const {
    data: stock = [],
    isLoading: stockLoading,
    error: stockError,
    refetch: refetchStock,
  } = useStock();

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useRegionalAnalytics('ALL');

  const loading = stockLoading || analyticsLoading;
  const hasError = stockError || analyticsError;

  const commandData = useMemo(() => {
    const stockItems = stock || [];
    const serviceLogs = analytics?.serviceLogs || [];
    const machines = analytics?.machines || [];
    const customers = analytics?.customers || [];

    const totalUnits = stockItems.reduce((sum, item) => sum + getStockQuantity(item), 0);
    const lowStockItems = stockItems.filter(item => {
      const units = getStockQuantity(item);
      return units > 0 && units < 10;
    });
    const outOfStockItems = stockItems.filter(item => getStockQuantity(item) === 0);
    const openService = serviceLogs.filter(isOpenWork);
    const criticalService = openService.filter(item => String(item?.priority || '').toLowerCase() === 'critical');

    const regionCounts = ['JHB', 'KZN', 'CPT'].map(region => ({
      region,
      customers: customers.filter((customer: any) => String(customer?.region || '').toUpperCase() === region).length,
      assets: machines.filter((machine: any) => {
        const code = String(machine?.fa_doc_no || machine?.contract_no || machine?.contractNo || machine?.serial_number || '').toUpperCase();
        if (region === 'JHB') return code.startsWith('CA21') || code.startsWith('JHB');
        if (region === 'CPT') return code.startsWith('CA31') || code.startsWith('CPT');
        return code.startsWith('CA41') || code.startsWith('KZN');
      }).length,
    }));

    const metrics: EnterpriseMetric[] = [
      {
        label: 'Stock units under control',
        value: formatNumber(totalUnits),
        helper: `${formatNumber(stockItems.length)} active SKUs in Supabase inventory`,
        icon: Package,
        tone: 'bg-dallmayr-blue/10 text-dallmayr-blue dark:bg-dallmayr-gold/10 dark:text-dallmayr-gold',
      },
      {
        label: 'Critical inventory exposure',
        value: formatNumber(lowStockItems.length + outOfStockItems.length),
        helper: `${outOfStockItems.length} out of stock and ${lowStockItems.length} below reorder threshold`,
        icon: AlertTriangle,
        tone: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200',
      },
      {
        label: 'Assets in service network',
        value: formatNumber(machines.length),
        helper: `${formatNumber(customers.length)} customer locations linked to the estate`,
        icon: Database,
        tone: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200',
      },
      {
        label: 'Open service workload',
        value: formatNumber(openService.length),
        helper: `${criticalService.length} critical tickets require management attention`,
        icon: Wrench,
        tone: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200',
      },
    ];

    const actionItems = [
      ...outOfStockItems.slice(0, 4).map((item: any) => ({
        title: item.item_name || item.item || item.sku || 'Inventory item',
        detail: 'Out of stock — create replenishment action',
        tone: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-200',
      })),
      ...criticalService.slice(0, 4).map((ticket: any) => ({
        title: ticket.doc_no || ticket.do_number || ticket.ticket_number || 'Critical service ticket',
        detail: ticket.narration || ticket.issue_description || 'Critical service workload needs dispatch review',
        tone: 'text-amber-700 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-200',
      })),
    ].slice(0, 6);

    return { metrics, regionCounts, actionItems, openService, lowStockItems, outOfStockItems };
  }, [analytics, stock]);

  const handleRefresh = async () => {
    await Promise.all([refetchStock(), refetchAnalytics()]);
  };

  return (
    <div className="space-y-6">
      <section className="enterprise-panel overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-border bg-bg-canvas px-3 py-1 text-[11px] font-black uppercase tracking-widest text-text-secondary">
              <ShieldCheck size={14} className="text-brand-gold" />
              Enterprise command centre
            </div>
            <h2 className="text-3xl font-black tracking-tight text-text-primary md:text-4xl">
              Dallmayr Coffee South Africa operational cockpit
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary md:text-base">
              Monitor stock risk, machine estate coverage, customer footprint, and service workload from one Supabase-backed executive view.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-dallmayr-blue px-4 py-3 text-sm font-black text-white shadow-subtle transition hover:bg-dallmayr-blue-light disabled:opacity-60"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh live data
          </button>
        </div>

        {hasError && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            Some live metrics could not be synchronized. Cached or partial data may be displayed.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {commandData.metrics.map(metric => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="enterprise-panel rounded-xl p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-text-primary">Regional operating footprint</h3>
              <p className="text-sm text-text-secondary">Customer and asset distribution for branch planning.</p>
            </div>
            <MapPin className="text-brand-gold" size={22} />
          </div>

          <div className="space-y-4">
            {commandData.regionCounts.map(region => {
              const total = Math.max(region.customers + region.assets, 1);
              const assetShare = Math.round((region.assets / total) * 100);
              return (
                <div key={region.region} className="rounded-lg border border-brand-border bg-bg-canvas p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-black text-text-primary">{region.region}</p>
                      <p className="text-xs text-text-secondary">{region.customers} customers • {region.assets} assets</p>
                    </div>
                    <span className="rounded-full bg-dallmayr-blue/10 px-2.5 py-1 text-xs font-black text-dallmayr-blue dark:bg-dallmayr-gold/10 dark:text-dallmayr-gold">
                      {assetShare}% asset mix
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
                    <div className="h-full rounded-full bg-dallmayr-blue dark:bg-dallmayr-gold" style={{ width: `${assetShare}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="enterprise-panel rounded-xl p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-text-primary">Management action queue</h3>
              <p className="text-sm text-text-secondary">Auto-prioritized from stock and service data.</p>
            </div>
            <ClipboardList className="text-brand-gold" size={22} />
          </div>

          {commandData.actionItems.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
              <CheckCircle2 className="mb-3" size={22} />
              No critical stock or service actions detected from the current data set.
            </div>
          ) : (
            <div className="space-y-3">
              {commandData.actionItems.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-lg border border-brand-border bg-bg-canvas p-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-black ${item.tone}`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-black text-text-primary">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="enterprise-panel rounded-xl p-5">
          <Activity className="mb-3 text-emerald-500" size={22} />
          <p className="text-sm font-black uppercase tracking-widest text-text-tertiary">Operating health</p>
          <p className="mt-2 text-2xl font-black text-text-primary">{hasError ? 'Partial' : 'Online'}</p>
          <p className="mt-1 text-sm text-text-secondary">Supabase queries are powering this command view.</p>
        </div>
        <div className="enterprise-panel rounded-xl p-5">
          <TrendingUp className="mb-3 text-brand-gold" size={22} />
          <p className="text-sm font-black uppercase tracking-widest text-text-tertiary">Stock risk index</p>
          <p className="mt-2 text-2xl font-black text-text-primary">{commandData.outOfStockItems.length + commandData.lowStockItems.length}</p>
          <p className="mt-1 text-sm text-text-secondary">Items requiring replenishment governance.</p>
        </div>
        <div className="enterprise-panel rounded-xl p-5">
          <Users className="mb-3 text-cyan-500" size={22} />
          <p className="text-sm font-black uppercase tracking-widest text-text-tertiary">Service governance</p>
          <p className="mt-2 text-2xl font-black text-text-primary">{commandData.openService.length}</p>
          <p className="mt-1 text-sm text-text-secondary">Open service records in the national workload.</p>
        </div>
      </section>
    </div>
  );
}
