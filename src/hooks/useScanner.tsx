import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const useScanner = (
  elementId: string,
  onScanSuccess: (decodedText: string) => void,
  config: any = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    // Force the back camera and high resolution
    videoConstraints: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  },
  enabled: boolean = true
) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    let isMounted = true;

    const initializeScanner = async () => {
      // Check if element exists before initializing to prevent "Element not found" errors
      const element = document.getElementById(elementId);
      if (!element) return;

      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(elementId);
        }

        const startScanner = async () => {
          if (!isMounted || !scannerRef.current) return;
          
          try {
            await scannerRef.current.start(
              { facingMode: config.videoConstraints?.facingMode || "environment" },
              config,
              (decodedText) => {
                if (isMounted) onScanSuccess(decodedText);
              },
              (errorMessage) => {
                // Ignore NotFound errors while searching
                if (errorMessage && !errorMessage.includes('NotFoundException')) {
                  // silent search
                }
              }
            );
          } catch (err) {
            console.error("Scanner failed to start:", err);
          }
        };

        await startScanner();
      } catch (err) {
        console.error("Scanner initialization error:", err);
      }
    };

    initializeScanner();

    // CRITICAL CLEANUP BLOCK
    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop()
            .then(() => {
              try {
                scannerRef.current?.clear();
              } catch (e) {
                console.warn("Clear error:", e);
              }
            })
            .catch((err) => {
              console.error("Failed to release camera hardware:", err);
            });
        }
      }
    };
  }, [elementId, onScanSuccess, enabled]); // Include enabled to re-trigger when interface opens
};
