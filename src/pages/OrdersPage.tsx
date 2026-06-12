import { getNextOrderNumber, getAvailableStock, deductStockQuantity } from '../api/assetApi';
import React, { useState, useEffect } from 'react';
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
  const [newOrderNum, setNewOrderNum] = useState('');
  const [newDelDate, setNewDelDate] = useState('');
  const [availableStockData, setAvailableStockData] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<{stockId: string, barcode: string, itemName: string, requiredQty: number, maxAvailable: number, warning?: string}[]>([]);

  // Fulfillment scanner
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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
    setNewOrderNum(nextNum);
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
    setLineItems([...lineItems, {stockId: '', barcode: '', itemName: '', requiredQty: 0, maxAvailable: 0}]);
  };

  const updateLineItem = (index: number, stockId: string) => {
    const stockItem = availableStockData.find(i => String(i.id) === String(stockId));
    if (stockItem) {
        const newLineItems = [...lineItems];
        newLineItems[index] = {
            stockId: stockItem.id,
            barcode: stockItem.barcode,
            itemName: stockItem.item_name || 'Unknown Item',
            requiredQty: 1, // Default to 1
            maxAvailable: stockItem.total_available_units
        };
        setLineItems(newLineItems);
    }
  };

  const updateLineItemQty = (index: number, qty: number) => {
    const newLineItems = [...lineItems];
    const max = newLineItems[index].maxAvailable;
    
    if (qty > max) {
        toast.error("Not enough stock");
        qty = max;
    }
    
    newLineItems[index].requiredQty = qty;
    
    setLineItems(newLineItems);
  }

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!['admin', 'ops_manager'].includes(role || '')) return;
    if (lineItems.length === 0) {
        toast.error("Please add items");
        return;
    }
    if (lineItems.some(i => i.requiredQty <= 0)) {
        toast.error("Quantities must be greater than 0.");
        return;
    }
    if (lineItems.some(i => i.requiredQty > i.maxAvailable)) {
        toast.error("Requested quantity exceeds available stock.");
        return;
    }
    
    // 1. Create order
    const { data: order, error } = await supabase.from('orders').insert({
        order_number: newOrderNum,
        delivery_date: newDelDate,
        status: 'Pending'
    }).select().single();

    if (error) { toast.error("Failed to create order"); return; }

    // 2. Insert items
    for (const item of lineItems) {
        await supabase.from('order_items').insert({
            order_id: order.id,
            stock_barcode: item.barcode,
            required_quantity: item.requiredQty,
            scanned_quantity: 0,
            is_fulfilled: false
        });
    }

    toast.success("Order created");
    setIsCreateModalOpen(false);
    setLineItems([]);
    fetchOrders();
  };

  const fulfillItem = async (barcode: string) => {
    if (!activeOrder || isProcessing) return;
    
    setIsProcessing(true);
    const item = orderItems.find(i => i.order_id === activeOrder.id && i.stock_barcode === barcode && !i.is_fulfilled);
    
    if (!item) {
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

    toast.success("Item scanned");
    fetchOrders();
    setIsProcessing(false);
  };

  const completeOrder = async () => {
    if (!activeOrder) return;
    
    if (!window.confirm("Are you sure you want to complete this order?")) return;
    
    // Update order
    await supabase.from('orders').update({
        status: 'Completed',
        completed_at: new Date().toISOString()
    }).eq('id', activeOrder.id);

    // Deduct stock for all items
    for (const item of orderItems.filter(i => i.order_id === activeOrder.id)) {
        await deductStockQuantity(item.stock_barcode, 0, 0, item.required_quantity);
    }

    toast.success("Order completed and stock deducted!");
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
                <form onSubmit={createOrder} className="space-y-4">
                    <input type="text" readOnly className="p-2 border border-brand-border rounded bg-bg-base/50 text-text-secondary" value={newOrderNum} />
                    <input type="date" className="p-2 border border-brand-border rounded bg-bg-base w-full" value={newDelDate} onChange={e=>setNewDelDate(e.target.value)} required />
                    
                    {lineItems.map((item, index) => (
                        <div key={index} className="flex gap-2 items-center flex-wrap">
                            <select value={item.stockId} className="p-2 border border-brand-border rounded bg-bg-base flex-1" onChange={(e) => updateLineItem(index, e.target.value)}>
                                <option value="">Select Item</option>
                                {availableStockData.map(s => <option key={s.id} value={s.id}>{s.barcode} {s.item_name} (Available: {s.total_available_units})</option>)}
                            </select>
                            <input 
                              type="number" 
                              min="1"
                              max={item.maxAvailable > 0 ? item.maxAvailable : 1}
                              value={item.requiredQty}
                              className={`p-2 border border-brand-border rounded bg-bg-base w-24 ${item.maxAvailable === 0 ? 'opacity-50' : ''}`} 
                              placeholder="Qty" 
                              onChange={(e) => updateLineItemQty(index, parseInt(e.target.value) || 0)} 
                            />
                            <button type="button" onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))} className="text-red-500">🗑️</button>
                            {item.warning && <div className="text-xs text-red-500 w-full">{item.warning}</div>}
                        </div>
                    ))}
                    <button type="button" onClick={addLineItem} className="text-brand-gold text-sm">+ Add Product</button>
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
                <div id="qr-reader" className="w-full"></div>
                <button onClick={() => {
                    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
                    scanner.render(fulfillItem, (err) => {
                        if (err.includes("NotFoundException") || err.includes("No MultiFormat Readers")) return;
                        console.warn(err);
                    });
                }} className="w-full mt-4 bg-brand-gold py-2 rounded text-white">Start Scanner</button>
                <div className="mt-4 space-y-2">
                    {orderItems.filter(i => i.order_id === activeOrder.id).map(i => (
                        <div key={i.id} className={`p-2 rounded flex items-center justify-between ${i.is_fulfilled ? 'bg-emerald-900/20 text-emerald-500' : 'text-text-primary'}`}>
                            <span>{i.stock_barcode}: {i.scanned_quantity} / {i.required_quantity}</span>
                            {i.is_fulfilled && <CheckCircle2 size={16} />}
                        </div>
                    ))}
                </div>
                <button 
                  onClick={completeOrder}
                  disabled={!isAllFulfilled}
                  className="w-full mt-4 bg-emerald-600 disabled:opacity-50 py-2 rounded text-white"
                >Complete Order</button>
                <button onClick={() => setIsScannerOpen(false)} className="w-full mt-2 text-text-secondary">Close</button>
           </div>
        </div>
      )}
    </div>
  );
}
