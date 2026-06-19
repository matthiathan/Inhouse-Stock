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
  enabled: boolean = true,
  onScanError?: (errorMessage: string) => void
) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastVibrateRef = useRef<number>(0);

  // Stabilize callbacks using ref pattern to avoid triggering effect runs when props change
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const onScanErrorRef = useRef(onScanError);
  useEffect(() => {
    onScanErrorRef.current = onScanError;
  }, [onScanError]);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

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
              { facingMode: configRef.current.videoConstraints?.facingMode || "environment" },
              configRef.current,
              (decodedText) => {
                if (isMounted) onScanSuccessRef.current(decodedText);
              },
              (errorMessage) => {
                if (!isMounted) return;

                // Handle scan failure elegantly
                // Filter out verbose NotFoundException and silent frames, focussing on genuine scanning errors
                const isSilentError = !errorMessage || 
                  errorMessage.includes('NotFoundException') || 
                  errorMessage.includes('No MultiFormat Reader') || 
                  errorMessage.includes('No barcode format');

                if (!isSilentError) {
                  if (onScanErrorRef.current) {
                    onScanErrorRef.current(errorMessage);
                  }

                  // Optimized haptic feedback on failed scans for mobile browser support
                  if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    const now = Date.now();
                    // Throttle the error vibration to every 1.5 seconds to prevent performance degradations
                    if (now - lastVibrateRef.current > 1500) {
                      navigator.vibrate([100, 50, 100]); // Distinct double tap haptic signal for error indication
                      lastVibrateRef.current = now;
                    }
                  }
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
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        // Clear reference to force recreation if enabled gets toggled again
        scannerRef.current = null;
        if (currentScanner.isScanning) {
          currentScanner.stop()
            .then(() => {
              try {
                currentScanner.clear();
              } catch (e) {
                console.warn("Clear error on unmount:", e);
              }
            })
            .catch((err) => {
              console.error("Failed to release camera hardware:", err);
            });
        } else {
          try {
            currentScanner.clear();
          } catch (e) {
            // ignore
          }
        }
      }
    };
  }, [elementId, enabled]); // Include enabled to re-trigger when interface opens
};
