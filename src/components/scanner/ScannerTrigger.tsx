import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AssetScannerModal } from './AssetScannerModal';

export const ScannerTrigger: React.FC = () => {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAuthorized = role ? ['admin', 'warehouse', 'ops', 'ops_manager'].includes(role) : false;

  if (!isAuthorized) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-brand-gold text-white font-semibold rounded-full shadow-lg hover:bg-yellow-600 transition-all z-40"
      >
        <QrCode size={20} />
        Scan Asset
      </button>

      <AssetScannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
