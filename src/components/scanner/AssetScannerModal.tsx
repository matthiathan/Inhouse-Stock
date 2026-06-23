import React, { useState, useEffect } from 'react';
import { QRScannerCamera } from './QRScannerCamera';
import { ScannedMachineProfile } from './ScannedMachineProfile';
import { useMachineLookup } from '../../hooks/useMachineLookup';

interface AssetScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetScannerModal: React.FC<AssetScannerModalProps> = ({ isOpen, onClose }) => {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const { data: machineData, isLoading, error } = useMachineLookup(scannedCode);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setScannedCode(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanSuccess = (code: string) => {
    setScannedCode(code);
  };

  const handleReset = () => {
    setScannedCode(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-bg-elevated rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-primary">Scan Asset</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary font-medium">
            Close
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary"></div>
          </div>
        )}

        {!isLoading && machineData && (
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

        {!isLoading && !machineData && (
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
