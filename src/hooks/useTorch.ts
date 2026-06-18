import { useState, useCallback, MutableRefObject } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const useTorch = (scannerRef?: MutableRefObject<Html5Qrcode | null>) => {
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTorch = useCallback(async () => {
    try {
      setError(null);
      // 1. Safety Check: Ensure scanner exists and is active
      if (!scannerRef || !scannerRef.current) {
        throw new Error("Scanner not initialized");
      }

      // 2. Get the video track directly from the stream/running track
      const track = scannerRef.current.getRunningTrack(); 
      if (!track) {
        throw new Error("Scanner camera track is not active or initialized yet");
      }

      // 3. Verify Torch Capability
      const capabilities = track.getCapabilities ? track.getCapabilities() : null;
      
      // @ts-ignore - 'torch' is part of the MediaTrackCapabilities interface
      if (capabilities && capabilities.torch) {
        // 4. Apply the constraint
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }] as any
        });
        setTorchOn(!torchOn);
      } else {
        setError('Torch not supported on this device/browser');
        console.warn("Torch not supported on this device/browser");
      }
    } catch (err: any) {
      setError(err.message || 'Torch Error');
      console.error("Torch Error:", err);
    }
  }, [torchOn, scannerRef]);

  return { torchOn, setTorchOn, toggleTorch, error };
};

