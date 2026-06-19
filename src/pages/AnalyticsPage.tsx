import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  BarChart3, 
  Database, 
  Package, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  RefreshCw,
  TrendingDown,
  TrendingUp,
  LayoutGrid,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRegionalAnalytics } from '../services/queries';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export function AnalyticsPage() {
  const [selectedRegion, setSelectedRegion] = useState<'JHB' | 'KZN' | 'CPT' | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interactive audit simulation state helper
  const [selectedSimItem, setSelectedSimItem] = useState<string>('');
  const [auditedCount, setAuditedCount] = useState<number>(0);
  const [simulatedVariance, setSimulatedVariance] = useState<number | null>(null);

  // Load regionalized datasets from single cache-optimized react-query provider
  const { data: analyticsData, isLoading, error, refetch } = useRegionalAnalytics(selectedRegion);

  const machines = analyticsData?.machines || [];
  const stockItems = analyticsData?.stockItems || [];
  const serviceLogs = analyticsData?.serviceLogs || [];
  const customers = analyticsData?.customers || [];

  useEffect(() => {
    console.log("Analytics Data Samples:", serviceLogs.slice(0, 3));
  }, [serviceLogs]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Branch metrics successfully synchronized!");
    } catch (err) {
      toast.error("Synchronize failed. Please check backend connection.");
    }
  };

  // Sync simulation count when selected item changed
  useEffect(() => {
    if (selectedSimItem) {
      const item = stockItems.find(i => getBarcode(i) === selectedSimItem);
      if (item) {
        setAuditedCount(getCalculatedTotalUnits(item));
        setSimulatedVariance(0);
      }
    } else {
      setSimulatedVariance(null);
    }
  }, [selectedSimItem, stockItems]);

  const getItemName = (item: any) => {
    return item['item_name'] || item['item'] || item['Item Name'] || item['Item'] || item['name'] || 'Unnamed Item';
  };

  const getBarcode = (item: any) => {
    return item['barcode'] || item['Barcode'] || item['sku'] || item['SKU'] || item['id'] || '';
  };

  const getCalculatedTotalUnits = (item: any) => {
    if (item.pallet_quantity !== undefined || item.box_quantity !== undefined || item.units_per_box !== undefined) {
      const pQty = Number(item.pallet_quantity || 0);
      const bQty = Number(item.box_quantity || 0);
      const uBox = Number(item.units_per_box || 0);
      return (pQty * 48 * uBox) + (bQty * uBox);
    }
    const legacyQty = item['Quantity'] || item['quantity'] || item['Quantity Received'] || item['quantity_received'];
    return legacyQty !== undefined ? Number(legacyQty) : 0;
  };

  // Run audit simulation
  const handleSimulateAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find(i => getBarcode(i) === selectedSimItem);
    if (!item) {
      toast.error("Please select a valid stock item to audit.");
      return;
    }
    const currentUnits = getCalculatedTotalUnits(item);
    if (currentUnits === 0) {
      setSimulatedVariance(auditedCount === 0 ? 0 : -100);
      return;
    }
    const variance = ((auditedCount - currentUnits) / currentUnits) * 100;
    setSimulatedVariance(variance);
    toast.success("Simulation computed successfully!");
  };

  // Unique SKU Count
  const uniqueSkus = Array.from(new Set(stockItems.map(i => getBarcode(i)))).filter(Boolean).length;

  // Filtered Parts
  const filteredStock = stockItems.filter(item => {
    const name = getItemName(item).toLowerCase();
    const barcode = getBarcode(item).toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || barcode.includes(search);
  });

  // Process service logs to build a timeline chart for closed service calls
  const getClosedCallsTimelineData = () => {
    const closedLogs = serviceLogs.filter(l => {
      // Use .trim().toLowerCase() to avoid case-sensitivity issues
      const status = (l.status || l.task_status || l.current_status || '').trim().toLowerCase();
      
      // Check if it matches 'closed'
      const isClosed = status === 'closed';
      
      // Ensure the date exists (using the new mapped closed_date from our hook fix)
      const hasDate = !!(l.closed_date || l.date_closed);
      
      return isClosed && hasDate;
    });

    const grouped: { [key: string]: { date: string; count: number; JHB: number; KZN: number; CPT: number } } = {};

    closedLogs.forEach(l => {
      const rawDateStr = l.date_closed || l.closed_date || '';
      if (!rawDateStr) return;

      let dateKey = rawDateStr.split('T')[0] || rawDateStr;
      
      try {
        const d = new Date(dateKey);
        if (!isNaN(d.getTime())) {
          dateKey = d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
        }
      } catch {
        dateKey = dateKey.substring(5, 10);
      }

      let reg: 'JHB' | 'KZN' | 'CPT' | 'Unknown' = 'Unknown';
      if (l.region) {
        const rValue = String(l.region).toUpperCase();
        if (rValue === 'JHB' || rValue === 'KZN' || rValue === 'CPT') {
          reg = rValue as any;
        }
      }
      if (reg === 'Unknown' && l.customer_id) {
        const cust = customers.find(c => c.id === l.customer_id);
        if (cust && cust.region) {
          const r = cust.region.toUpperCase();
          if (r === 'JHB' || r === 'KZN' || r === 'CPT') reg = r as any;
        }
      }
      if (reg === 'Unknown') {
        const doc = String(l.doc_no || l.do_number || '');
        if (doc.startsWith('CA21')) reg = 'JHB';
        else if (doc.startsWith('CA31')) reg = 'CPT';
        else if (doc.startsWith('CA41')) reg = 'KZN';
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, count: 0, JHB: 0, KZN: 0, CPT: 0 };
      }

      grouped[dateKey].count += 1;
      if (reg !== 'Unknown') {
        grouped[dateKey][reg] += 1;
      }
    });

    const sorted = Object.values(grouped).sort((a, b) => {
      // Convert 'Oct 12' or similar format to a parseable date for 2026
      const parseDate = (dateStr: string) => {
        // If your date is already formatted (e.g., '12 Oct'), add the year
        const d = new Date(`${dateStr} 2026`);
        return d.getTime();
      };
      return parseDate(a.date) - parseDate(b.date);
    });

    if (sorted.length === 0) {
      const today = new Date();
      const mockList = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateKey = d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
        mockList.push({
          date: dateKey,
          count: 0,
          JHB: 0,
          KZN: 0,
          CPT: 0
        });
      }
      return mockList;
    }

    return sorted;
  };

  const timelineData = getClosedCallsTimelineData();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-text-primary">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <BarChart3 className="text-brand-gold" size={28} />
            Inventory Analytics & Shrinkage Control
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Dallmayr SA Fleet and Parts Intelligence Dashboard
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-bg-elevated border border-brand-border text-text-primary hover:bg-bg-base transition-all cursor-pointer min-h-[44px] shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin text-brand-gold" : "text-text-secondary"} />
          Sync Metrics
        </button>
      </div>

      {/* Regional Selector Strip */}
      <div className="bg-bg-elevated border border-brand-border p-1.5 rounded-xl flex flex-wrap gap-2 w-fit shadow-xs">
        {(['ALL', 'JHB', 'KZN', 'CPT'] as const).map((reg) => (
          <button
            key={reg}
            onClick={() => {
              setSelectedRegion(reg);
              setSelectedSimItem('');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all min-h-[38px] cursor-pointer ${
              selectedRegion === reg
                ? 'bg-brand-gold text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-base'
            }`}
            id={`region-btn-${reg.toLowerCase()}`}
          >
            {reg === 'ALL' ? '🗺️ All Regions' : reg === 'JHB' ? '🏙️ Johannesburg' : reg === 'KZN' ? '🌴 Durban (KZN)' : '🏔️ Cape Town'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-text-secondary flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold mt-2">Aggregating database statistics across branches...</p>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* KPI 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm hover:border-brand-border/80 transition-all flex items-start gap-4"
              id="kpi-monitored-fleet"
            >
              <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl">
                <Database size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Monitored Fleet Assets</p>
                <p className="text-3xl font-extrabold text-text-primary font-mono">{machines.length}</p>
                <p className="text-xs text-text-secondary">
                  {selectedRegion === 'ALL' ? 'Active fleet machines' : `Fleet registered in ${selectedRegion}`}
                </p>
              </div>
            </motion.div>

            {/* KPI 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm hover:border-brand-border/80 transition-all flex items-start gap-4"
              id="kpi-sku-diversity"
            >
              <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl">
                <Package size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">SKU Catalog Diversity</p>
                <p className="text-3xl font-extrabold text-text-primary font-mono">{uniqueSkus}</p>
                <p className="text-xs text-text-secondary">
                  {selectedRegion === 'ALL' ? 'Unique catalog barcodes' : `Stocked parts types in ${selectedRegion}`}
                </p>
              </div>
            </motion.div>

            {/* KPI 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm hover:border-brand-border/80 transition-all flex items-start gap-4"
              id="kpi-service-pipeline"
            >
              <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl">
                <ClipboardList size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Active Service Log Actions</p>
                <p className="text-3xl font-extrabold text-brand-gold font-mono">{serviceLogs.length}</p>
                <p className="text-xs text-text-secondary">
                  {selectedRegion === 'ALL' ? 'SCL tickets across SA' : `Pending logs tracking in ${selectedRegion}`}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Graphical Intelligence Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Stock Availability */}
            <div className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm space-y-4" id="chart-parts-volume">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-brand-gold" />
                  Available Volume by SKU ({selectedRegion === 'ALL' ? 'National' : selectedRegion})
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Calculated units holding per active parts item
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stockItems.slice(0, 8).map(item => ({
                      name: getItemName(item).substring(0, 15) + (getItemName(item).length > 15 ? '...' : ''),
                      'Units': getCalculatedTotalUnits(item)
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-brand-border)', borderRadius: '12px' }}
                      labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}
                    />
                    {/* Primary Dallmayr Brand Color: brand-gold (#C5A059) */}
                    <Bar dataKey="Units" fill="#C5A059" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Regional Spread or Pipeline Density */}
            <div className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm space-y-4" id="chart-scl-spread">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList size={16} className="text-brand-gold" />
                  {selectedRegion === 'ALL' ? 'Operations Task Spread' : `${selectedRegion} Incidents Workflow Density`}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedRegion === 'ALL' ? 'Direct dispatches comparison' : 'SCL ticket status ratios'}
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedRegion === 'ALL' ? (
                    <BarChart
                      data={[
                        { name: 'Johannesburg', 'Tasks count': serviceLogs.filter(l => {
                          const cust = customers.find(c => c.id === l.customer_id);
                          return cust?.region?.toUpperCase() === 'JHB' || (l.doc_no || l.do_number || '').startsWith('CA21');
                        }).length },
                        { name: 'Durban (KZN)', 'Tasks count': serviceLogs.filter(l => {
                          const cust = customers.find(c => c.id === l.customer_id);
                          return cust?.region?.toUpperCase() === 'KZN' || (l.doc_no || l.do_number || '').startsWith('CA41');
                        }).length },
                        { name: 'Cape Town', 'Tasks count': serviceLogs.filter(l => {
                          const cust = customers.find(c => c.id === l.customer_id);
                          return cust?.region?.toUpperCase() === 'CPT' || (l.doc_no || l.do_number || '').startsWith('CA31');
                        }).length }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-brand-border)', borderRadius: '12px' }}
                        labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}
                      />
                      {/* Uses standard Dallmayr branding colors */}
                      <Bar dataKey="Tasks count" fill="#C5A059" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart
                      data={[
                        { name: 'Open Calls', 'Active Logs': serviceLogs.filter(l => l.status === 'Open').length },
                        { name: 'In Progress', 'Active Logs': serviceLogs.filter(l => l.status === 'In Progress' || l.status === 'In-Progress').length },
                        { name: 'Closed Calls', 'Active Logs': serviceLogs.filter(l => l.status === 'Closed').length }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C5A059" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#C5A059" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-brand-border)', borderRadius: '12px' }}
                        labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="Active Logs" stroke="#C5A059" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Chart 3: Closed Service Calls Analysis (Trend) */}
          <div className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm space-y-4" id="chart-closedScl-timeline">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-gold" />
                  Closed Service Calls Clearance Velocity Trend ({selectedRegion === 'ALL' ? 'National' : selectedRegion})
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Plots dispatches successfully closed over time using database-cleansed ledger entries
                </p>
              </div>
              <div className="text-xs font-mono bg-bg-base/60 text-brand-gold px-2.5 py-1 rounded-md border border-brand-gold/20">
                Trigger-Sanitized: date_created & date_closed
              </div>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorClosedCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C5A059" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#C5A059" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorJHB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorKZN" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorCPT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-brand-border)', borderRadius: '12px' }}
                    labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}
                  />
                  {selectedRegion === 'ALL' ? (
                    <>
                      <Area type="monotone" name="Johannesburg (JHB)" dataKey="JHB" stroke="#3b82f6" strokeWidth={2} fill="url(#colorJHB)" />
                      <Area type="monotone" name="Durban (KZN)" dataKey="KZN" stroke="#10b981" strokeWidth={2} fill="url(#colorKZN)" />
                      <Area type="monotone" name="Cape Town (CPT)" dataKey="CPT" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorCPT)" />
                    </>
                  ) : (
                    <Area 
                      type="monotone" 
                      name={`${selectedRegion} Closed Tasks`} 
                      dataKey={selectedRegion} 
                      stroke="#C5A059" 
                      strokeWidth={3} 
                      fill="url(#colorClosedCount)" 
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Middle Column - Turnover & Velocity */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-bg-elevated border border-brand-border rounded-2xl shadow-sm overflow-hidden" id="part-movement-pane">
                {/* Panel Header */}
                <div className="p-6 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-elevated/50">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                      <LayoutGrid size={20} className="text-brand-gold" />
                      Part Movement Velocity ({selectedRegion === 'ALL' ? 'National' : selectedRegion})
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Units evaluated via: Pallets (×48 × Units/Box) + Boxes (× Units/Box)
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                    <input
                      type="text"
                      placeholder="Search part name or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-lg bg-bg-base text-text-primary text-xs outline-none focus:border-brand-gold placeholder-text-secondary/60 transition-all"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {filteredStock.length === 0 ? (
                    <div className="p-12 text-center text-text-secondary">
                      <Package size={36} className="mx-auto text-text-secondary/40 mb-3" />
                      <p className="text-sm font-semibold">No stock items found</p>
                      <p className="text-xs text-text-secondary mt-1">Try relaxing your search filter or syncing with database.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-base/40 text-text-secondary text-xs uppercase font-bold tracking-wider border-b border-brand-border">
                          <th className="py-4 px-5">Part details</th>
                          <th className="py-4 px-4 font-mono">Barcode / SKU</th>
                          <th className="py-4 px-4 text-right">Holding qty</th>
                          <th className="py-4 px-4 text-right">Total Units</th>
                          <th className="py-4 px-5 text-center">Velocity State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/60">
                        {filteredStock.map((item, index) => {
                          const totalUnits = getCalculatedTotalUnits(item);
                          const isHighVelocity = totalUnits < 50;
                          
                          // Helper values
                          const pallets = item.pallet_quantity !== undefined ? Number(item.pallet_quantity) : 0;
                          const boxes = item.box_quantity !== undefined ? Number(item.box_quantity) : 0;
                          const upb = item.units_per_box !== undefined ? Number(item.units_per_box) : 12;

                          return (
                            <tr key={item.id || index} className="hover:bg-bg-base/30 transition-colors">
                              <td className="py-4 px-5">
                                <div className="font-semibold text-text-primary text-sm">{getItemName(item)}</div>
                                {item.notes && (
                                  <div className="text-[11px] text-text-secondary truncate max-w-xs mt-0.5">{item.notes}</div>
                                )}
                              </td>
                              <td className="py-4 px-4 font-mono text-xs text-text-primary">
                                {getBarcode(item)}
                              </td>
                              <td className="py-4 px-4 text-right text-xs text-text-secondary">
                                <div className="font-medium text-text-primary">
                                  {pallets} PL, {boxes} BX
                                </div>
                                <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                                  Config: {upb}/Box
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right font-mono text-sm font-bold text-text-primary">
                                {totalUnits.toLocaleString()}
                              </td>
                              <td className="py-4 px-5 text-center">
                                {isHighVelocity ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none bg-orange-500/10 text-orange-500 border border-orange-500/20 uppercase tracking-wide">
                                    <TrendingUp size={12} />
                                    High Velocity
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">
                                    <TrendingDown size={12} />
                                    Stable/Moving
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Audit & Simulation Panel */}
            <div className="space-y-6">
              <div className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm space-y-4" id="shrinkage-simulator-pane">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h2 className="text-lg font-bold text-text-primary">Audit variance simulator</h2>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Select an active catalog SKU and enter actual on-site count to evaluate estimated stock shrinkage variance instantly.
                </p>

                {stockItems.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No catalog items available for simulation.</p>
                ) : (
                  <form onSubmit={handleSimulateAudit} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-text-secondary tracking-wider mb-1.5">
                        Choose Item catalog
                      </label>
                      <select
                        value={selectedSimItem}
                        onChange={(e) => setSelectedSimItem(e.target.value)}
                        required
                        className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary text-xs outline-none focus:border-brand-gold transition-all cursor-pointer font-sans"
                      >
                        <option value="">-- Select Active Part --</option>
                        {stockItems.map((item, idx) => (
                          <option key={getBarcode(item) || idx} value={getBarcode(item)}>
                            {getItemName(item)} ({getBarcode(item)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSimItem && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="p-3 bg-bg-base/60 rounded-xl border border-brand-border text-xs space-y-1">
                          <p className="text-text-secondary font-semibold">Registered Database Ledger:</p>
                          <p className="text-sm font-bold text-text-primary font-mono">
                            {getCalculatedTotalUnits(stockItems.find(i => getBarcode(i) === selectedSimItem)).toLocaleString()} Units
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-text-secondary tracking-wider mb-1.5">
                            Actual On-Site Physical Count
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={auditedCount}
                            onChange={(e) => setAuditedCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full p-2.5 border border-brand-border rounded-lg bg-bg-base text-text-primary text-xs font-mono outline-none focus:border-brand-gold"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-brand-gold text-white font-semibold py-2.5 rounded-lg text-xs hover:bg-brand-gold/90 transition-all cursor-pointer min-h-[40px] shadow-sm flex items-center justify-center gap-1.5"
                        >
                          Calculate Audit Variance
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {simulatedVariance !== null && (
                  <div className="mt-4 p-4 rounded-xl border border-brand-border/60 bg-bg-base/30 space-y-3 animate-fade-in">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Simulation Report</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Expected vs Audited Variance:</span>
                      <span className={`text-sm font-mono font-bold ${
                        simulatedVariance === 0 
                          ? 'text-green-500' 
                          : simulatedVariance < 0 
                            ? 'text-red-500' 
                            : 'text-blue-500'
                      }`}>
                        {simulatedVariance > 0 ? '+' : ''}{simulatedVariance.toFixed(2)}%
                      </span>
                    </div>

                    {simulatedVariance < 0 ? (
                      <div className="flex items-start gap-2 text-[11px] text-red-500/90 leading-normal bg-red-500/5 p-2 rounded border border-red-500/10">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>Shrinkage Detected! Audited stack has fewer parts than database ledger.</span>
                      </div>
                    ) : simulatedVariance > 0 ? (
                      <div className="flex items-start gap-2 text-[11px] text-blue-500/90 leading-normal bg-blue-500/5 p-2 rounded border border-blue-500/10">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>Surplus Logged! Physical storage exceeds recorded values. Suggests unlogged receipts.</span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-[11px] text-green-500/90 leading-normal bg-green-500/5 p-2 rounded border border-green-500/10">
                        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                        <span>No variance. Ledger and physical count are in perfect sync.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
