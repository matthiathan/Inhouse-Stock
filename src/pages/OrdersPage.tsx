import { getNextOrderNumber, getAvailableStock, deductStockQuantity } from '../api/assetApi';
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema, CreateOrderSchema } from '../lib/schemas';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Order, OrderItem } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle2, AlertCircle, Plus, Camera, Loader2 } from 'lucide-react';

export function OrdersPage() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // For creation form
  const { register, handleSubmit, control, reset, setValue, watch } = useForm<CreateOrderSchema>({
    defaultValues: {
        orderNumber: '',
        deliveryDate: '',
        lineItems: [{stockId: '', requiredQty: 1}]
    }
  });
  const { fields, append, remove } = useFieldArray({
      control,
      name: "lineItems"
  });
  const [availableStockData, setAvailableStockData] = useState<any[]>([]);

  const handleFormSubmit = async (data: any) => {
     const result = createOrderSchema.safeParse(data);
     if (!result.success) {
         toast.error("Validation failed");
         return;
     }
     await createOrder(result.data);
  };

  // Fulfillment scanner
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [totalScannedCount, setTotalScannedCount] = useState(0);
  const [lastScannedResult, setLastScannedResult] = useState<{barcode: string, success: boolean, message: string} | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFetchingStock, setIsFetchingStock] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const openCreateModal = async () => {
    setIsFetchingStock(true);
    const nextNum = await getNextOrderNumber();
    const stock = await getAvailableStock();
    if (!stock || stock.length === 0) {
        toast.error("No stock data available to create order");
        setIsFetchingStock(false);
        return;
    }
    setValue('orderNumber', nextNum);
    setAvailableStockData(stock);
    setIsFetchingStock(false);
    setIsCreateModalOpen(true);
  }

  const fetchOrders = async () => {
    setLoading(true);
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: oi } = await supabase.from('order_items').select('*');
    if (o) setOrders(o);
    if (oi) setOrderItems(oi);
    setLoading(false);
  };

  const addLineItem = () => {
    // setLineItems([...lineItems, {stockId: '', barcode: '', itemName: '', requiredQty: 0, maxAvailable: 0}]);
  };

  const updateLineItem = (index: number, stockId: string) => {
    // const stockItem = availableStockData.find(i => String(i.id) === String(stockId));
    // if (stockItem) {
    //     const newLineItems = [...lineItems];
    //     newLineItems[index] = {
    //         stockId: stockItem.id,
    //         barcode: stockItem.barcode,
    //         itemName: stockItem.item_name || 'Unknown Item',
    //         requiredQty: 1, // Default to 1
    //         maxAvailable: stockItem.total_available_units
    //     };
    //     setLineItems(newLineItems);
    // }
  };

  const updateLineItemQty = (index: number, qty: number) => {
    // const newLineItems = [...lineItems];
    // const max = newLineItems[index].maxAvailable;
    
    // if (qty > max) {
    //     toast.error("Not enough stock");
    //     qty = max;
    // }
    
    // newLineItems[index].requiredQty = qty;
    
    // setLineItems(newLineItems);
  }

  const createOrder = async (data: CreateOrderSchema) => {
    if (!['admin', 'ops_manager'].includes(role || '')) return;
    
    // 1. Create order
    const { data: order, error } = await supabase.from('orders').insert({
        order_number: data.orderNumber,
        delivery_date: data.deliveryDate,
        status: 'Pending'
    }).select().single();

    if (error) { toast.error("Failed to create order"); return; }

    // 2. Insert items
    for (const item of data.lineItems) {
        const stockItem = availableStockData.find(s => String(s.id) === String(item.stockId));
        
        await supabase.from('order_items').insert({
            order_id: order.id,
            stock_barcode: stockItem?.barcode,
            required_quantity: item.requiredQty,
            scanned_quantity: 0,
            is_fulfilled: false
        });
    }

    toast.success("Order created");
    setIsCreateModalOpen(false);
    reset(); // reset form
    fetchOrders();
  };

  const fulfillItem = async (barcode: string) => {
    if (!activeOrder || isProcessing) return;
    
    setIsProcessing(true);
    const item = orderItems.find(i => i.order_id === activeOrder.id && i.stock_barcode === barcode && !i.is_fulfilled);
    
    if (!item) {
        setLastScannedResult({barcode, success: false, message: "Item not found or already fulfilled"});
        toast.error("Scanned item not found in order or already fulfilled");
        setIsProcessing(false);
        return;
    }

    const newScanned = item.scanned_quantity + 1;
    const isFulfilled = newScanned >= item.required_quantity;

    await supabase.from('order_items').update({
        scanned_quantity: newScanned,
        is_fulfilled: isFulfilled
    }).eq('id', item.id);

    setLastScannedResult({barcode, success: true, message: "Item scanned successfully"});
    setTotalScannedCount(prev => prev + 1);
    toast.success("Item scanned");
    fetchOrders();
    setIsProcessing(false);
  };

  const completeOrder = async () => {
    if (!activeOrder) return;
    
    if (!window.confirm("Are you sure you want to complete this order? (Partial shortages will be logged)")) return;
    
    // Deduct stock for all items based on what was *actually* scanned
    const itemsToProcess = orderItems.filter(i => i.order_id === activeOrder.id);
    
    for (const item of itemsToProcess) {
        if (item.scanned_quantity < item.required_quantity) {
            toast.warning(`Shortage detected for ${item.stock_barcode}: Required ${item.required_quantity}, Scanned ${item.scanned_quantity}`);
        }
        
        if (item.scanned_quantity > 0) {
            await deductStockQuantity(item.stock_barcode, item.scanned_quantity);
        }
    }
    
    // Update order
    await supabase.from('orders').update({
        status: 'Completed',
        completed_at: new Date().toISOString()
    }).eq('id', activeOrder.id);

    toast.success("Order completed with processed stock deductions!");
    setIsScannerOpen(false);
    fetchOrders();
  };

  const isAllFulfilled = activeOrder && orderItems.filter(i => i.order_id === activeOrder.id).every(i => i.is_fulfilled);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">Order Management</h1>

        <section className="bg-bg-elevated p-6 rounded-xl border border-brand-border">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-text-primary">Active Orders</h2>
              {['admin', 'ops_manager'].includes(role || '') && (
                  <button onClick={openCreateModal} className="bg-brand-gold text-white px-4 py-2 rounded flex items-center gap-2">
                {isFetchingStock && <Loader2 className="animate-spin" size={16} />}
                Create Order
              </button>
              )}
          </div>
        </section>

        {isCreateModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
             <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-lg">
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                        <input type="text" {...register('orderNumber')} readOnly className="p-2 border border-brand-border rounded bg-bg-base/50 text-text-secondary" />
                        <input type="date" {...register('deliveryDate')} className="p-2 border border-brand-border rounded bg-bg-base w-full" required />
                        
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-center flex-wrap">
                                <select {...register(`lineItems.${index}.stockId`)} className="p-2 border border-brand-border rounded bg-bg-base flex-1">
                                    <option value="">Select Item</option>
                                    {availableStockData.map(s => <option key={s.id} value={s.id}>{s.barcode} {s.item_name} (Available: {s.total_available_units})</option>)}
                                </select>
                                <input 
                                  type="number" 
                                  {...register(`lineItems.${index}.requiredQty`, {valueAsNumber: true})}
                                  min="1"
                                  placeholder="Qty"
                                  className="p-2 border border-brand-border rounded bg-bg-base w-24" 
                                />
                                <button type="button" onClick={() => remove(index)} className="text-red-500">🗑️</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => append({stockId: '', requiredQty: 1})} className="text-brand-gold text-sm">+ Add Product</button>
                        <button type="submit" className="bg-brand-gold text-white px-4 py-2 rounded w-full">Create Order</button>
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="w-full text-text-secondary">Cancel</button>
                    </form>
             </div>
            </div>
        )}

      <section className="bg-bg-elevated p-6 rounded-xl border border-brand-border">
        <h2 className="text-lg font-bold text-text-primary mb-4">Active Orders</h2>
        <div className="space-y-2">
            {orders.filter(o => o.status === 'Pending').map(o => (
                <div key={o.id} className="flex justify-between items-center p-3 border border-brand-border rounded">
                    <span>{o.order_number} - {o.delivery_date}</span>
                    {role === 'warehouse' && (
                        <button onClick={() => { setActiveOrder(o); setIsScannerOpen(true); }} className="bg-brand-gold text-white px-3 py-1 rounded text-xs">Fulfill</button>
                    )}
                </div>
            ))}
        </div>
      </section>

      {isScannerOpen && activeOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
           <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-lg">
                <h2 className="text-lg font-bold mb-4">Fulfill: {activeOrder.order_number}</h2>
                
                {/* Progress Tracking */}
                {(() => {
                    const items = orderItems.filter(i => i.order_id === activeOrder.id);
                    const totalQty = items.reduce((s, i) => s + i.required_quantity, 0);
                    const scannedQty = items.reduce((s, i) => s + i.scanned_quantity, 0);
                    const progress = Math.round((scannedQty / totalQty) * 100);
                    return (
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-text-secondary mb-1">
                                <span>Progress</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-bg-base h-2 rounded-full overflow-hidden">
                                <div className="bg-brand-gold h-full transition-all" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    );
                })()}

                <div id="qr-reader" className="w-full"></div>
                 <button onClick={() => {
                    setLastScannedResult(null); // Clear previous
                    setTotalScannedCount(0); // Reset counter
                    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
                    scanner.render(fulfillItem, (err) => {
                        if (err.includes("NotFoundException") || err.includes("No MultiFormat Readers")) return;
                        console.warn(err);
                    });
                }} className="w-full mt-4 bg-brand-gold py-2 rounded text-white font-semibold">Start Scanner</button>
                
                {lastScannedResult && (
                    <div className={`mt-2 p-3 rounded text-sm ${lastScannedResult.success ? 'bg-emerald-900/20 text-emerald-500' : 'bg-red-900/20 text-red-500'}`}>
                        {lastScannedResult.success ? <CheckCircle2 size={16} className="inline mr-2" /> : <AlertCircle size={16} className="inline mr-2" />}
                        {lastScannedResult.message} ({lastScannedResult.barcode})
                    </div>
                )}
                
                <div className="mt-2 font-bold text-xs text-text-secondary">Items scanned this session: {totalScannedCount}</div>
                
                <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
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
                  className={`w-full mt-4 py-2 rounded text-white font-semibold ${isAllFulfilled ? 'bg-emerald-600' : 'bg-amber-600'}`}
                >
                    {isAllFulfilled ? 'Complete Order' : 'Dispatch Partial Order'}
                </button>
                <button onClick={() => setIsScannerOpen(false)} className="w-full mt-2 text-text-secondary text-sm">Close</button>
           </div>
        </div>
      )}
    </div>
  );
}
