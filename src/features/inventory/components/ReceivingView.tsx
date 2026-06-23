import React, { useState } from 'react';
import { useStock, usePerformTransaction } from '../hooks';
import { toast } from 'sonner';
import { PackagePlus, Barcode } from 'lucide-react';

export function ReceivingView() {
  const { data: stock } = useStock();
  const performTx = usePerformTransaction();
  
  const [barcode, setBarcode] = useState('');
  const [qty, setQty] = useState<number>(1);
  const [ref, setRef] = useState('');
  const [mode, setMode] = useState<'RECEIVE' | 'ADJUST'>('RECEIVE');

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || qty <= 0) return;

    const item = stock?.find(s => s.barcode === barcode.trim() || s.sku === barcode.trim());
    if (!item) {
      toast.error('Item not found. Please register new stock via the main catalogue first.');
      return;
    }

    try {
      await performTx.mutateAsync({
        stockId: item.id,
        type: mode,
        quantityChange: qty, // Positive for receive
        referenceNumber: ref
      });
      toast.success(`Processed +${qty} unit(s) of ${item.item_name}`);
      setBarcode('');
      setQty(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Scanner & Form */}
      <div className="p-6 md:p-8 w-full md:max-w-md border-r border-divider bg-bg-base flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <PackagePlus size={22} className="text-status-success" />
            Inbound Stock
            </h2>
            <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="bg-bg-elevated border border-divider text-xs font-bold rounded-lg px-2 py-1 outline-none text-text-secondary uppercase"
            >
                <option value="RECEIVE">Receive</option>
                <option value="ADJUST">Adjust (+)</option>
            </select>
        </div>

        <form onSubmit={handleReceive} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Barcode or SKU</label>
            <div className="relative">
              <Barcode size={18} className="absolute left-3 top-3 text-text-tertiary" />
              <input
                type="text"
                autoFocus
                className="w-full bg-bg-elevated border border-divider rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none md:text-lg font-mono"
                placeholder="Scan or type..."
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
              />
            </div>
            <p className="text-xs text-text-tertiary">Keyboard wedge scanners supported.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Quantity</label>
              <input
                type="number"
                min="1"
                className="w-full bg-bg-elevated border border-divider rounded-lg px-4 py-2.5 text-text-primary focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Reference / PO</label>
              <input
                type="text"
                className="w-full bg-bg-elevated border border-divider rounded-lg px-4 py-2.5 text-text-primary focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none"
                placeholder="e.g. PO-9821"
                value={ref}
                onChange={e => setRef(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={performTx.isPending || !barcode.trim()}
            className="w-full bg-status-success hover:bg-status-success/90 text-white font-bold py-3 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {performTx.isPending ? 'Processing...' : 'CONFIRM INBOUND'}
          </button>
        </form>
      </div>

      {/* Guide or Summary */}
      <div className="flex-1 p-6 md:p-8 bg-bg-subtle flex flex-col items-center justify-center text-center">
         <div className="max-w-sm text-text-secondary space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-bg-base border border-divider flex items-center justify-center shadow-sm">
                <PackagePlus size={32} className="text-text-tertiary" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Inbound Flow</h3>
            <p className="text-sm">Goods receipts should be verified against external Purchase Orders before logging into the core inventory module.</p>
         </div>
      </div>
    </div>
  );
}
