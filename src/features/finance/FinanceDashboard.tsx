import React, { useMemo } from 'react';
import { useFinanceServiceData } from './hooks';

export const FinanceDashboard: React.FC = () => {
  const { data: serviceRecords, isLoading, error } = useFinanceServiceData();

  const metrics = useMemo(() => {
    if (!serviceRecords) return { open: 0, closed: 0, total: 0 };
    return serviceRecords.reduce(
      (acc, record) => {
        if (record.status === 'Closed' || record.current_status === 'Closed') {
          acc.closed++;
        } else if (record.status === 'Open' || record.current_status === 'Open' || record.status === 'In Progress' || record.current_status === 'In Progress') {
          acc.open++;
        }
        acc.total++;
        return acc;
      },
      { open: 0, closed: 0, total: 0 }
    );
  }, [serviceRecords]);

  if (isLoading) {
    return <div className="p-8 text-text-secondary animate-pulse">Loading finance data...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-status-critical bg-status-critical/10 rounded-lg">
        Error loading finance data: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Finance Auditing</h1>
          <p className="text-text-secondary mt-1">Service Delivery Verification</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-elevated p-6 rounded-xl border border-divider">
          <p className="text-sm font-medium text-text-secondary">Open Tasks</p>
          <p className="text-4xl font-bold text-status-warning mt-2">{metrics.open}</p>
          <p className="text-xs text-text-tertiary mt-2">Awaiting completion</p>
        </div>
        <div className="bg-bg-elevated p-6 rounded-xl border border-divider">
          <p className="text-sm font-medium text-text-secondary">Closed Tasks (Billable)</p>
          <p className="text-4xl font-bold text-status-success mt-2">{metrics.closed}</p>
          <p className="text-xs text-text-tertiary mt-2">Ready for invoicing</p>
        </div>
        <div className="bg-bg-elevated p-6 rounded-xl border border-divider">
          <p className="text-sm font-medium text-text-secondary">Total Dispatch</p>
          <p className="text-4xl font-bold text-brand-gold mt-2">{metrics.total}</p>
          <p className="text-xs text-text-tertiary mt-2">All recorded tasks</p>
        </div>
      </div>

      <div className="bg-bg-elevated rounded-xl border border-divider overflow-hidden">
        <div className="px-6 py-4 border-b border-divider">
          <h2 className="text-lg font-semibold text-text-primary">Recent Closed Tasks (Billable)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-secondary">
            <thead className="bg-bg-subtle text-text-primary">
              <tr>
                <th className="px-6 py-3 font-medium">Doc Number</th>
                <th className="px-6 py-3 font-medium">Created On</th>
                <th className="px-6 py-3 font-medium">Closed On</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {(serviceRecords || [])
                .filter((r) => r.status === 'Closed' || r.current_status === 'Closed')
                .sort((a, b) => new Date(b.closed_date || 0).getTime() - new Date(a.closed_date || 0).getTime())
                .slice(0, 10)
                .map((record) => (
                  <tr key={record.id} className="hover:bg-bg-subtle/50 transition-colors">
                    <td className="px-6 py-4 text-text-primary font-mono">{record.doc_no || record.do_number || '-'}</td>
                    <td className="px-6 py-4">{record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">{record.closed_date ? new Date(record.closed_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">
                        Closed
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">{record.region || '-'}</td>
                  </tr>
                ))}
              {serviceRecords?.filter((r) => r.status === 'Closed' || r.current_status === 'Closed').length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-text-tertiary text-sm">
                    No closed tasks found for billing verification.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
