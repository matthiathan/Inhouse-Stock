import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const useScanner = (
  elementId: string,
  onScanSuccess: (decodedText: string) => void,
  config: any = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    // Force the back camera and high resolution, autofocus
    videoConstraints: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      advanced: [{ focusMode: "continuous" }]
    }
  },
  enabled: boolean = true,
  onScanError?: (errorMessage: string) => void
) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastVibrateRef = useRef<number>(0);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

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
              { facingMode: { exact: "environment" } },
              {
                ...configRef.current,
                videoConstraints: {
                  ...configRef.current.videoConstraints,
                  facingMode: { exact: "environment" },
                }
              },
              (decodedText) => {
                if (isMounted) onScanSuccessRef.current(decodedText);
              },
              (errorMessage) => {
                if (!isMounted) return;

                const isSilentError = !errorMessage || 
                  errorMessage.includes('NotFoundException') || 
                  errorMessage.includes('No MultiFormat Reader') || 
                  errorMessage.includes('No barcode format');

                if (!isSilentError) {
                  if (onScanErrorRef.current) {
                    onScanErrorRef.current(errorMessage);
                  }

                  if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    const now = Date.now();
                    if (now - lastVibrateRef.current > 1500) {
                      navigator.vibrate([100, 50, 100]);
                      lastVibrateRef.current = now;
                    }
                  }
                }
              }
            );

            // Check if torch is supported
            if (isMounted && scannerRef.current) {
               const track = scannerRef.current.getRunningTrackCameraCapabilities();
               if (track && track.torchFeature() && track.torchFeature().isSupported()) {
                  setTorchSupported(true);
               } else {
                 setTorchSupported(false);
               }
            }

          } catch (err) {
             // Fallback if exact environment is not available
             if (isMounted && scannerRef.current) {
               try {
                 await scannerRef.current.start(
                    { facingMode: "environment" },
                    configRef.current,
                    (decodedText) => { if (isMounted) onScanSuccessRef.current(decodedText); },
                    () => {}
                 );
               } catch (fallbackErr) {
                 console.error("Scanner failed to start on fallback:", fallbackErr);
               }
             }
          }
        };

        await startScanner();
      } catch (err) {
        console.error("Scanner initialization error:", err);
      }
    };

    initializeScanner();

    return () => {
      isMounted = false;
      const currentScanner = scannerRef.current;
      if (currentScanner) {
        scannerRef.current = null;
        if (currentScanner.isScanning) {
          currentScanner.stop()
            .then(() => {
              try { currentScanner.clear(); } catch (e) { }
            })
            .catch(() => {});
        } else {
          try { currentScanner.clear(); } catch (e) { }
        }
      }
    };
  }, [elementId, enabled]);

  const toggleTorch = useCallback(() => {
     if (scannerRef.current && scannerRef.current.isScanning && torchSupported) {
        setTorchOn(prev => {
           const newTorchState = !prev;
           scannerRef.current?.applyVideoConstraints({
               advanced: [{ torch: newTorchState } as any]
           }).catch(console.error);
           return newTorchState;
        });
     }
  }, [torchSupported]);

  return { toggleTorch, torchSupported, torchOn, scannerRef: scannerRef.current };
};

