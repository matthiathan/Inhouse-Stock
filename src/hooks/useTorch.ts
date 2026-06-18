import { useState, useCallback } from 'react';

export const useTorch = () => {
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTorch = useCallback(async () => {
    try {
      // 1. Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // 2. Get the video track
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      // 3. Check if the device supports the 'torch' capability
      if (capabilities && capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }] as any
        });
        setTorchOn(!torchOn);
      } else {
        setError('Torch not supported on this device/browser');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to access camera');
      console.error(err);
    }
  }, [torchOn]);

  return { torchOn, toggleTorch, error };
};
