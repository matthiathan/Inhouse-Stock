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
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Scan Asset</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 font-medium">
            Close
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        )}

        {!isLoading && machineData && (
          <div className="space-y-6">
            <ScannedMachineProfile machine={machineData} />
            <button
                onClick={handleReset}
                className="w-full px-5 py-3 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
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
                    className="w-full px-5 py-3 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Scan Another Asset
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
