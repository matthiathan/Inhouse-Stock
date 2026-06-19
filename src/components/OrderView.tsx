import React from 'react';
import { useAuth } from '../hooks/useAuth';
import ActiveFulfillment from './ActiveFulfillment';
import { ManagementTable } from './ManagementTable';

interface OrderViewProps {
  order: any;
  onClose: () => void;
}

export const OrderView: React.FC<OrderViewProps> = ({ order, onClose }) => {
  const { role } = useAuth();
  
  return (
    <div className="flex flex-col gap-4">
      {/* Conditionally render UI based on role */}
      {role === 'warehouse' ? (
        <ActiveFulfillment orderId={order.id} onClose={onClose} />
      ) : (
        <ManagementTable items={order.order_items || []} />
      )}
    </div>
  );
};
