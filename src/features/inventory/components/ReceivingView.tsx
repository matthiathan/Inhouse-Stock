import React, { useMemo, useState } from 'react';
import { Barcode, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { usePerformTransaction, useStock } from '../hooks';

export function ReceivingView() {
  const { data: stock } = useStock();
  const performTx = usePerformTransaction();

  const [barcode, setBarcode] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [ref, setRef] = useState('');
  const [mode, setMode] = useState<'RECEIVE' | 'ADJUST'>('RECEIVE');

  const matchedItem = useMemo(() => {
    const code = barcode.trim();
    return stock?.find(item => item.barcode === code || item.sku === code) || null;
  }, [barcode, stock]);

  const handleReceive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!barcode.trim() || qty <= 0) return;

    if (!matchedItem) {
      toast.error('Item not found. Register the SKU in the inventory catalogue first.');
      return;
    }

    try {
      await performTx.mutateAsync({
        stockId: matchedItem.id,
        type: mode,
        quantityChange: qty,
        referenceNumber: ref || undefined,
      });
      toast.success(`Processed +${qty} unit(s) of ${matchedItem.item_name}`);
      setBarcode('');
      setQty(1);
      setRef('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process inbound stock.');
    }
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="w-full flex-shrink-0 border-r border-divider bg-bg-base p-6 md:max-w-md md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-black text-text-primary">
            <PackagePlus size={22} className="text-status-success" />
            Inbound Stock
          </h2>
          <select
            value={mode}
            onChange={event => setMode(event.target.value as 'RECEIVE' | 'ADJUST')}
            className="rounded-md border border-divider bg-bg-elevated px-2 py-1 text-xs font-bold uppercase text-text-secondary outline-none focus:border-brand-gold"
          >
            <option value="RECEIVE">Receive</option>
            <option value="ADJUST">Adjust (+)</option>
          </select>
        </div>

        <form onSubmit={handleReceive} className="space-y-6">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Barcode or SKU</span>
            <div className="relative">
              <Barcode size={18} className="absolute left-3 top-3 text-text-tertiary" />
              <input
                type="text"
                autoFocus
                className="h-11 w-full rounded-md border border-divider bg-bg-elevated pl-10 pr-4 font-mono text-sm text-text-primary outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 md:text-base"
                placeholder="Scan or type code"
                value={barcode}
                onChange={event => setBarcode(event.target.value)}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Quantity</span>
              <input
                type="number"
                min="1"
                className="h-11 w-full rounded-md border border-divider bg-bg-elevated px-4 text-text-primary outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                value={qty}
                onChange={event => setQty(Number(event.target.value))}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">Reference / PO</span>
              <input
                type="text"
                className="h-11 w-full rounded-md border border-divider bg-bg-elevated px-4 text-text-primary outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                placeholder="PO-9821"
                value={ref}
                onChange={event => setRef(event.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={performTx.isPending || !barcode.trim()}
            className="flex h-11 w-full items-center justify-center rounded-md bg-status-success px-4 text-sm font-black uppercase tracking-wider text-white shadow-subtle transition hover:bg-status-success/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {performTx.isPending ? 'Processing' : 'Confirm Inbound'}
          </button>
        </form>
      </div>

      <div className="flex flex-1 items-center justify-center bg-bg-subtle p-6 text-center md:p-8">
        <div className="w-full max-w-sm rounded-lg border border-divider bg-bg-base p-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-divider bg-bg-elevated text-text-tertiary">
            <PackagePlus size={30} />
          </div>
          <h3 className="text-lg font-black text-text-primary">{matchedItem ? matchedItem.item_name : 'Awaiting SKU'}</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {matchedItem
              ? `${matchedItem.quantity.toLocaleString('en-ZA')} units currently available.`
              : 'Scan or enter a registered code to stage the inbound transaction.'}
          </p>
        </div>
      </div>
    </div>
  );
}
