import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, Camera, RefreshCw } from 'lucide-react';

interface QRScannerCameraProps {
  onScanSuccess: (decodedText: string) => void;
  enabled?: boolean;
  onFatalError?: (message: string) => void;
}

const buildScannerConfig = (qrboxWidth: number) => ({
  fps: 10,
  qrbox: { width: qrboxWidth, height: qrboxWidth },
  aspectRatio: 1,
  rememberLastUsedCamera: true,
});

const getReadableScannerError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || 'Unknown scanner error');

  if (/permission|notallowed/i.test(message)) {
    return 'Camera permission was blocked. Allow camera access in your browser and try again.';
  }

  if (/notfound|overconstrained|no camera|requested device not found/i.test(message)) {
    return 'No suitable camera was found. Connect a camera or try another device.';
  }

  if (/notreadable|track start|could not start/i.test(message)) {
    return 'The camera is already in use by another app or browser tab. Close it and try again.';
  }

  return 'The scanner could not start. Please retry or reload this screen.';
};

export const QRScannerCamera: React.FC<QRScannerCameraProps> = ({ enabled = true, onScanSuccess, onFatalError }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const hasScannedRef = useRef(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const elementId = useMemo(
    () => `qr-reader-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useEffect(() => {
    if (!enabled) return;

    isMountedRef.current = true;
    hasScannedRef.current = false;
    setFatalError(null);

    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 320;
    const qrboxWidth = Math.min(Math.max(viewportWidth * 0.72, 220), 320);
    const scanner = new Html5Qrcode(elementId, false);
    scannerRef.current = scanner;

    const stopAndClear = async () => {
      const activeScanner = scannerRef.current;
      if (!activeScanner) return;

      try {
        if (activeScanner.isScanning) {
          await activeScanner.stop();
        }
      } catch (error) {
        console.warn('Asset scanner stop warning:', error);
      }

      try {
        activeScanner.clear();
      } catch (error) {
        console.warn('Asset scanner clear warning:', error);
      }
    };

    const startScanner = async () => {
      const config = buildScannerConfig(qrboxWidth);

      try {
        await scanner.start(
          { facingMode: { exact: 'environment' } },
          config,
          async (decodedText) => {
            if (!isMountedRef.current || hasScannedRef.current) return;
            hasScannedRef.current = true;

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try {
                navigator.vibrate(160);
              } catch {
                // Vibration is optional and unsupported on some browsers.
              }
            }

            await stopAndClear();
            if (isMountedRef.current) {
              onScanSuccess(decodedText);
            }
          },
          () => {
            // Per-frame decode misses are expected while the camera is looking for a QR code.
          },
        );
      } catch (primaryError) {
        if (!isMountedRef.current) return;

        try {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            async (decodedText) => {
              if (!isMountedRef.current || hasScannedRef.current) return;
              hasScannedRef.current = true;
              await stopAndClear();
              if (isMountedRef.current) {
                onScanSuccess(decodedText);
              }
            },
            () => {},
          );
        } catch (fallbackError) {
          const readableError = getReadableScannerError(fallbackError || primaryError);
          console.error('Asset scanner failed to start:', fallbackError || primaryError);
          if (isMountedRef.current) {
            setFatalError(readableError);
            onFatalError?.(readableError);
          }
          await stopAndClear();
        }
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      stopAndClear().finally(() => {
        if (scannerRef.current === scanner) {
          scannerRef.current = null;
        }
      });
    };
  }, [elementId, enabled, onFatalError, onScanSuccess, retryKey]);

  if (fatalError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-400/20 dark:bg-red-500/10">
        <AlertTriangle className="mx-auto mb-3 text-red-600 dark:text-red-300" size={28} />
        <p className="text-sm font-semibold text-red-700 dark:text-red-200">{fatalError}</p>
        <button
          type="button"
          onClick={() => setRetryKey(key => key + 1)}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-dallmayr-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-dallmayr-blue-light"
        >
          <RefreshCw size={16} />
          Retry scanner
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-bg-canvas px-3 py-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
        <Camera size={15} className="text-brand-gold" />
        Point the camera at an asset QR code
      </div>
      <div id={elementId} className="min-h-[280px] w-full overflow-hidden rounded-xl border border-brand-border bg-bg-base" />
    </div>
  );
};
