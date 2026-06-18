import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Order, OrderItem } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getAvailableStock, deductStockQuantity } from '../api/assetApi';
import { 
  useOrdersWithItems,
  useUpdateFulfillItem,
  useUpdateOrderStatus
} from '../features/orders/hooks';

export function OrderFulfillmentPage() {
  const { role } = useAuth();
  
  // React Query Hooks
  const { data: dbData, isLoading: loadingOrders } = useOrdersWithItems();
  const allOrders = dbData?.orders || [];
  const orderItems = dbData?.orderItems || [];
  
  // Clean filter only "Pending" orders in client or service
  const orders = allOrders.filter(o => o.status === 'Pending');

  const updateFulfillItemMutation = useUpdateFulfillItem();
  const updateOrderStatusMutation = useUpdateOrderStatus();

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [totalScannedCount, setTotalScannedCount] = useState(0);
  const [lastScannedResult, setLastScannedResult] = useState<{barcode: string, success: boolean, message: string} | null>(null);
  const [availableStockData, setAvailableStockData] = useState<any[]>([]);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    const stock = await getAvailableStock();
    setAvailableStockData(stock || []);
  };

  const fulfillItem = async (barcode: string) => {
    if (!activeOrder) return;
    
    // Logic for scanning item
    const item = orderItems.find(i => i.order_id === activeOrder.id && i.stock_barcode === barcode && !i.is_fulfilled);
    
    if (!item) {
        setLastScannedResult({barcode, success: false, message: "Item not found or already fulfilled"});
        toast.error("Scanned item not found in order or already fulfilled");
        return;
    }

    const newScanned = item.scanned_quantity + 1;
    const isFulfilled = newScanned >= item.required_quantity;

    updateFulfillItemMutation.mutate({
        id: item.id,
        scannedQuantity: newScanned,
        isFulfilled
    }, {
        onSuccess: () => {
            setLastScannedResult({barcode, success: true, message: "Item scanned successfully"});
            setTotalScannedCount(prev => prev + 1);
            toast.success("Item scanned");
            try { new Audio('/success.mp3').play(); } catch(e) {}
        },
        onError: (err: any) => {
            setLastScannedResult({barcode, success: false, message: "Error scanned barcode: " + err.message});
            toast.error("Failed to fulfill item");
        }
    });
  };

  const completeOrder = async () => {
    if (!activeOrder) return;
    
    if (!window.confirm("Are you sure you want to complete this order? (Partial shortages will be logged)")) return;
    
    const itemsToProcess = orderItems.filter(i => i.order_id === activeOrder.id);
    
    for (const item of itemsToProcess) {
        if (item.scanned_quantity > 0) {
            await deductStockQuantity(item.stock_barcode, item.scanned_quantity);
        }
    }
    
    updateOrderStatusMutation.mutate({
        id: activeOrder.id,
        status: 'Completed'
    }, {
        onSuccess: () => {
            toast.success("Order completed with processed stock deductions!");
            setIsScannerOpen(false);
            setActiveOrder(null);
        },
        onError: (err: any) => {
            toast.error("Failed to update order status: " + err.message);
        }
    });
  };

  if (loadingOrders) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Order Fulfillment</h1>

      <section className="bg-bg-elevated p-4 sm:p-6 rounded-xl border border-brand-border">
        <h2 className="text-base sm:text-lg font-bold text-text-primary mb-4">Pending Orders</h2>
        <div className="space-y-2">
            {orders.map(o => (
                <div key={o.id} className="flex justify-between items-center p-3 border border-brand-border rounded">
                    <span className="text-sm sm:text-base">{o.order_number} - {o.delivery_date}</span>
                    <button onClick={() => { setActiveOrder(o); setIsScannerOpen(true); }} className="bg-brand-gold text-white px-3 py-1 rounded text-xs sm:text-sm">Fulfill</button>
                </div>
            ))}
        </div>
      </section>

      {isScannerOpen && activeOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-50">
           <div className="bg-bg-elevated p-4 sm:p-6 rounded-xl border border-brand-border w-full max-w-lg max-h-[90vh] flex flex-col">
                <h2 className="text-lg font-bold mb-4 shrink-0">Fulfill: {activeOrder.order_number}</h2>
                
                <div id="qr-reader" className="w-full shrink-0"></div>
                 <button onClick={() => {
                    setLastScannedResult(null);
                    setTotalScannedCount(0);
                    const scanner = new Html5QrcodeScanner("qr-reader", {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        videoConstraints: {
                            facingMode: { exact: "environment" },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            focusMode: "continuous"
                        } as any
                    }, false);
                    scanner.render(fulfillItem, (err) => {
                        if (err.includes("NotFoundException") || err.includes("No MultiFormat Readers")) return;
                        console.warn(err);
                    });
                }} className="w-full mt-2 bg-brand-gold py-2 rounded text-white font-semibold shrink-0">Start Scanner</button>
                
                {lastScannedResult && (
                    <div className={`mt-2 p-3 rounded text-sm shrink-0 ${lastScannedResult.success ? 'bg-emerald-900/20 text-emerald-500' : 'bg-red-900/20 text-red-500'}`}>
                        {lastScannedResult.success ? <CheckCircle2 size={16} className="inline mr-2" /> : <AlertCircle size={16} className="inline mr-2" />}
                        {lastScannedResult.message} ({lastScannedResult.barcode})
                    </div>
                )}
                
                <div className="mt-2 font-bold text-xs text-text-secondary shrink-0">Items scanned this session: {totalScannedCount}</div>
                
                <div className="mt-4 space-y-2 overflow-y-auto flex-grow">
                    {orderItems.filter(i => i.order_id === activeOrder.id).map(i => {
                        const stockItem = availableStockData.find(s => String(s.barcode) === String(i.stock_barcode));
                        return (
                            <div key={i.id} className={`p-3 rounded border flex items-center justify-between ${i.is_fulfilled ? 'bg-emerald-900/20 border-emerald-900' : 'bg-bg-base border-brand-border'}`}>
                                <div className="flex items-center gap-3">
                                    {stockItem?.image_url && (
                                        <img src={stockItem.image_url} alt={i.stock_barcode} className="w-12 h-12 rounded object-cover" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{i.stock_barcode}</span>
                                        <span className="text-xs text-text-secondary">{i.scanned_quantity} / {i.required_quantity} picked</span>
                                    </div>
                                </div>
                                {i.is_fulfilled ? <CheckCircle2 className="text-emerald-500" size={20} /> : <div className="w-5 h-5 rounded-full border border-brand-border"></div>}
                            </div>
                        );
                    })}
                </div>
                
                <button 
                  onClick={completeOrder}
                  className="w-full mt-4 bg-emerald-600 py-2 rounded text-white font-semibold shrink-0"
                >
                    Complete Order
                </button>
                <button onClick={() => setIsScannerOpen(false)} className="w-full mt-2 text-text-secondary text-sm shrink-0">Close</button>
           </div>
        </div>
      )}
    </div>
  );
}
