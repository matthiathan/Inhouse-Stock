import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // 1. Fetch Order Items
  useEffect(() => {
    async function fetchOrder() {
      try {
        // Use a join to get item details directly from the 'stock' table
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            id,
            order_id,
            required_quantity,
            scanned_quantity,
            stock:stock_barcode (item_name, barcode)
          `)
          .eq('order_id', orderId);

        if (error) throw error;
        
        // Map the joined data to your internal state
        const initialized = (data || []).map((item: any) => ({
          id: item.id,
          order_id: item.order_id,
          // Fallback to stock record if item_name/barcode are null in order_items
          item_name: item.stock?.item_name || 'Unknown Item',
          stock_barcode: item.stock?.barcode || item.stock_barcode,
          required_quantity: item.required_quantity,
          scanned_quantity: item.scanned_quantity || 0
        }));
        
        setItems(initialized);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load order items.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  // 2. Progressive Picking Logic
  const handleScan = async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    if (navigator.vibrate) navigator.vibrate(200);

    try {
      const itemToUpdate = items.find(i => i.stock_barcode.trim().toLowerCase() === decodedText.trim().toLowerCase());
      
      if (!itemToUpdate) {
        toast.error(`Item ${decodedText} not found in this order`);
        return;
      }
      
      if (itemToUpdate.scanned_quantity >= itemToUpdate.required_quantity) {
        toast.info(`${itemToUpdate.item_name} is already fully picked`);
        return;
      }

      // Update DB
      const { error } = await supabase
        .from('order_items')
        .update({ 
          scanned_quantity: itemToUpdate.scanned_quantity + 1,
          is_fulfilled: itemToUpdate.scanned_quantity + 1 >= itemToUpdate.required_quantity
        })
        .eq('id', itemToUpdate.id);
      
      if (error) throw error;

      // Update Local
      setItems(prevItems => {
        const newItems = [...prevItems];
        const index = newItems.findIndex(i => i.id === itemToUpdate.id);
        newItems[index] = {
          ...newItems[index],
          scanned_quantity: newItems[index].scanned_quantity + 1,
          is_fulfilled: newItems[index].scanned_quantity + 1 >= newItems[index].required_quantity
        };
        return newItems;
      });
      
      toast.success(`Picked: ${itemToUpdate.item_name}`);

    } catch (err) {
      console.error(err);
      toast.error("Failed to update scan.");
    } finally {
      setTimeout(() => {
        processingRef.current = false;
        setIsProcessing(false);
      }, 1500);
    }
  };

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

      toast.success("Order fulfilled!");
      onClose();
    } catch (error: any) {
      // CORRECT WAY TO LOG: Look for the specific 'message' property
      const errorMessage = error.message || error.details || JSON.stringify(error);
      console.error("Fulfillment failed:", errorMessage);
      
      // Update your UI to show this specific message
      toast.error("Fulfillment failed: " + errorMessage); 
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
            onScan={handleScan}
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
          disabled={isProcessing}
          className={`flex-1 font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${
            isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-gold text-white'
          }`}
        >
          {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin"/> : <QrCode className="w-5 h-5" />}
          {isProcessing ? 'Saving...' : 'Scan Item'}
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
