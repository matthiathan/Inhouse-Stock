import React, { useState } from 'react';
import { useStockTransactions, usePerformTransaction } from '../hooks';
import { Loader2, ArrowRight, ArrowDownRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function HistoryView() {
  const { data: transactions, isLoading } = useStockTransactions();
  const performTx = usePerformTransaction();
  const [undoing, setUndoing] = useState<string | null>(null);

  const handleUndo = async (tx: any) => {
    if (undoing) return;
    setUndoing(tx.id);
    try {
      // Reverse the transaction. If it was a RECEIVE of 5, we DISPATCH 5.
      // Easiest is to apply the opposite quantity logic via ADJUST
      await performTx.mutateAsync({
        stockId: tx.stock_id,
        type: 'ADJUST',
        quantityChange: -tx.quantity_change,
        referenceNumber: `UNDO-${tx.id.substring(0, 5)}`,
        notes: `Undo of transaction ${tx.id}`
      });
      toast.success('Transaction successfully reversed!');
    } catch (err: any) {
      toast.error('Failed to undo transaction: ' + err.message);
    } finally {
      setUndoing(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-base">
      <div className="p-4 border-b border-divider bg-bg-subtle">
        <h2 className="font-bold text-text-primary px-2">Global Ledger</h2>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-bg-subtle sticky top-0 z-10 border-b border-divider shadow-sm">
            <tr>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs">Time</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs">Action</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs">Item</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs text-right">Delta</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs text-right">Balance</th>
              <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider text-xs text-center">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-tertiary"><Loader2 className="animate-spin inline mr-2" size={18}/> Fetching Global Ledger...</td></tr>
            ) : transactions?.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-tertiary">No transaction history.</td></tr>
            ) : (
              transactions?.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-bg-subtle/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary">
                    {new Date(tx.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      tx.type === 'RECEIVE' ? 'bg-status-success/10 text-status-success' :
                      tx.type === 'DISPATCH' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-bg-subtle text-text-secondary border border-divider'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-text-primary">{tx.stock?.item_name || 'Removed Item'}</p>
                    <p className="text-xs text-text-tertiary">{tx.reference_number || 'No Ref'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-mono font-bold ${tx.quantity_change > 0 ? 'text-status-success' : tx.quantity_change < 0 ? 'text-status-warning' : 'text-text-secondary'}`}>
                      {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-text-primary">
                    {tx.new_quantity}
                  </td>
                  <td className="px-6 py-4 text-center">
                     <button
                        onClick={() => handleUndo(tx)}
                        disabled={undoing === tx.id || tx.reference_number?.startsWith('UNDO')}
                        className="text-text-secondary hover:text-text-primary bg-bg-base border border-divider p-1.5 rounded disabled:opacity-50 transition-colors"
                        title="Undo Transaction"
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
