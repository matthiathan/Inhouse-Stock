import { useState, useMemo } from 'react';
import { useServiceTasks } from '../features/tickets/hooks';
import { Search, Filter, ArrowUpDown, Clock, CheckCircle, ClipboardList, Info } from 'lucide-react';
import { motion } from 'motion/react';

export default function ServiceTasksPage() {
  const { data: tasks, isLoading } = useServiceTasks();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
  const [sortBy, setSortBy] = useState<'CustomerName' | 'DateClosedDesc' | 'DateClosedAsc'>('DateClosedDesc');

  // Helper functions for status definitions as specified
  const isTaskOpen = (task: any) => {
    const rawStatus = task["CURRENT STATUS"];
    return !rawStatus || rawStatus.trim() === '';
  };

  const isTaskClosed = (task: any) => {
    const rawStatus = task["CURRENT STATUS"];
    return rawStatus === 'Closed';
  };

  // Helper function to format any date to dd/MM/yyyy in local timezone, returning "-" for null or undefined
  const formatDate = (dateValue: any) => {
    if (!dateValue) return '-';
    try {
      const dateObj = new Date(dateValue);
      if (isNaN(dateObj.getTime())) return '-';
      
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '-';
    }
  };

  // Memoize task counts
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, open: 0, closed: 0 };
    let openCount = 0;
    let closedCount = 0;
    
    tasks.forEach((task: any) => {
      if (isTaskOpen(task)) openCount++;
      else if (isTaskClosed(task)) closedCount++;
    });

    return {
      total: tasks.length,
      open: openCount,
      closed: closedCount
    };
  }, [tasks]);

  // Memoize the filtering and sorting so it runs instantly on the frontend
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    let result = [...tasks];

    // 1. Filter by Status
    if (statusFilter !== 'All') {
      result = result.filter((task: any) => {
        if (statusFilter === 'Open') return isTaskOpen(task);
        if (statusFilter === 'Closed') return isTaskClosed(task);
        return true;
      });
    }

    // 2. Filter by Search (Client Name or Code, case-insensitive)
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-gray-900" size={28} id="title-icon" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-950" id="main-title">Service Tasks Monitor</h1>
          </div>
          <p className="text-gray-500 mt-1 text-sm font-medium">Real-time supervision of active customer closures and log dispatch logs.</p>
        </div>

        {/* Stats Section */}
        <div className="flex items-center gap-3">
          <div className="bg-yellow-50 border border-yellow-200/50 px-4 py-2 rounded-xl text-center shadow-xs">
            <div className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest">Open</div>
            <div className="text-lg font-bold text-yellow-950 mt-0.5">{stats.open}</div>
          </div>
          <div className="bg-green-50 border border-green-200/50 px-4 py-2 rounded-xl text-center shadow-xs">
            <div className="text-[10px] font-bold text-green-800 uppercase tracking-widest">Closed</div>
            <div className="text-lg font-bold text-green-950 mt-0.5">{stats.closed}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center shadow-xs">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Total Logged</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sort - Highly professional, top-aligned */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-start justify-between">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} id="search-icon" />
          </span>
          <input 
            type="text" 
            placeholder="Search customer, client name or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none text-gray-900 placeholder-gray-400 font-medium"
            id="task-search-input"
          />
        </div>

        {/* Filters and sorting Row - Top-aligned */}
        <div className="flex flex-col sm:flex-row items-start gap-4 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 text-sm text-gray-600 w-full sm:w-auto">
            <Filter size={16} className="text-gray-400 shrink-0" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2.5 bg-white font-medium hover:border-gray-300 focus:ring-2 focus:ring-amber-500/10 outline-none text-gray-800 cursor-pointer text-xs sm:text-sm"
              id="status-filter-select"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open Tasks</option>
              <option value="Closed">Closed Tasks</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 text-sm text-gray-600 w-full sm:w-auto">
            <ArrowUpDown size={16} className="text-gray-400 shrink-0" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2.5 bg-white font-medium hover:border-gray-300 focus:ring-2 focus:ring-amber-500/10 outline-none text-gray-800 cursor-pointer text-xs sm:text-sm"
              id="sort-select"
            >
              <option value="DateClosedDesc">Closed Date (Newest first)</option>
              <option value="DateClosedAsc">Closed Date (Oldest first)</option>
              <option value="CustomerName">Customer Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table: Subtle drop shadow and horizontal responsive scrolling */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_4px_18px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm border-collapse min-w-[800px]" id="service-tasks-table">
            <thead>
              <tr className="bg-gray-50/70 text-gray-500 border-b border-gray-100 font-semibold tracking-wide text-xs uppercase">
                <th className="p-4 w-40 text-left">Status</th>
                <th className="p-4">Customer Client Name</th>
                <th className="p-4 w-44">Customer Code</th>
                <th className="p-4 w-48 text-left">Date Opened</th>
                <th className="p-4 w-48 text-left">Date Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-22">
                      <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading logged service tasks...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3 py-6">
                      <div className="p-4 bg-gray-50 rounded-full border border-gray-100 text-gray-400">
                        <Info size={32} />
                      </div>
                      <h3 className="text-base font-bold text-gray-901">No Service Tasks Found</h3>
                      <p className="text-gray-500 text-sm">
                        No service call logs match your query. Try resetting your search filters or change search keys.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedTasks.map((task: any) => {
                  const isOpen = isTaskOpen(task);
                  const isClosed = isTaskClosed(task);

                  return (
                    <motion.tr 
                      key={task.id} 
                      className="hover:bg-gray-50/50 transition-colors group cursor-default"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <td className="p-4">
                        {isOpen ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-50 text-yellow-800 border border-yellow-250 text-[10px] font-extrabold uppercase tracking-wider">
                            <Clock size={11} className="animate-pulse" /> OPEN
                          </span>
                        ) : isClosed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-green-800 border border-green-250 text-[10px] font-extrabold uppercase tracking-wider">
                            <CheckCircle size={11} /> CLOSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 text-gray-700 border border-gray-200 text-[10px] font-extrabold uppercase tracking-wider">
                            {task["CURRENT STATUS"]}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                        {task["Client Name"] || <span className="text-gray-300 italic font-normal">No name provided</span>}
                      </td>
                      <td className="p-4">
                        <code className="px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded font-mono text-xs border border-gray-100 font-medium">
                          {task["Customer Code"] || '-'}
                        </code>
                      </td>
                      <td className="p-4 text-gray-400 text-xs sm:text-sm font-medium">
                        {formatDate(task["Date"])}
                      </td>
                      <td className="p-4 text-gray-650 font-semibold text-xs sm:text-sm">
                        {formatDate(task["Closed Date"])}
                      </td>
                    </motion.tr>
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
