import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { useOrdersWithItems } from '../features/orders/hooks';
import ActiveFulfillment from '../components/ActiveFulfillment';
import { Package, Truck, ArrowRight, Clock } from 'lucide-react';

export function OrderFulfillmentPage() {
  const { role } = useAuth();
  
  const { data: dbData, isLoading: loadingOrders } = useOrdersWithItems();
  const allOrders = dbData?.orders || [];
  
  const filteredOrders = allOrders.filter(o => o.status === 'Pending');

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  if (loadingOrders) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-bg-base min-h-screen">
        <Package className="w-10 h-10 animate-bounce text-brand-gold" />
        <p className="mt-4 text-text-secondary font-black uppercase tracking-widest text-[10px]">Syncing Orders...</p>
      </div>
    );
  }

  if (activeOrder) {
    return (
      <ActiveFulfillment 
        orderId={activeOrder.id} 
        onClose={() => setActiveOrder(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg-base/50 pb-20">
      <header className="bg-bg-elevated border-b border-brand-border p-6 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight leading-none">Warehouse</h1>
            <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest mt-1">Pick & Pack Queue</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
            Pending Shipments ({filteredOrders.length})
          </h2>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center bg-bg-elevated rounded-3xl border-2 border-dashed border-brand-border flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-bg-base text-text-secondary rounded-full flex items-center justify-center mb-2">
              <Truck size={32} />
            </div>
            <p className="text-sm font-bold text-text-secondary">All caught up!</p>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-widest">No pending orders found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map(o => (
              <div 
                key={o.id} 
                className="bg-bg-elevated p-5 rounded-3xl border border-brand-border shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-lg text-text-primary tracking-tight">{o.order_number}</h3>
                    <p className="text-[11px] font-bold text-text-secondary flex items-center gap-1 mt-1">
                      <Clock size={12} /> Scheduled: {new Date(o.delivery_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="bg-brand-gold/10 text-brand-gold px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    Ready
                  </span>
                </div>

                <div className="pt-4 border-t border-brand-border">
                  <button 
                    onClick={() => setActiveOrder(o)} 
                    className="w-full h-14 bg-brand-gold text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                  >
                    Start Picking Module <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

