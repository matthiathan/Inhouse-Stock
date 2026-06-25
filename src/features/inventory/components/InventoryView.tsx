import React, { useMemo, useState } from 'react';
import { Boxes, Loader2, Search } from 'lucide-react';
import { StockItem } from '../../../types';

const numberFormatter = new Intl.NumberFormat('en-ZA');

export function InventoryView({ stock, loading }: { stock?: StockItem[] | null; loading: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStock = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const items = stock || [];

    if (!query) return items;

    return items.filter(item => {
      const haystack = [
        item.item_name,
        item.sku,
        item.barcode,
        item.notes || '',
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [searchTerm, stock]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-divider bg-bg-subtle p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-text-tertiary" />
          <input
            type="search"
            placeholder="Search SKU, barcode, name, or notes"
            className="h-10 w-full rounded-md border border-divider bg-bg-base pl-9 pr-4 text-sm text-text-primary outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-text-tertiary">
          {numberFormatter.format(filteredStock.length)} records
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[860px] whitespace-nowrap text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-divider bg-bg-subtle shadow-sm">
            <tr>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary">Identity</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary">SKU</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary">Barcode</th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-text-secondary">Available Units</th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-text-secondary">Structure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-text-tertiary">
                  <Loader2 className="mr-2 inline animate-spin" size={18} />
                  Synchronizing stock data
                </td>
              </tr>
            ) : filteredStock.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-text-tertiary">
                  <Boxes className="mx-auto mb-3" size={30} />
                  No inventory records match the current search.
                </td>
              </tr>
            ) : (
              filteredStock.map(item => (
                <tr key={item.id} className="transition-colors hover:bg-bg-subtle/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-text-primary">{item.item_name}</p>
                    {item.notes && <p className="mt-1 max-w-[28rem] truncate text-xs text-text-tertiary">{item.notes}</p>}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary">{item.sku}</td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary">{item.barcode}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-black ${
                      item.quantity === 0
                        ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200'
                        : item.quantity < 50
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200'
                    }`}>
                      {numberFormatter.format(item.quantity)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-text-tertiary">
                    {numberFormatter.format(item.box_quantity)} boxes / {numberFormatter.format(item.pallet_quantity)} pallets
                    <br />
                    <span className="opacity-75">{numberFormatter.format(item.units_per_box)} units per box</span>
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
