import React from 'react';

interface Props {
  items: any[];
}

export const ManagementTable: React.FC<Props> = ({ items }) => {
  return (
    <div className="bg-bg-elevated p-6 rounded-xl border border-brand-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase mb-4">Order Items</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-gray-900/30 text-text-secondary">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3">Scanned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-800/10">
                <td className="px-4 py-3 font-medium">{item.item_name}</td>
                <td className="px-4 py-3">{item.required_quantity}</td>
                <td className="px-4 py-3">{item.scanned_quantity || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
