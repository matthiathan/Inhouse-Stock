import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ZapOff, RefreshCcw, Camera } from 'lucide-react';
import { useTorch } from '../hooks/useTorch';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function BarcodeScanner({ 
  onScan, 
  onClose, 
  title = "Scan Barcode", 
  description = "Center the code in the box" 
}: BarcodeScannerProps) {
  const [enabled, setEnabled] = useState(true);
  const [scannerKey, setScannerKey] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-container";
  
  // Track failures and active scanning time
  const [errorCount, setErrorCount] = useState(0);
  const [showRestartButton, setShowRestartButton] = useState(false);
  
  // Directly manage scanner lifecycle with a ref for useTorch compatibility
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const { torchOn, toggleTorch, isSupported, checkSupport, cleanupTorch } = useTorch(scannerInstanceRef);
  const lastVibrateRef = useRef<number>(0);

  // Stabilize callbacks using the mutable ref pattern to keep the effect dependency-free
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const checkSupportRef = useRef(checkSupport);
  useEffect(() => {
    checkSupportRef.current = checkSupport;
  }, [checkSupport]);

  // Handle manual reset of scanner
  const resetScanner = () => {
    setEnabled(false);
    setErrorCount(0);
    setShowRestartButton(false);
    setHasError(null);
    setIsInitializing(true);
    setScannerKey(prev => prev + 1);
    
    setTimeout(() => {
      setEnabled(true);
    }, 150);
  };

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    let scanTimeoutId: NodeJS.Timeout | null = null;

    const startScanner = async () => {
      // 1. Fake loading delay to hide hardware flash
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!isMounted) return;

      try {
        // Prevent starting if container element is unmounted
        if (!document.getElementById(containerId)) return;

        const scanner = new Html5Qrcode(containerId);
        scannerInstanceRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted) {
              // Vibrate on success if supported
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              onScanRef.current(decodedText);
            }
          },
          (errorMessage) => {
            if (!isMounted) return;

            // Handle scan failure with optimized haptic feedback
            const isSilentError = !errorMessage || 
              errorMessage.includes('NotFoundException') || 
              errorMessage.includes('No MultiFormat Reader') || 
              errorMessage.includes('No barcode format');

            if (!isSilentError) {
              setErrorCount(prev => {
                const nextVal = prev + 1;
                // Expose 'Restart Camera' button if scan errors exceed threshold (e.g. 5 errors)
                if (nextVal > 5) {
                  setShowRestartButton(true);
                }
                return nextVal;
              });

              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                const now = Date.now();
                // Throttle to once every 1.5s to prevent freezing or motor burnout on rapid frames
                if (now - lastVibrateRef.current > 1500) {
                  navigator.vibrate([100, 50, 100]); // Dual pulsation haptic feedback signal for a failed scan attempt
                  lastVibrateRef.current = now;
                }
              }
            }
          }
        );

        if (isMounted) {
          setIsInitializing(false);
          
          // Trigger a 5-second timeout to show the Restart button if no successful scan is made
          scanTimeoutId = setTimeout(() => {
            if (isMounted) {
              setShowRestartButton(true);
            }
          }, 5000);

          // Check if torch is supported after camera starts
          setTimeout(() => {
            if (isMounted) {
              checkSupportRef.current();
            }
          }, 1000);
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : String(err);
          setHasError(message || "Failed to start camera");
          setIsInitializing(false);
          setShowRestartButton(true);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scanTimeoutId) {
        clearTimeout(scanTimeoutId);
      }

      // Unmount cleanup: immediately turn off physical flash/torch if active to prevent hardware lock
      cleanupTorch();

      const currentScanner = scannerInstanceRef.current;
      if (currentScanner) {
        scannerInstanceRef.current = null; // Instantly nullify key ref
        if (currentScanner.isScanning) {
          currentScanner.stop()
            .then(() => {
              try {
                currentScanner.clear();
              } catch (e) {
                console.warn("Clear error on unmount:", e);
              }
            })
            .catch(err => console.error("Scanner cleanup error:", err));
        } else {
          try {
            currentScanner.clear();
          } catch (e) {
            // ignore
          }
        }
      }
    };
  }, [cleanupTorch, enabled]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-center"
    >
      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-[110]">
        <button 
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white backdrop-blur-xl border border-white/10 transition-colors cursor-pointer"
        >
          ✕
        </button>

        {isSupported && !isInitializing && (
          <button 
            onClick={toggleTorch}
            className={`p-3 rounded-full backdrop-blur-xl border border-white/10 transition-all cursor-pointer ${
              torchOn ? 'bg-brand-gold text-white shadow-[0_0_15px_rgba(255,184,0,0.4)]' : 'bg-white/10 text-white'
            }`}
          >
            {torchOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
          </button>
        )}
      </div>

      {/* Main Scanner Stage */}
      <div className="w-full max-w-sm aspect-square bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative border-4 border-brand-gold/20">
        <div id={containerId} key={scannerKey} className="w-full h-full" />
        
        {/* Loading / Error Overlays */}
        <AnimatePresence>
          {isInitializing && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center p-6 bg-black"
            >
              <RefreshCcw className="w-12 h-12 text-brand-gold animate-spin mb-4" />
              <p className="text-white font-bold">Waking up camera...</p>
            </motion.div>
          )}

          {hasError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-red-955 flex flex-col items-center justify-center p-6 text-white bg-black/90"
            >
              <Camera className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
              <p className="font-bold text-lg">Hardware Error</p>
              <p className="text-sm text-white/70 mt-2">{hasError}</p>
              <button 
                onClick={resetScanner}
                className="mt-6 bg-red-600 px-6 py-2 rounded-xl font-bold text-sm tracking-wider hover:bg-red-500 transition-colors cursor-pointer"
              >
                Restart Camera
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan Frame Overlay */}
        {!isInitializing && !hasError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-brand-gold/50 rounded-2xl relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-gold rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-gold rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-gold rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-gold rounded-br-lg" />
              
              {/* Scanning line animation */}
              <motion.div 
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-2 right-2 h-0.5 bg-brand-gold/50 shadow-[0_0_8px_rgba(255,184,0,0.5)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Instructional Content */}
      <div className="mt-12 space-y-3">
        <h2 className="text-white font-black text-2xl tracking-tight">{title}</h2>
        <p className="text-white/50 text-sm font-medium">{description}</p>
      </div>

      {showRestartButton && !isInitializing && !hasError && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <button
            onClick={resetScanner}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-gold hover:bg-brand-gold/90 text-white text-xs font-bold rounded-full shadow-lg border border-brand-gold/20 transition-all cursor-pointer min-h-[44px]"
            id="btn-restart-camera"
          >
            <RefreshCcw size={14} className="animate-spin" />
            Restart Camera
          </button>
        </motion.div>
      )}

      <div className="mt-8 flex gap-2">
        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest font-mono">System Live</span>
        </div>
      </div>
    </motion.div>
  );
}
