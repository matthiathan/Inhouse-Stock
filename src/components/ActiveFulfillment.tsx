import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, Package, ArrowLeft, RefreshCw, Barcode as BarcodeIcon, Play, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import BarcodeScanner from './BarcodeScanner';

interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  stock_barcode: string;
  required_quantity: number;
  scanned_quantity: number;
}

interface ActiveFulfillmentProps {
  orderId: string;
  onClose: () => void;
}

export default function ActiveFulfillment({ orderId, onClose }: ActiveFulfillmentProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // 1. Fetch Order Items
  useEffect(() => {
    async function fetchOrder() {
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (error) throw error;
        
        // Initialize scanned_quantity if not present or just set to 0 for the session
        const initialized = (data || []).map(item => ({
          ...item,
          scanned_quantity: item.scanned_quantity || 0
        }));
        
        setItems(initialized);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error("Failed to load order items: " + message);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  // 2. Progressive Picking Logic
  const handleScanSuccess = useCallback((decodedText: string) => {
    setItems(prevItems => {
      const itemIndex = prevItems.findIndex(i => i.stock_barcode.trim().toLowerCase() === decodedText.trim().toLowerCase());
      
      if (itemIndex === -1) {
        toast.error(`Item ${decodedText} not found in this order`);
        return prevItems;
      }

      const item = prevItems[itemIndex];
      
      if (item.scanned_quantity >= item.required_quantity) {
        toast.info(`${item.item_name} is already fully picked`);
        return prevItems;
      }

      const newItems = [...prevItems];
      newItems[itemIndex] = {
        ...item,
        scanned_quantity: item.scanned_quantity + 1
      };
      
      toast.success(`Picked: ${item.item_name}`);
      return newItems;
    });
  }, []);

  // 3. Stats & Progress
  const totalRequired = useMemo(() => items.reduce((acc, i) => acc + i.required_quantity, 0), [items]);
  const totalScanned = useMemo(() => items.reduce((acc, i) => acc + i.scanned_quantity, 0), [items]);
  const progressPercent = totalRequired > 0 ? (totalScanned / totalRequired) * 100 : 0;
  const isOrderComplete = totalScanned >= totalRequired && totalRequired > 0;

  // 4. Order Completion Logic
  const handleCompleteOrder = async () => {
    if (!isOrderComplete) return;

    setIsCompleting(true);
    try {
      // Step A: Update Order Status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'Fulfilled',
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Step B: Upsert Order Items (saving picking progress)
      const { error: itemsError } = await supabase
        .from('order_items')
        .upsert(items);

      if (itemsError) throw itemsError;

      // Step C: Atomically Decrement Stock via RPC
      const stockDecrementPromises = items.map(item => 
        supabase.rpc('decrement_stock', {
          target_barcode: item.stock_barcode,
          decrement_amount: item.scanned_quantity
        })
      );

      const results = await Promise.all(stockDecrementPromises);
      const firstError = results.find(r => r.error);
      if (firstError) throw firstError.error;

      toast.success("Order fulfilled and inventory updated!");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Fulfillment failed: " + message);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-bg-base min-h-screen">
        <RefreshCw className="w-10 h-10 animate-spin text-brand-gold" />
        <p className="mt-4 text-text-secondary font-medium">Initializing picking list...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-base">
      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-40 bg-bg-elevated border-b border-brand-border p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onClose} className="p-1 hover:bg-bg-base rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-text-primary leading-tight">Order #{orderId.slice(-6).toUpperCase()}</h1>
            <p className="text-sm text-brand-gold font-bold">
              {totalScanned} of {totalRequired} units picked
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-brand-border h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300"
          />
        </div>
      </header>

      {/* 2. ITEM LIST (Scrollable) */}
      <main className="flex-grow p-4 space-y-3 overflow-y-auto pb-32">
        {items.map((item) => {
          const isDone = item.scanned_quantity === item.required_quantity;
          
          return (
            <motion.div 
              key={item.id}
              layout
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isDone 
                  ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' 
                  : 'bg-bg-elevated border-brand-border'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className={`font-bold text-lg leading-tight ${isDone ? 'text-emerald-900' : 'text-text-primary'}`}>
                    {item.item_name}
                  </h3>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <BarcodeIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">{item.stock_barcode}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {isDone ? (
                    <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="text-2xl font-black text-text-primary">
                        {item.scanned_quantity}
                      </span>
                      <span className="text-sm font-bold text-text-secondary ml-1">
                        / {item.required_quantity}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </main>

      {/* 3. SCANNER POPUP */}
      <AnimatePresence>
        {isScanning && (
          <BarcodeScanner 
            onScan={handleScanSuccess}
            onClose={() => setIsScanning(false)}
            title="Pick Items"
            description="Scan item barcodes to pick them from stock"
          />
        )}
      </AnimatePresence>

      {/* 4. ACTIONS BAR */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-bg-elevated border-t border-brand-border flex gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setIsScanning(true)}
          className="flex-1 bg-brand-gold text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <QrCode className="w-5 h-5" />
          Scan Item
        </button>

        <button 
          disabled={!isOrderComplete || isCompleting}
          onClick={handleCompleteOrder}
          className={`flex-1 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all ${
            isOrderComplete 
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {isCompleting ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          Complete Order
        </button>
      </footer>
    </div>
  );
}
