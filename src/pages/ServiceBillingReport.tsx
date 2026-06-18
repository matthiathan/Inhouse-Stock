import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Receipt, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin
} from 'lucide-react';
import { getServiceBillingReport } from '../features/finance/api';

export default function ServiceBillingReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['service-billing-report'],
    queryFn: getServiceBillingReport
  });

  const filteredData = useMemo(() => {
    if (!rawData) return [];

    let result = [...rawData];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.client_name?.toLowerCase().includes(q) || 
        item.customer_code?.toLowerCase().includes(q)
      );
    }

    // Region filter
    if (regionFilter !== 'All') {
      result = result.filter(item => item.region === regionFilter);
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = a.date_closed ? new Date(a.date_closed).getTime() : 0;
      const dateB = b.date_closed ? new Date(b.date_closed).getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [rawData, searchQuery, regionFilter, statusFilter, sortOrder]);

  const StatusBadge = ({ status }: { status: string }) => {
    const isClosed = status === 'Closed' || status === 'Completed';
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit ${
        isClosed 
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
          : 'bg-amber-100 text-amber-700 border border-amber-200'
      }`}>
        {isClosed ? <CheckCircle2 size={10} /> : <Clock size={10} />}
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Receipt className="text-brand-gold" />
            Standard Service Fee Report
          </h1>
          <p className="text-text-secondary mt-1">
            Tracking billable service interventions (Standard Fee: R799.00)
          </p>
        </div>
      </header>

      {/* Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-bg-elevated p-4 rounded-2xl border border-brand-border shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input 
            type="text"
            placeholder="Search Client or Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg-base border border-brand-border rounded-xl outline-none focus:border-brand-gold text-sm text-text-primary"
          />
        </div>

        {/* Region */}
        <div className="flex items-center gap-2 bg-bg-base px-3 py-2 rounded-xl border border-brand-border">
          <MapPin size={16} className="text-text-secondary" />
          <select 
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-transparent text-sm font-medium text-text-primary outline-none flex-grow"
          >
            <option value="All">All Regions</option>
            <option value="KZN">KZN Region</option>
            <option value="JHB">JHB Region</option>
            <option value="CPT">CPT Region</option>
            <option value="Unknown">Others</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 bg-bg-base px-3 py-2 rounded-xl border border-brand-border">
          <Filter size={16} className="text-text-secondary" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm font-medium text-text-primary outline-none flex-grow"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open Only</option>
            <option value="Closed">Closed Only</option>
          </select>
        </div>

        {/* Sort */}
        <button 
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center justify-between gap-2 bg-bg-base px-4 py-2 rounded-xl border border-brand-border text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-text-secondary" />
            <span>Closed Date</span>
          </div>
          <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded uppercase font-bold">
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </span>
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-bg-elevated rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-base/50 border-b border-brand-border text-[10px] text-text-secondary uppercase tracking-widest font-black">
                <th className="p-4 px-6">Region</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Timestamps</th>
                <th className="p-4">Current Status</th>
                <th className="p-4 text-right pr-6">Billed Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold">Compiling billing data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-text-secondary opacity-60">
                      <AlertCircle size={40} />
                      <p className="text-lg font-bold">No Records Found</p>
                      <p className="text-sm">Try adjusting your filters or search keywords.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-bg-base/50 transition-colors group">
                    <td className="p-4 px-6">
                      <span className={`px-2 py-1 rounded text-[10px] font-black border ${
                        row.region === 'KZN' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        row.region === 'JHB' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        row.region === 'CPT' ? 'bg-cyan-50 text-cyan-600 border-cyan-200' :
                        'bg-gray-50 text-gray-400 border-gray-200'
                      }`}>
                        {row.region}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-text-primary">{row.client_name || 'Unnamed Client'}</p>
                      <p className="text-xs text-text-secondary font-mono">{row.customer_code}</p>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <span className="font-bold text-[9px] uppercase opacity-50 w-12 italic">Opened:</span>
                          <span>{row.date_opened ? new Date(row.date_opened).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-primary">
                          <span className="font-bold text-[9px] uppercase opacity-50 w-12 italic">Closed:</span>
                          <span className="font-bold">{row.date_closed ? new Date(row.date_closed).toLocaleDateString() : '---'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="p-4 text-right pr-6">
                      <span className="text-sm font-black text-emerald-600">
                        {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(row.billing_fee)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
