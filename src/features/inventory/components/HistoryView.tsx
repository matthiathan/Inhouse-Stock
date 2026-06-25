import React, { useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '../../../utils/formatters';
import { usePerformTransaction, useStockTransactions } from '../hooks';

export function HistoryView() {
  const { data: transactions, isLoading, error, refetch } = useStockTransactions();
  const performTx = usePerformTransaction();
  const [undoing, setUndoing] = useState<string | null>(null);

  const handleUndo = async (tx: any) => {
    if (undoing) return;
    setUndoing(tx.id);

    try {
      await performTx.mutateAsync({
        stockId: tx.stock_id,
        type: 'ADJUST',
        quantityChange: -tx.quantity_change,
        referenceNumber: `UNDO-${tx.id.substring(0, 5)}`,
        notes: `Undo of transaction ${tx.id}`,
      });
      toast.success('Transaction reversed.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to undo transaction.');
    } finally {
      setUndoing(null);
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-base">
      <div className="flex items-center justify-between border-b border-divider bg-bg-subtle p-4">
        <div>
          <h2 className="px-2 font-black text-text-primary">Warehouse Ledger</h2>
          <p className="px-2 text-xs text-text-secondary">Immutable transaction trail with controlled reversal entries.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[940px] whitespace-nowrap text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-divider bg-bg-subtle shadow-sm">
            <tr>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary">Time</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary">Action</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-text-secondary">Item</th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-text-secondary">Delta</th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-text-secondary">Balance</th>
              <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-text-secondary">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-text-tertiary">
                  <Loader2 className="mr-2 inline animate-spin" size={18} />
                  Fetching ledger
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-text-secondary">
                  <AlertTriangle className="mx-auto mb-3 text-status-critical" size={30} />
                  <p className="font-bold text-text-primary">Ledger unavailable</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-3 rounded-md border border-divider bg-bg-elevated px-3 py-2 text-xs font-bold text-text-primary transition hover:bg-bg-muted"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : transactions?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-text-tertiary">No transaction history.</td>
              </tr>
            ) : (
              transactions?.map((tx: any) => (
                <tr key={tx.id} className="transition-colors hover:bg-bg-subtle/50">
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary">
                    {formatDateTime(tx.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                      tx.type === 'RECEIVE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200'
                        : tx.type === 'DISPATCH'
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200'
                          : 'border border-divider bg-bg-subtle text-text-secondary'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-text-primary">{tx.stock?.item_name || 'Removed Item'}</p>
                    <p className="text-xs text-text-tertiary">{tx.reference_number || 'No reference'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-mono font-black ${
                      tx.quantity_change > 0
                        ? 'text-status-success'
                        : tx.quantity_change < 0
                          ? 'text-status-warning'
                          : 'text-text-secondary'
                    }`}>
                      {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-text-primary">{tx.new_quantity}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleUndo(tx)}
                      disabled={undoing === tx.id || tx.reference_number?.startsWith('UNDO')}
                      className="rounded-md border border-divider bg-bg-base p-1.5 text-text-secondary transition hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      title="Undo transaction"
                    >
                      {undoing === tx.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                    </button>
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
