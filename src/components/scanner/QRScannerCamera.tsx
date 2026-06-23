import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerCameraProps {
  onScanSuccess: (decodedText: string) => void;
}

export const QRScannerCamera: React.FC<QRScannerCameraProps> = ({ onScanSuccess }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Initialize the scanner
    const qrboxWidth = Math.min(window.innerWidth * 0.8, 250);
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: qrboxWidth, height: qrboxWidth } },
      false
    );

    scanner.render(
      (decodedText: string) => {
        // Success handler
        if (scannerRef.current) {
          try {
            // Pause the scanner to prevent double scans
            scannerRef.current.pause();
          } catch (e) {
            console.error("Error pausing scanner", e);
          }
        }
        navigator.vibrate(200);
        onScanSuccess(decodedText);
      },
      (errorMessage: string) => {
        // Optional: Error handler
        // console.warn(errorMessage);
      }
    );

    scannerRef.current = scanner;

    // Cleanup when component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [onScanSuccess]);

  return <div id="qr-reader" className="w-full"></div>;
};
