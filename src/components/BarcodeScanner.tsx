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
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-container";
  
  // Directly manage scanner lifecycle with a ref for useTorch compatibility
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const { torchOn, toggleTorch, isSupported, checkSupport } = useTorch(scannerInstanceRef);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      // 1. Fake loading delay to hide hardware flash
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!isMounted) return;

      try {
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
              onScan(decodedText);
            }
          },
          () => {
            // Success handler for scan errors (ignore)
          }
        );

        if (isMounted) {
          setIsInitializing(false);
          // Check if torch is supported after camera starts
          setTimeout(checkSupport, 1000);
        }
      } catch (err: any) {
        if (isMounted) {
          setHasError(err.message || "Failed to start camera");
          setIsInitializing(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerInstanceRef.current) {
        if (scannerInstanceRef.current.isScanning) {
          scannerInstanceRef.current.stop()
            .then(() => {
              scannerInstanceRef.current?.clear();
            })
            .catch(err => console.error("Scanner cleanup error:", err));
        }
      }
    };
  }, [onScan, checkSupport]);

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
          className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white backdrop-blur-xl border border-white/10 transition-colors"
        >
          ✕
        </button>

        {isSupported && !isInitializing && (
          <button 
            onClick={toggleTorch}
            className={`p-3 rounded-full backdrop-blur-xl border border-white/10 transition-all ${
              torchOn ? 'bg-brand-gold text-white shadow-[0_0_15px_rgba(255,184,0,0.4)]' : 'bg-white/10 text-white'
            }`}
          >
            {torchOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
          </button>
        )}
      </div>

      {/* Main Scanner Stage */}
      <div className="w-full max-w-sm aspect-square bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative border-4 border-brand-gold/20">
        <div id={containerId} className="w-full h-full" />
        
        {/* Loading / Error Overlays */}
        <AnimatePresence>
          {isInitializing && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center p-6"
            >
              <RefreshCcw className="w-12 h-12 text-brand-gold animate-spin mb-4" />
              <p className="text-white font-bold">Waking up camera...</p>
            </motion.div>
          )}

          {hasError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-6 text-white"
            >
              <Camera className="w-12 h-12 text-red-500 mb-4" />
              <p className="font-bold text-lg">Hardware Error</p>
              <p className="text-sm text-white/70 mt-2">{hasError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-6 bg-red-600 px-6 py-2 rounded-xl font-bold text-sm"
              >
                Reset Camera
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

      <div className="mt-8 flex gap-2">
        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">System Live</span>
        </div>
      </div>
    </motion.div>
  );
}
