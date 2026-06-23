import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useScanner } from '../hooks/useScanner';
import { supabase } from '../lib/supabase';
import { assetRepository } from '../services/api/assetRepository';
import { sclRepository } from '../features/dispatch/repository';
import { toast } from 'sonner';
import { Camera, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, Smartphone, Lightbulb, LightbulbOff } from 'lucide-react';
import { validateSclTransition, logStateTransition, SclStatus } from '../utils/sclStateMachine';
import { useAuth } from '../hooks/useAuth';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const closureSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Closed'] as const),
  notes: z.string(),
}).superRefine((data, ctx) => {
  if (data.status === 'Closed' && data.notes.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Resolution Notes are strictly required when closing a ticket.',
      path: ['notes'],
    });
  }
});

type ClosureFormValues = z.infer<typeof closureSchema>;

import { processOfflineSyncQueue, enqueueClosureTask } from '../utils/offlineSync';

export default function SCLTechClosurePage() {
  const { sclId } = useParams<{ sclId: string }>();
  const navigate = useNavigate();
  const { role: userRole } = useAuth();
  
  const [step, setStep] = useState(1);
  const [scannedMachine, setScannedMachine] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sclRecord, setSclRecord] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ClosureFormValues>({
    resolver: zodResolver(closureSchema),
    defaultValues: {
      status: 'Closed',
      notes: ''
    }
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    // Attempt to load existing record early to prepopulate if needed
    if (sclId) {
      sclRepository.getById(sclId).then(record => {
        if (record) setSclRecord(record);
      });
    }
  }, [sclId]);

  useEffect(() => {
    const handleOnline = () => processOfflineSyncQueue();
    window.addEventListener('online', handleOnline);
    processOfflineSyncQueue();
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const stableScanSuccess = useCallback((decodedText: string) => {
    onScanSuccessRef.current(decodedText);
  }, []);

  const { toggleTorch, torchSupported, torchOn, scannerRef: hookScannerRef } = useScanner(
    "qr-reader",
    stableScanSuccess,
    {
       fps: 10,
       qrbox: { width: 250, height: 250 },
       aspectRatio: 1.0,
    },
    step === 1,
    (err) => {
       if (err.includes("NotFoundException")) return;
    }
  );

  async function onScanSuccess(decodedText: string) {
    if (hookScannerRef) {
       // stop scanning because we found it, though hook handles it if step changes to 2
    }
    
    const machine = await assetRepository.getByQrCode(decodedText);
    
    if (!machine) {
        setValidationError("Error: Machine not found for this QR code.");
        return;
    }

    const scannedCustomerRef = (machine as any).customer_code || machine.customer_id;
    const expectedCustomerRef = (sclRecord as any)?.customer_code || sclRecord?.customer_id;

    if (sclRecord && scannedCustomerRef && expectedCustomerRef && scannedCustomerRef !== expectedCustomerRef) {
        setValidationError(`Mismatch: Machine ${machine.serial_number} does not belong to the recorded customer.`);
        return;
    }

    setScannedMachine(machine);
    setValidationError(null);
    setStep(2);
  };

  const onSubmit = async (data: ClosureFormValues) => {
    if (data.status === 'Closed' && !photoFile) {
      toast.error('Photographic evidence is required when closing a ticket.');
      return;
    }

    const currentStatus = (sclRecord?.current_status || sclRecord?.status || 'In Progress') as SclStatus;
    
    const validation = validateSclTransition(
       currentStatus,
       data.status as SclStatus,
       data.notes,
       userRole || undefined
    );
    
    if (!validation.valid) {
       toast.error(validation.error || 'Transition invalid');
       return;
    }

    setIsSubmitting(true);

    if (!navigator.onLine) {
      toast.info('No connection detected. Saving task locally for auto-sync.');
      
      let photoBase64 = null;
      if (photoFile) {
        // Convert to base64
        photoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(photoFile);
        });
      }

      await enqueueClosureTask({
        sclId,
        existingPhotoUrl: sclRecord?.photo_url,
        photoBase64,
        notes: data.notes,
        serial_number: scannedMachine.serial_number,
        qrcode: scannedMachine.qr_code,
        status: data.status,
      });

      setIsSubmitting(false);
      navigate('/my-route');
      return;
    }

    let photoUrl = sclRecord?.photo_url;

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${sclId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('maintenance-photos')
        .upload(fileName, photoFile);
      
      if (uploadError) {
        toast.error('Network Error: Failed to upload photo.');
        setIsSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('maintenance-photos').getPublicUrl(fileName);
      photoUrl = urlData.publicUrl;
    }

    try {
      await sclRepository.update(sclId!, {
        photo_url: photoUrl,
        closed_remarks: data.notes,
        serial_number: scannedMachine.serial_number,
        qrcode: scannedMachine.qr_code,
        current_status: data.status,
        status: data.status,
        ...(data.status === 'Closed' ? { closed_date: new Date().toISOString() } : {})
      } as any);

      toast.success('Task update accepted.');
      
      await logStateTransition(
         sclId!,
         currentStatus,
         data.status as SclStatus,
         sclRecord?.assigned_employee_id || 'tech',
         sclRecord?.assigned_employee || 'Technician',
         data.notes
      );

      navigate('/my-route');
    } catch (err: any) {
      toast.error('System Error: Failed to commit closure details.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 pb-28">
      {/* 4. VISUAL HIERARCHY Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 p-4 shadow-sm">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 bg-gray-50 rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
             <div className="flex items-center gap-2 mb-1">
                <span className="bg-brand-gold/10 text-brand-gold text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                  Doc #{sclRecord?.doc_no || sclId?.slice(-6)}
                </span>
             </div>
             {sclRecord ? (
               <>
                 <h1 className="text-xl font-black text-gray-900 leading-tight tracking-tight">
                   {sclRecord.client_name || 'Loading Customer...'}
                 </h1>
                 <p className="text-xs text-gray-400 font-medium mt-1 truncate">{sclRecord.address}</p>
                 {scannedMachine && (
                   <p className="mt-2 text-[11px] font-bold text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-between">
                     <span>Target Asset:</span> 
                     <span className="font-mono text-xs">{scannedMachine.serial_number}</span>
                   </p>
                 )}
               </>
             ) : (
               <div className="space-y-2 mt-2">
                 <div className="h-6 w-3/4 bg-gray-100 rounded animate-pulse" />
                 <div className="h-4 w-1/2 bg-gray-50 rounded animate-pulse" />
               </div>
             )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-4">
        {step === 1 && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
              <Smartphone size={32} />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Scan Asset QR</h2>
            <p className="text-center text-gray-500 text-sm mb-6 max-w-[250px]">
              Point your camera at the machine's QR code sticker to verify your location.
            </p>
            
            <div className="w-full max-w-[300px] overflow-hidden rounded-2xl shadow-inner border-2 border-gray-100 relative">
              <div id="qr-reader" className="w-full"></div>
              {torchSupported && step === 1 && (
                 <button
                   onClick={(e) => { e.preventDefault(); toggleTorch(); }}
                   className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/70 transition-colors z-10"
                   title="Toggle Flashlight"
                   aria-label="Toggle Flashlight"
                 >
                    {torchOn ? <LightbulbOff size={20} /> : <Lightbulb size={20} />}
                 </button>
              )}
            </div>

            {validationError && (
              <div className="mt-6 w-full bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3 text-red-700 text-sm">
                 <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                 <p className="font-bold">{validationError}</p>
              </div>
            )}
            
            <div className="mt-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
               Bypass / Override Scanner
            </div>
            <button 
              onClick={() => setStep(2)} // Bypass for testing purposes
              className="mt-3 w-full h-12 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-xs active:scale-95 transition-all"
            >
              Manual Entry Overwrite
            </button>
          </div>
        )}

        {step === 2 && (
          <form id="closure-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* 1. STATUS CARD */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Task Status / Outcome</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select 
                    {...field}
                    className="w-full h-14 bg-gray-50 border-none rounded-xl px-4 font-black text-gray-900 focus:ring-2 focus:ring-brand-gold/20 outline-none"
                  >
                    <option value="In Progress">Pause / Leave In Progress</option>
                    <option value="Closed">Finalize & Close Ticket</option>
                  </select>
                )}
              />
            </div>

            {/* 2. RESOLUTION NOTES CARD */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resolution Notes</label>
                {selectedStatus === 'Closed' && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">*Required</span>}
              </div>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <textarea 
                    {...field}
                    placeholder="Log exact faults found and steps taken to resolve..."
                    className={`w-full min-h-[120px] p-4 bg-gray-50 rounded-2xl border-none font-medium text-gray-900 focus:ring-2 focus:ring-brand-gold/20 outline-none resize-none ${errors.notes ? 'ring-2 ring-red-500/20 bg-red-50/50 placeholder:text-red-300' : ''}`}
                  />
                )}
              />
              {errors.notes && (
                <p className="text-xs font-bold text-red-500 mt-2">{errors.notes.message}</p>
              )}
            </div>

            {/* 3. EVIDENCE CARD */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visual Evidence</label>
                {selectedStatus === 'Closed' && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">*Required</span>}
              </div>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPhotoFile(e.target.files[0]);
                    }
                  }}
                  className="hidden" 
                  id="camera-input"
                />
                <label 
                  htmlFor="camera-input" 
                  className={`w-full h-16 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-95 ${
                    photoFile 
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600' 
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  <Camera size={24} />
                  <span className="font-bold text-sm">
                    {photoFile ? 'Retake Photo' : 'Capture Machine Condition'}
                  </span>
                </label>
              </div>
              {photoFile && (
                <div className="mt-3 text-center">
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                    ✓ Photo Attached ({Math.round(photoFile.size / 1024)} KB)
                  </span>
                </div>
              )}
            </div>

          </form>
        )}
      </main>

      {/* 5. ACTION BAR at the bottom */}
      {step === 2 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe-8">
          <button 
            type="submit"
            form="closure-form"
            disabled={isSubmitting}
            className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
              isSubmitting ? 'bg-gray-100 text-gray-400 shadow-none' : 'bg-brand-gold text-white shadow-brand-gold/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Submit Task Record
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
