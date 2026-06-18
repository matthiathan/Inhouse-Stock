import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { assetRepository } from '../services/api/assetRepository';
import { sclRepository } from '../features/dispatch/repository';
import { toast } from 'sonner';
import { Camera, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { validateSclTransition, logStateTransition, SclStatus } from '../utils/sclStateMachine';

export default function SCLTechClosurePage() {
  const { sclId } = useParams<{ sclId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [scannedMachine, setScannedMachine] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sclRecord, setSclRecord] = useState<any>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (step === 1) {
      const scanner = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: { exact: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: "continuous"
        } as any
      }, false);
      scannerRef.current = scanner;
      scanner.render(onScanSuccess, (err) => {
        if (err.includes("NotFoundException")) return;
        console.warn(err);
      });
      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [step]);

  const onScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
    }
    
    // 1. Fetch Machine
    const machine = await assetRepository.getByQrCode(decodedText);
    
    if (!machine) {
        setValidationError("Machine not found for this QR code.");
        return;
    }

    // 2. Fetch SCL to get expected customer/asset info for validation if needed
    const scl = sclId ? await sclRepository.getById(sclId) : null;
    if (scl) {
        setSclRecord(scl);
    }

    // 3. Simple validation (adjust logic as per business rules)
    if (scl && machine.customer_code !== scl.customer_code) {
        setValidationError("Mismatch: Scanned machine does not match assigned customer.");
        return;
    }

    setScannedMachine(machine);
    setStep(2);
  };

  const submitClosure = async () => {
    if (!photoFile || !notes) {
      toast.error('Please add notes and a photo');
      return;
    }

    // Validate with State Machine
    const validation = validateSclTransition(
       (sclRecord?.current_status || sclRecord?.status || 'Open') as SclStatus,
       'Closed',
       notes
    );
    if (!validation.valid) {
       toast.error(validation.error || 'Transition invalid');
       return;
    }

    setStep(3);

    // 1. Upload Photo
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${sclId}-${Date.now()}.${fileExt}`;
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('maintenance-photos')
      .upload(fileName, photoFile);
    
    if (uploadError) {
      toast.error('Failed to upload photo');
      setStep(2);
      return;
    }

    const { data: urlData } = supabase.storage.from('maintenance-photos').getPublicUrl(fileName);

    // 2. Update SCL
    try {
      await sclRepository.update(sclId!, {
        photo_url: urlData.publicUrl,
        closed_remarks: notes,
        serial_number: scannedMachine.serial_number,
        qrcode: scannedMachine.qr_code,
        current_status: 'Closed',
        status: 'Closed',
        closed_date: new Date().toISOString()
      } as any);

      toast.success('Task closed successfully');
      
      // Resilient transition auditing
      await logStateTransition(
         sclId!,
         (sclRecord?.current_status || sclRecord?.status || 'Open') as SclStatus,
         'Closed',
         sclRecord?.assigned_employee_id || 'tech',
         sclRecord?.assigned_employee || 'Technician',
         notes
      );

      navigate('/my-route');
    } catch (err: any) {
      toast.error('Failed to close call');
      setStep(2);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-bold">Closure: SCL #{sclId}</h1>

      {step === 1 && (
        <div className="space-y-4">
          <div id="qr-reader" className="w-full"></div>
          {validationError && (
            <div className="bg-red-50 p-4 rounded-lg flex items-center gap-3 text-red-700">
               <AlertTriangle />
               <p>{validationError}</p>
            </div>
          )}
        </div>
      )}

      {step === 2 && scannedMachine && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <h2 className="font-bold mb-2">Verified Machine</h2>
            <p><strong>Asset:</strong> {scannedMachine.asset_name}</p>
            <p><strong>Serial:</strong> {scannedMachine.serial_number}</p>
          </div>

          <textarea 
            value={notes} onChange={(e) => setNotes(e.target.value)} 
            placeholder="Details of work..." className="w-full h-32 p-3 border rounded-lg"
          />

          <input type="file" onChange={(e) => e.target.files?.[0] && setPhotoFile(e.target.files[0])} accept="image/*" className="w-full" />

          <button onClick={submitClosure} className="w-full bg-brand-gold text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <CheckCircle2 /> Submit Closure
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-10">Processing...</div>
      )}
    </div>
  );
}
