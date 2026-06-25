import React, { useState, useEffect, useCallback } from 'react';
import { QRScannerCamera } from './QRScannerCamera';
import { ScannedMachineProfile } from './ScannedMachineProfile';
import { useMachineLookup } from '../../hooks/useMachineLookup';
import AssetForm from '../AssetForm';
import { normalizeScannedAssetCode } from '../../utils/qr';

interface AssetScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetScannerModal: React.FC<AssetScannerModalProps> = ({ isOpen, onClose }) => {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const { data: lookupResult, isLoading, error } = useMachineLookup(scannedCode);
  const [showForm, setShowForm] = useState(false);

  // Reset state when closed
  const resetScannerState = useCallback(() => {
    setScannedCode(null);
    setShowForm(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetScannerState();
    }
  }, [isOpen, resetScannerState]);

  if (!isOpen) return null;


  const handleScanSuccess = useCallback((code: string) => {
    setScannedCode(normalizeScannedAssetCode(code));
  }, []);

  const handleReset = () => {
    setScannedCode(null);
    setShowForm(false);
  };

  const machineData = lookupResult?.data;
  const isNotFound = lookupResult?.isNotFound;

  useEffect(() => {
    if (isNotFound) {
        setShowForm(true);
    }
  }, [isNotFound]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-bg-elevated rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-primary">
            {showForm ? 'Add New Machine' : 'Scan Asset'}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary font-medium">
            Close
          </button>
        </div>

        {showForm && (
            <AssetForm initialQrCode={scannedCode || ''} />
        )}

        {!showForm && isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary"></div>
          </div>
        )}

        {!showForm && !isLoading && machineData && (
          <div className="space-y-6">
            <ScannedMachineProfile machine={machineData} />
            <button
                onClick={handleReset}
                className="w-full px-5 py-3 bg-bg-base text-text-primary text-sm font-medium rounded-lg hover:bg-brand-border transition-colors"
            >
                Scan Another Asset
            </button>
          </div>
        )}

        {!showForm && !isLoading && isNotFound && scannedCode && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <p className="text-text-primary font-medium text-center">
                    QR Code <span className="font-bold">{scannedCode}</span> is not in the system.
                </p>
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full px-5 py-3 bg-brand-gold text-white text-sm font-bold rounded-lg transition-colors"
                >
                    Add New Machine
                </button>
                <button
                    onClick={handleReset}
                    className="w-full px-5 py-3 bg-bg-base text-text-primary text-sm font-medium rounded-lg hover:bg-brand-border transition-colors"
                >
                    Scan Different Code
                </button>
            </div>
        )}

        {!showForm && !isLoading && !machineData && !isNotFound && (
            <QRScannerCamera onScanSuccess={handleScanSuccess} />
        )}

        {error && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <p className="text-red-500 font-medium text-center">
                    {error instanceof Error ? error.message : 'Error scanning asset'}
                </p>
                <button
                    onClick={handleReset}
                    className="w-full px-5 py-3 bg-bg-base text-text-primary text-sm font-medium rounded-lg hover:bg-brand-border transition-colors"
                >
                    Scan Another Asset
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
