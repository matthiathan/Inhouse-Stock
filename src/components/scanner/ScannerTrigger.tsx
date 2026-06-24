import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AssetScannerModal } from './AssetScannerModal';
import { ScannerErrorBoundary } from './ScannerErrorBoundary';

export const ScannerTrigger: React.FC = () => {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannerSessionKey, setScannerSessionKey] = useState(0);

  const isAuthorized = role ? ['admin', 'warehouse', 'ops', 'ops_manager'].includes(role) : false;

  const resetScanner = () => {
    setIsModalOpen(false);
    setScannerSessionKey(key => key + 1);
  };

  const openScanner = () => {
    setScannerSessionKey(key => key + 1);
    setIsModalOpen(true);
  };

  if (!isAuthorized) return null;

  return (
    <>
      <button
        onClick={openScanner}
        aria-label="Scan asset"
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold text-white shadow-elevated transition-all hover:bg-dallmayr-gold-dark md:bottom-6 md:right-6 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-3"
      >
        <QrCode size={20} />
        <span className="hidden font-semibold md:inline">Scan Asset</span>
      </button>

      <ScannerErrorBoundary onReset={resetScanner}>
        <AssetScannerModal
          key={scannerSessionKey}
          isOpen={isModalOpen}
          onClose={resetScanner}
        />
      </ScannerErrorBoundary>
    </>
  );
};
