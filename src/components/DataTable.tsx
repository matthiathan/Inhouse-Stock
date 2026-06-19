import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SearchX, Loader2 } from 'lucide-react';

interface Column<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id?: string | number }>({ 
  data, 
  columns, 
  isLoading, 
  emptyMessage = "No records found",
  onRowClick 
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 w-full bg-gray-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50/50">
            <AnimatePresence mode="popLayout">
              {data.length > 0 ? (
                data.map((item, idx) => (
                  <motion.tr
                    key={item.id || idx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      group transition-all hover:bg-brand-gold/5 
                      ${idx % 2 === 1 ? 'bg-gray-50/30' : 'bg-white'}
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                  >
                    {columns.map((col, i) => (
                      <td key={i} className={`p-4 ${col.className || ''}`}>
                        {col.cell 
                          ? col.cell(item[col.accessorKey], item) 
                          : (item[col.accessorKey] as React.ReactNode)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="p-4 bg-gray-50 rounded-full text-gray-300">
                        <SearchX size={40} />
                      </div>
                      <div>
                        <p className="text-gray-900 font-bold">{emptyMessage}</p>
                        <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search terms</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
