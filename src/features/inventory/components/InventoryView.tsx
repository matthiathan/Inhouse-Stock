import React, { useState } from 'react';
import { StockItem } from '../../../types';
import { Search, Loader2, ArrowRight } from 'lucide-react';

export function InventoryView({ stock, loading }: { stock?: StockItem[] | null, loading: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStock = stock?.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-divider bg-bg-subtle flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search SKU, Barcode, or Name..."
            className="w-full bg-bg-base border border-divider rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-bg-subtle sticky top-0 z-10 border-b border-divider shadow-sm">
            <tr>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs">Identity</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs">SKU</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs">Barcode</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs text-right">Available Unit Qty</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs text-right">Structure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-text-tertiary"><Loader2 className="animate-spin inline mr-2" size={18}/> Synchronizing Stock Data...</td></tr>
            ) : filteredStock?.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-text-tertiary">No inventory records found.</td></tr>
            ) : (
              filteredStock?.map(item => (
                <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-text-primary">{item.item_name}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-text-secondary">{item.sku}</td>
                  <td className="px-6 py-4 font-mono text-text-secondary">{item.barcode}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-xs ${
                      item.quantity === 0 ? 'bg-status-critical/10 text-status-critical' :
                      item.quantity < 10 ? 'bg-status-warning/10 text-status-warning' :
                      'bg-status-success/10 text-status-success'
                    }`}>
                      {item.quantity} 
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-text-tertiary text-xs">
                     {item.box_quantity} Boxes / {item.pallet_quantity} Pallets<br/>
                     <span className="opacity-70">({item.units_per_box} UPB)</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
