import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Package, Hash, Boxes, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface StockItem {
  id: string | number;
  item_name?: string;
  item?: string; // Some data might use 'item' instead of 'item_name'
  sku?: string;
  barcode?: string;
  quantity?: number;
  pallet_quantity?: number;
  box_quantity?: number;
  units_per_box?: number;
  notes?: string;
}

interface VirtualStockListProps {
  stockItems: StockItem[];
  containerHeight?: string;
}

export default function VirtualStockList({ 
  stockItems, 
  containerHeight = "800px" 
}: VirtualStockListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: stockItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated height of each row in pixels
    overscan: 10,
  });

  const getItemName = (item: StockItem) => item.item_name || item.item || 'Unknown Item';
  const getSKU = (item: StockItem) => item.barcode || item.sku || 'N/A';
  const getQuantity = (item: StockItem) => {
    if (item.quantity !== undefined) return item.quantity;
    // Fallback for calculated total
    return (item.pallet_quantity || 0) * 48 * (item.units_per_box || 1) + 
           (item.box_quantity || 0) * (item.units_per_box || 1);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
      {/* Table Header Wrapper */}
      <div className="bg-gray-50 border-b border-gray-100 grid grid-cols-[1fr_2fr_1fr] gap-4 px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
          <Hash className="w-3.5 h-3.5" />
          SKU / Barcode
        </div>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
          <Package className="w-3.5 h-3.5" />
          Item Details
        </div>
        <div className="flex items-center justify-end gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
          <Boxes className="w-3.5 h-3.5" />
          Availability
        </div>
      </div>

      {/* Scrollable Container */}
      <div
        ref={parentRef}
        style={{ height: containerHeight }}
        className="overflow-auto scrollbar-hide bg-white relative"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = stockItems[virtualRow.index];
            const name = getItemName(item);
            const sku = getSKU(item);
            const qty = getQuantity(item);
            const isLow = qty < 50;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="px-6 border-b border-gray-50 transition-colors hover:bg-gray-50/50"
              >
                <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 py-4 items-center h-full">
                  {/* SKU Column */}
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md self-start">
                      {sku}
                    </span>
                  </div>

                  {/* Name Column */}
                  <div className="flex flex-col">
                    <h4 className="font-bold text-gray-900 line-clamp-1">{name}</h4>
                    {item.notes && item.notes !== 'No notes' && (
                      <p className="text-xs text-gray-400 italic line-clamp-1">{item.notes}</p>
                    )}
                  </div>

                  {/* Quantity Column */}
                  <div className="flex flex-col items-end justify-center">
                    <div className={`px-3 py-1 rounded-full text-sm font-black border ${
                      isLow 
                        ? 'bg-red-50 text-red-600 border-red-100 shadow-[0_0_10px_rgba(220,38,38,0.1)]' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    }`}>
                      {qty.toLocaleString()} <span className="text-[10px] font-bold opacity-60 ml-0.5">UNITS</span>
                    </div>
                    {isLow && (
                      <motion.div 
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex items-center gap-1 mt-1 text-[9px] font-black uppercase text-red-500 tracking-tighter"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Critically Low
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {stockItems.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
             <Boxes className="w-16 h-16 mb-4" />
             <p className="font-black uppercase tracking-widest text-sm">No stock items found</p>
             <p className="text-xs">Adjust your search or add new inventory</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Real-time Feed Active
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">
          Showing {stockItems.length} Records
        </span>
      </div>
    </div>
  );
}
