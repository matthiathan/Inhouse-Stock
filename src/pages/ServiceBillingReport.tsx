import { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Download, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { useBillingReport, BillingReportRecord } from '../features/finance/hooks';
import { DataTable } from '../components/DataTable';
import { formatZAR, formatDate } from '../utils/formatters';

export default function ServiceBillingReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: rawData, isLoading } = useBillingReport();

  const filteredData = useMemo(() => {
    if (!rawData) return [];
    return rawData.filter(row => {
      const matchesSearch = 
        (row.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.customerCode || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRegion = regionFilter === 'All' || row.region === regionFilter;
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
      
      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [rawData, searchQuery, regionFilter, statusFilter]);

  const columns = [
    {
      header: 'Region',
      accessorKey: 'region' as const,
      cell: (val: string) => (
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-gray-400" />
          <span className="font-bold text-gray-700">{val}</span>
        </div>
      )
    },
    {
      header: 'Customer',
      accessorKey: 'clientName' as const,
      cell: (_: any, row: BillingReportRecord) => (
        <div>
          <div className="font-black text-gray-900 leading-tight">{row.clientName}</div>
          <div className="text-[10px] font-mono font-bold text-gray-400 tracking-tighter">REF: {row.customerCode}</div>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status' as const,
      cell: (val: string) => {
        const isClosed = val === 'Closed';
        return (
          <span className={`
            inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter
            ${isClosed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}
          `}>
            {isClosed ? <CheckCircle2 size={10} /> : <Clock size={10} />}
            {val}
          </span>
        );
      }
    },
    {
      header: 'Dates',
      accessorKey: 'openedDate' as const,
      cell: (_: any, row: BillingReportRecord) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span className="font-black uppercase tracking-widest italic opacity-60">Opened:</span>
            <span className="font-bold text-gray-600">{formatDate(row.openedDate)}</span>
          </div>
          {row.closedDate && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-600">
              <span className="font-black uppercase tracking-widest italic opacity-60">Closed:</span>
              <span className="font-bold">{formatDate(row.closedDate)}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Billing Fee',
      accessorKey: 'billingFee' as const,
      cell: (val: number) => (
        <div className="text-right">
          <span className="font-black text-emerald-600 tabular-nums text-sm">{formatZAR(val)}</span>
        </div>
      ),
      className: 'text-right'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50/30 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Receipt className="text-brand-gold" size={32} />
            Service Billing
          </h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Regional Service Fee Reconciliation (Standard: R799.00)</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 shadow-sm hover:shadow-md transition-all active:scale-95">
          <Download size={14} />
          Export Report
        </button>
      </header>

      {/* Modern Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search customer or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-brand-gold/20 transition-all outline-none"
          />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="bg-gray-50 border-none px-4 py-2 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-gold/20"
        >
          <option value="All">All Regions</option>
          <option value="KZN">KwaZulu-Natal</option>
          <option value="JHB">Johannesburg</option>
          <option value="CPT">Cape Town</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 border-none px-4 py-2 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-gold/20"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No billing records matches your filters"
      />

      {/* Summary Footer */}
      {!isLoading && filteredData.length > 0 && (
        <div className="flex justify-end p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Period Billing</p>
            <p className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums">
              {formatZAR(filteredData.reduce((sum, row) => sum + row.billingFee, 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
