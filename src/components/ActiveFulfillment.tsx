import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CheckCircle, Package, ArrowLeft, RefreshCw, Barcode as BarcodeIcon, Play, QrCode } from 'lucide-react';
import { orderRepository } from '../services/api/orderRepository';
import { Button } from './ui/Button';
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
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // 1. Fetch Order Items
  useEffect(() => {
    async function fetchOrder() {
      try {
        // Fetch order and items
        const [orderRes, itemsRes] = await Promise.all([
          supabase.from('orders').select('*').eq('id', orderId).single(),
          supabase
            .from('order_items')
            .select(`
              id,
              order_id,
              required_quantity,
              scanned_quantity,
              stock_barcode,
              stock (item_name, barcode)
            `)
            .eq('order_id', orderId)
        ]);

        if (orderRes.error) throw orderRes.error;
        if (itemsRes.error) throw itemsRes.error;

        setOrder(orderRes.data);
        
        // Map the joined data to your internal state
        const initialized = (itemsRes.data || []).map((item: any) => ({
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

  const handleScan = async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    if (navigator.vibrate) navigator.vibrate(200);

    const itemToUpdate = items.find(i => i.stock_barcode.trim().toLowerCase() === decodedText.trim().toLowerCase());
    
    if (!itemToUpdate) {
      toast.error(`Item ${decodedText} not found in this order`);
      processingRef.current = false;
      setIsProcessing(false);
      return;
    }
    
    if (itemToUpdate.scanned_quantity >= itemToUpdate.required_quantity) {
      toast.info(`${itemToUpdate.item_name} is already fully picked`);
      processingRef.current = false;
      setIsProcessing(false);
      return;
    }

    // 1. Cache the previous state
    const previousItems = [...items];

    // 2. Optimistic UI Update (Instant feedback)
    setItems(prev => prev.map(i => 
      i.id === itemToUpdate.id ? { ...i, scanned_quantity: i.scanned_quantity + 1 } : i
    ));

    try {
      // 3. Network Call (using RPC)
      const { error } = await supabase.rpc('fulfill_item', {
        item_id: itemToUpdate.id,
        qty: 1
      });

      if (error) throw error;
      
      toast.success(`Picked: ${itemToUpdate.item_name}`);
      
    } catch (error: any) {
      // 4. REVERT on failure and notify user
      console.error("Failed to update database:", error);
      setItems(previousItems); // Rollback UI
      toast.error("Network error: Item scan not saved. Please scan again.");
      
      // Immediate reset on failure
      processingRef.current = false;
      setIsProcessing(false);
    } finally {
      // Only delay reset if we are still processing (success path)
      if (processingRef.current) {
        setTimeout(() => {
          processingRef.current = false;
          setIsProcessing(false);
        }, 1500);
      }
    }
  };

  // 3. Stats & Progress
  const totalRequired = useMemo(() => items.reduce((acc, i) => acc + i.required_quantity, 0), [items]);
  const totalScanned = useMemo(() => items.reduce((acc, i) => acc + i.scanned_quantity, 0), [items]);
  const progressPercent = Math.min(100, totalRequired > 0 ? (totalScanned / totalRequired) * 100 : 0);
  const isOrderComplete = totalScanned >= totalRequired && totalRequired > 0;

  // 4. Order Completion Logic
  const handleCompleteOrder = async () => {
    if (!isOrderComplete) return;

    setIsCompleting(true);
    try {
      // Execute atomic transaction
      await orderRepository.completeOrderTransaction(orderId);

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

  if (order?.status === 'Fulfilled') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-bg-elevated rounded-lg border border-brand-border text-center space-y-4 mt-8">
        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Order Completed</h2>
        <p className="text-text-secondary">
          This order was fulfilled and stock has already been deducted.
        </p>
        <Button onClick={onClose} variant="primary">
          Return to Orders
        </Button>
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
                    {item.item_name || 'Unknown Item'}
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
