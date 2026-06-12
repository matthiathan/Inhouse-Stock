import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
  LayoutGrid
} from 'lucide-react';
import { motion } from 'motion/react';

export function AnalyticsPage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detectedTable, setDetectedTable] = useState<'stock' | 'inventory'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interactive audit simulation state helper
  const [selectedSimItem, setSelectedSimItem] = useState<string>('');
  const [auditedCount, setAuditedCount] = useState<number>(0);
  const [simulatedVariance, setSimulatedVariance] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch fleet machines count
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('*');
      
      if (machinesError) {
        console.warn("Machines fetch issue, defaulting to mock/empty", machinesError);
      } else {
        setMachines(machinesData || []);
      }

      // 2. Fetch stock data with auto-detection (trying 'stock' and then 'inventory')
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .select('*');

      if (!stockError && stockData) {
        setStockItems(stockData);
        setDetectedTable('stock');
      } else {
        // Fallback to 'inventory'
        const { data: invData, error: invError } = await supabase
          .from('inventory')
          .select('*');

        if (!invError && invData) {
          setStockItems(invData);
          setDetectedTable('inventory');
        } else {
          console.error("Failed to load inventory tables", stockError || invError);
          setStockItems([]);
        }
      }
    } catch (err: any) {
      console.error("Exception during analytics fetch:", err);
      toast.error("Some analytics data could not be fetched. Displaying fallback statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-bg-elevated border border-brand-border text-text-primary hover:bg-bg-base transition-all cursor-pointer min-h-[44px] shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-brand-gold" : "text-text-secondary"} />
          Refresh Metrics
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-text-secondary flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold mt-2">Aggregating database statistics...</p>
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
                <p className="text-xs text-text-secondary">Active machines registered in database</p>
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
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <Package size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">SKU Catalog Diversity</p>
                <p className="text-3xl font-extrabold text-text-primary font-mono">{uniqueSkus}</p>
                <p className="text-xs text-text-secondary">Unique catalog parts/barcodes detected</p>
              </div>
            </motion.div>

            {/* KPI 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-bg-elevated border border-brand-border p-6 rounded-2xl shadow-sm hover:border-brand-border/80 transition-all flex items-start gap-4"
              id="kpi-shrinkage-rate"
            >
              <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider font-sans">Audit Variance / Shrinkage</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-green-500 font-mono">0.00%</p>
                </div>
                <p className="text-xs text-green-500 font-medium">Perfect Stock Alignment (Baseline)</p>
              </div>
            </motion.div>
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
                      Part Movement Velocity (Stock Turnover)
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
