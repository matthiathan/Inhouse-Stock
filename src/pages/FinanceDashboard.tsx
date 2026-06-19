import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function FinanceDashboard() {
  const [regionFilter, setRegionFilter] = useState('All');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['finance-metrics'],
    queryFn: async () => {
      // Note: This relies on the view/table 'finance_dashboard_metrics' existing in Supabase
      const { data, error } = await supabase.from('finance_dashboard_metrics').select('*');
      if (error) throw error;
      return data as any[];
    }
  });

  if (isLoading) return <div className="p-8 text-center bg-gray-50 min-h-screen flex items-center justify-center font-bold text-gray-400 animate-pulse">Loading Financial Data...</div>;

  // Filter Data
  const filteredData = metrics?.filter(m => regionFilter === 'All' || m.region === regionFilter) || [];
  
  // KPI Calculations
  const highRiskCount = filteredData.filter(m => m.health_status === 'High Risk').length;
  const mediumRiskCount = filteredData.filter(m => m.health_status === 'Medium Risk').length;
  
  // Data for the Chart (Grouping by Region)
  const chartData = ['KZN', 'JHB', 'CPT'].map(region => ({
    name: region,
    'High Risk': metrics?.filter(m => m.region === region && m.health_status === 'High Risk').length || 0,
    'Medium Risk': metrics?.filter(m => m.region === region && m.health_status === 'Medium Risk').length || 0,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Finance & Audit</h1>
          <p className="text-gray-500 font-medium mt-1">Real-time service compliance & ghost billing monitoring</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <span className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Region Filter</span>
          <select 
            value={regionFilter} 
            onChange={(e) => setRegionFilter(e.target.value)}
            className="border-none rounded-xl px-4 py-2 bg-gray-50 shadow-inner font-bold text-gray-700 outline-none focus:ring-2 focus:ring-brand-gold/20"
          >
            <option value="All">Global (All)</option>
            <option value="KZN">KwaZulu-Natal</option>
            <option value="JHB">Johannesburg</option>
            <option value="CPT">Cape Town</option>
          </select>
        </div>
      </div>

      {/* Top Row: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 flex items-center justify-between group transition-all hover:shadow-xl hover:shadow-red-500/5 hover:-translate-y-1">
          <div>
            <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Critical Exceptions</p>
            <p className="text-4xl font-black text-red-600 tabular-nums tracking-tighter">{highRiskCount}</p>
            <p className="text-xs font-bold text-red-400 mt-2">Accounts &gt; 90 Days</p>
          </div>
          <div className="p-5 bg-red-50 rounded-2xl text-red-500 transition-colors group-hover:bg-red-100"><ShieldAlert size={36} /></div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-orange-100 flex items-center justify-between group transition-all hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1">
          <div>
            <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">SLA Warning</p>
            <p className="text-4xl font-black text-orange-600 tabular-nums tracking-tighter">{mediumRiskCount}</p>
            <p className="text-xs font-bold text-orange-400 mt-2">Accounts &gt; 60 Days</p>
          </div>
          <div className="p-5 bg-orange-50 rounded-2xl text-orange-500 transition-colors group-hover:bg-orange-100"><AlertTriangle size={36} /></div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-100 flex items-center justify-between group transition-all hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1">
          <div>
            <p className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">Service Frequency</p>
            <p className="text-4xl font-black text-emerald-600 tabular-nums tracking-tighter">
              {filteredData.reduce((sum, m) => sum + (m.total_services_ytd || 0), 0)}
            </p>
            <p className="text-xs font-bold text-emerald-400 mt-2">Total Service Logs YTD</p>
          </div>
          <div className="p-5 bg-emerald-50 rounded-2xl text-emerald-500 transition-colors group-hover:bg-emerald-100"><TrendingUp size={36} /></div>
        </div>
      </div>

      {/* Middle Row: The Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Regional Risk Distribution</h2>
          <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[10px] font-black uppercase text-gray-400">High Risk</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <span className="text-[10px] font-black uppercase text-gray-400">Medium Risk</span>
             </div>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 900 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 900 }} 
              />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }} 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
              />
              <Bar dataKey="High Risk" fill="#ef4444" radius={[6, 6, 0, 0]} stackId="a" barSize={40} />
              <Bar dataKey="Medium Risk" fill="#f59e0b" radius={[6, 6, 0, 0]} stackId="a" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: The Data List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <h2 className="text-lg font-black text-gray-800 tracking-tight">Action Queue: Critical Exceptions</h2>
          <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {filteredData.filter(m => m.health_status !== 'Healthy').length} Records Found
          </span>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-hide">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">
                <th className="p-6">Account Details</th>
                <th className="p-6">Regional ID</th>
                <th className="p-6">Service Type</th>
                <th className="p-6">Drift Period</th>
                <th className="p-6">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData
                .filter(m => m.health_status !== 'Healthy')
                .sort((a, b) => b.days_without_service - a.days_without_service)
                .map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-6">
                    <div className="font-black text-gray-900 text-sm group-hover:text-brand-gold transition-colors">{row.customer_name}</div>
                    <div className="text-[10px] font-mono font-bold text-gray-400 mt-0.5 tracking-tighter">DOC_ID: {row["doc#"]}</div>
                  </td>
                  <td className="p-6">
                    <span className="font-black text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{row.region}</span>
                  </td>
                  <td className="p-6 font-medium text-gray-600 text-xs italic">{row.agreement_type}</td>
                  <td className="p-6">
                    <div className="font-mono text-sm font-black text-gray-900">{row.days_without_service} <span className="text-[10px] opacity-40">DAYS</span></div>
                  </td>
                  <td className="p-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      row.health_status === 'High Risk' 
                        ? 'bg-red-50 text-red-600 border border-red-100 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                        : 'bg-orange-50 text-orange-600 border border-orange-100 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${row.health_status === 'High Risk' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                      {row.health_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
