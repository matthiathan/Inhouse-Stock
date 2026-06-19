import { useState, useMemo } from 'react';
import { useServiceTasks } from '../features/tickets/hooks';
import { Search, Filter, ArrowUpDown, Clock, CheckCircle2 } from 'lucide-react';

export default function ServiceTasksPage() {
  const { data: tasks, isLoading } = useServiceTasks();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [sortBy, setSortBy] = useState<'CustomerName' | 'DateClosedDesc' | 'DateClosedAsc'>('DateClosedDesc');

  // Memoize the filtering and sorting so it runs instantly on the frontend
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    let result = [...tasks];

    // 1. Filter by Status
    if (statusFilter !== 'All') {
      result = result.filter((task: any) => {
        const rawStatus = task["CURRENT STATUS"];
        // Treat null, undefined, or empty string as 'Open'
        const isOpen = !rawStatus || rawStatus.trim() === '';
        return statusFilter === 'Open' ? isOpen : !isOpen;
      });
    }

    // 2. Filter by Search (Customer Name or Code)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((task: any) => 
        task["Client Name"]?.toLowerCase().includes(lowerQuery) ||
        task["Customer Code"]?.toLowerCase().includes(lowerQuery)
      );
    }

    // 3. Sort Data
    result.sort((a: any, b: any) => {
      if (sortBy === 'CustomerName') {
        const nameA = a["Client Name"] || '';
        const nameB = b["Client Name"] || '';
        return nameA.localeCompare(nameB);
      }
      
      // Sorting by Closed Date
      const dateA = a["Closed Date"] ? new Date(a["Closed Date"]).getTime() : 0;
      const dateB = b["Closed Date"] ? new Date(b["Closed Date"]).getTime() : 0;
      
      return sortBy === 'DateClosedDesc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [tasks, searchQuery, statusFilter, sortBy]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Tasks Monitor</h1>
          <p className="text-gray-500 mt-1">Track and filter all open and closed service calls.</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sort */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search Customer Name or Code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-gold outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border rounded-lg px-3 py-2 bg-gray-50 outline-none"
          >
            <option value="All">All Tasks</option>
            <option value="Open">Open Tasks Only</option>
            <option value="Closed">Closed Tasks Only</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={20} className="text-gray-400" />
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border rounded-lg px-3 py-2 bg-gray-50 outline-none"
          >
            <option value="DateClosedDesc">Date Closed (Newest First)</option>
            <option value="DateClosedAsc">Date Closed (Oldest First)</option>
            <option value="CustomerName">Customer Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b">
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Code</th>
                <th className="p-4 font-semibold">Date Opened</th>
                <th className="p-4 font-semibold">Date Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading tasks...</td></tr>
              ) : filteredAndSortedTasks.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-medium">No tasks found matching your filters.</td></tr>
              ) : (
                filteredAndSortedTasks.map((task: any) => {
                  const rawStatus = task["CURRENT STATUS"];
                  const isOpen = !rawStatus || rawStatus.trim() === '';
                  
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                            <Clock size={14} /> OPEN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle2 size={14} /> CLOSED
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-gray-900">{task["Client Name"] || 'N/A'}</td>
                      <td className="p-4 font-mono text-gray-500">{task["Customer Code"] || 'N/A'}</td>
                      <td className="p-4 text-gray-600">
                        {task["Date"] ? new Date(task["Date"]).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-gray-600 font-medium">
                        {task["Closed Date"] ? new Date(task["Closed Date"]).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
