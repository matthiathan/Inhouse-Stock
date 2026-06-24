import React, { useState } from 'react';
import { QRScannerCamera } from '../components/scanner/QRScannerCamera';
import { ScannedMachineProfile } from '../components/scanner/ScannedMachineProfile';
import { useMachineLookup } from '../hooks/useMachineLookup';

export const AssetScannedPage: React.FC = () => {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const { data: machineData, isLoading, error } = useMachineLookup(scannedCode);

  const handleScanSuccess = (code: string) => {
    setScannedCode(code);
  };

  const handleReset = () => {
    setScannedCode(null);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Scan Asset</h1>

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
  );
};
