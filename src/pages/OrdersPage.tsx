import { getNextOrderNumber, getAvailableStock } from '../api/assetApi';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema, CreateOrderSchema } from '../lib/schemas';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { Order, OrderItem } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle2, AlertCircle, Plus, Camera, Loader2 } from 'lucide-react';
import { 
  useOrdersWithItems, 
  useCreateOrder, 
  useUpdateFulfillItem, 
  useCompleteOrder 
} from '../features/orders/hooks';

export function OrdersPage() {
  const { role } = useAuth();
  
  // React Query Hooks
  const { data: dbData, isLoading: loadingOrders } = useOrdersWithItems();
  const orders = dbData?.orders || [];
  const orderItems = dbData?.orderItems || [];

  const createOrderMutation = useCreateOrder();
  const updateFulfillItemMutation = useUpdateFulfillItem();
  const completeOrderMutation = useCompleteOrder();

  // For creation form
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<any>({
    resolver: zodResolver(createOrderSchema),
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
  const lineItems = watch('lineItems');

  const handleFormSubmit: SubmitHandler<CreateOrderSchema> = async (data) => {
     await createOrder(data);
  };

  // Fulfillment scanner
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [totalScannedCount, setTotalScannedCount] = useState(0);
  const [lastScannedResult, setLastScannedResult] = useState<{barcode: string, success: boolean, message: string} | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFetchingStock, setIsFetchingStock] = useState(false);
  
  // Use a ref to hold scanner instance
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const fulfillItemRef = useRef(fulfillItem);
  useEffect(() => {
    fulfillItemRef.current = fulfillItem;
  });

  const stableFulfillItem = useCallback((barcode: string) => {
    fulfillItemRef.current(barcode);
  }, []);

  useEffect(() => {
    if (isScannerOpen && activeOrder) {
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
      scannerRef.current = scanner;
      scanner.render(stableFulfillItem, (err) => {
          if (err.includes("NotFoundException") || err.includes("No MultiFormat Readers")) return;
          console.warn(err);
      });
      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
          scannerRef.current = null;
        }
      };
    }
  }, [isScannerOpen, activeOrder, stableFulfillItem]);

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

  const createOrder = async (data: CreateOrderSchema) => {
    if (!['admin', 'ops_manager'].includes(role || '')) return;

    // Convert line items to barcodes/required quantities
    const items = data.lineItems.map(item => {
      const stockItem = availableStockData.find(s => String(s.id) === String(item.stockId));
      return {
        barcode: stockItem?.barcode || '',
        item_name: stockItem?.item_name || 'Unknown Item',
        requiredQty: item.requiredQty
      };
    }).filter(i => !!i.barcode);

    createOrderMutation.mutate({
      orderNumber: data.orderNumber,
      deliveryDate: data.deliveryDate,
      items
    }, {
      onSuccess: () => {
        toast.success("Order created");
        setIsCreateModalOpen(false);
        reset(); // reset form
      },
      onError: (err: any) => {
        toast.error("Failed to create order: " + err.message);
      }
    });
  };

  async function fulfillItem(barcode: string) {
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

    updateFulfillItemMutation.mutate({
        id: item.id,
        scannedQuantity: newScanned,
        isFulfilled
    }, {
        onSuccess: () => {
            setLastScannedResult({barcode, success: true, message: "Item scanned successfully"});
            setTotalScannedCount(prev => prev + 1);
            toast.success("Item scanned");
            setIsProcessing(false);
        },
        onError: (err: any) => {
            setLastScannedResult({barcode, success: false, message: "Error scanning: " + err.message});
            toast.error("Failed to fulfill item: " + err.message);
            setIsProcessing(false);
        }
    });
  };

  const completeOrder = async () => {
    if (!activeOrder) return;
    
    if (!window.confirm("Are you sure you want to complete this order? (Partial shortages will be logged)")) return;
    
    completeOrderMutation.mutate(activeOrder.id, {
        onSuccess: () => {
            toast.success("Order completed atomically!");
            setIsScannerOpen(false);
        },
        onError: (error: any) => {
            toast.error("Failed to complete order: " + error.message);
        }
    });
  };

  const isAllFulfilled = activeOrder && orderItems.filter(i => i.order_id === activeOrder.id).every(i => i.is_fulfilled);

  if (loadingOrders) return <div>Loading...</div>;

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
             <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                        <input type="text" {...register('orderNumber')} readOnly className="p-2 border border-brand-border rounded bg-bg-base/50 text-text-secondary" />
                        <input type="date" {...register('deliveryDate')} className="p-2 border border-brand-border rounded bg-bg-base w-full" required />
                        
                        {fields.map((field, index) => {
                            const stockId = lineItems[index]?.stockId;
                            const stockItem = availableStockData.find(s => String(s.id) === String(stockId));
                            const maxAvailable = stockItem?.total_available_units || 0;
                            
                            return (
                                <div key={field.id} className="flex flex-col gap-1">
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <select {...register(`lineItems.${index}.stockId`)} className="p-2 border border-brand-border rounded bg-bg-base flex-1">
                                            <option value="">Select Item</option>
                                            {availableStockData.map(s => <option key={s.id} value={s.id}>{s.barcode} {s.item_name} (Available: {s.total_available_units})</option>)}
                                        </select>
                                        <input 
                                          type="number" 
                                          {...register(`lineItems.${index}.requiredQty`, {
                                              max: { value: maxAvailable, message: `Max available: ${maxAvailable}` }
                                          })}
                                          min="1"
                                          placeholder="Qty"
                                          className="p-2 border border-brand-border rounded bg-bg-base w-24" 
                                        />
                                        <button type="button" onClick={() => remove(index)} className="text-red-500">🗑️</button>
                                    </div>
                                    {errors.lineItems?.[index]?.requiredQty && (
                                        <p className="text-red-500 text-xs">{errors.lineItems?.[index]?.requiredQty?.message}</p>
                                    )}
                                </div>
                            );
                        })}
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
           <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
