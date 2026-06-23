import React, { useMemo } from 'react';
import { StockItem } from '../../../types';
import { AlertTriangle, Package, Activity, TrendingDown } from 'lucide-react';

export function DashboardView({ stock }: { stock?: StockItem[] | null }) {
  const stats = useMemo(() => {
    if (!stock) return { totalItems: 0, totalUnits: 0, lowStock: 0, zeroStock: 0 };
    
    return stock.reduce((acc, item) => {
      acc.totalItems++;
      acc.totalUnits += item.quantity || 0;
      if (item.quantity === 0) acc.zeroStock++;
      else if (item.quantity < 10) acc.lowStock++; // threshold based on quantity
      return acc;
    }, { totalItems: 0, totalUnits: 0, lowStock: 0, zeroStock: 0 });
  }, [stock]);

  return (
    <div className="p-6 md:p-8 overflow-y-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Cards */}
        <div className="bg-bg-base border border-divider p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-lg"><Package size={24} /></div>
          <div>
            <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider">Total SKUs</p>
            <p className="text-2xl font-bold text-text-primary">{stats.totalItems}</p>
          </div>
        </div>
        <div className="bg-bg-base border border-divider p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-text-primary/10 text-text-primary rounded-lg"><Activity size={24} /></div>
          <div>
            <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wider">Total Units</p>
            <p className="text-2xl font-bold text-text-primary">{stats.totalUnits}</p>
          </div>
        </div>
        <div className="bg-bg-base border border-status-warning/30 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-status-warning" />
          <div className="p-3 bg-status-warning/10 text-status-warning rounded-lg"><TrendingDown size={24} /></div>
          <div>
            <p className="text-status-warning/80 text-xs font-semibold uppercase tracking-wider">Low Stock ( {'<'} 10 )</p>
            <p className="text-2xl font-bold text-text-primary">{stats.lowStock}</p>
          </div>
        </div>
        <div className="bg-bg-base border border-status-critical/30 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-status-critical" />
          <div className="p-3 bg-status-critical/10 text-status-critical rounded-lg"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-status-critical/80 text-xs font-semibold uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-text-primary">{stats.zeroStock}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-status-warning" /> Critical Action Items
        </h3>
        <div className="bg-bg-base border border-divider rounded-xl overflow-hidden">
          {stats.zeroStock === 0 && stats.lowStock === 0 ? (
            <div className="p-8 text-center text-text-tertiary">
               No critical low-stock items detected.
            </div>
          ) : (
            <div className="divide-y divide-divider">
              {stock?.filter(i => i.quantity < 10).map(item => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-bg-subtle/50 transition-colors">
                  <div>
                    <p className="font-semibold text-text-primary">{item.item_name}</p>
                    <p className="text-xs text-text-secondary font-mono mt-0.5">{item.sku} • {item.barcode}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${item.quantity === 0 ? 'bg-status-critical/10 text-status-critical' : 'bg-status-warning/10 text-status-warning'}`}>
                      {item.quantity} UNITS LEFT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
