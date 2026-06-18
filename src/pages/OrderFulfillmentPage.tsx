import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { 
  useOrdersWithItems
} from '../features/orders/hooks';
import ActiveFulfillment from '../components/ActiveFulfillment';

export function OrderFulfillmentPage() {
  const { role } = useAuth();
  
  // React Query Hooks
  const { data: dbData, isLoading: loadingOrders } = useOrdersWithItems();
  const allOrders = dbData?.orders || [];
  
  // Clean filter only "Pending" orders
  const orders = allOrders.filter(o => o.status === 'Pending');

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  if (loadingOrders) return <div className="p-8">Loading orders...</div>;

  // Render Active Fulfillment View if an order is selected
  if (activeOrder) {
    return (
      <ActiveFulfillment 
        orderId={activeOrder.id} 
        onClose={() => setActiveOrder(null)} 
      />
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Order Fulfillment</h1>
        <p className="text-text-secondary">Process and pick pending customer orders.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
          Pending Shipments ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="p-12 text-center bg-bg-elevated rounded-2xl border border-dashed border-brand-border">
            <p className="text-text-secondary">No pending orders to fulfill at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map(o => (
              <div 
                key={o.id} 
                className="flex justify-between items-center bg-bg-elevated p-4 rounded-xl border border-brand-border hover:shadow-md transition-shadow group"
              >
                <div>
                  <h3 className="font-bold text-text-primary uppercase tracking-tight">{o.order_number}</h3>
                  <p className="text-xs text-text-secondary">Scheduled for {o.delivery_date}</p>
                </div>
                <button 
                  onClick={() => setActiveOrder(o)} 
                  className="bg-brand-gold text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Start Picking
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

