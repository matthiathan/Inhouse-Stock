import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const useScanner = (
  elementId: string,
  onScanSuccess: (decodedText: string) => void,
  config = { fps: 10, qrbox: { width: 250, height: 250 } }
) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scannerInstance = new Html5QrcodeScanner(elementId, config, false);
    scannerRef.current = scannerInstance;

    scannerInstance.render(
      (decodedText) => {
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        if (errorMessage && !errorMessage.includes('NotFoundException')) {
          console.warn(errorMessage);
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error('Failed to clear scanner:', err));
        scannerRef.current = null;
      }
    };
  }, [elementId, onScanSuccess]);
};
