import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useScanner } from '../hooks/useScanner';
import { assetRepository } from '../services/api/assetRepository';
import { ticketRepository } from '../features/tickets/repository';
import { toast } from 'sonner';
import { Camera, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, Smartphone, Lightbulb, LightbulbOff, FileText, Upload } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { enqueueClosureTask, processOfflineSyncQueue } from '../utils/offlineSync';

const closureSchema = z.object({
  status: z.enum(['In Progress', 'Completed'] as const),
  notes: z.string(),
}).superRefine((data, ctx) => {
  if (data.status === 'Completed' && data.notes.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Resolution Notes are strongly required when completing a ticket.',
      path: ['notes'],
    });
  }
});

type ClosureFormValues = z.infer<typeof closureSchema>;

export default function TechTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [scannedMachine, setScannedMachine] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleOnline = () => processOfflineSyncQueue(queryClient);
    window.addEventListener('online', handleOnline);
    processOfflineSyncQueue(queryClient);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const result = await ticketRepository.getById(id || '');
      return result;
    },
    enabled: !!id
  });

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ClosureFormValues>({
    resolver: zodResolver(closureSchema),
    defaultValues: {
      status: 'Completed',
      notes: ''
    }
  });

  const selectedStatus = watch('status');

  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const stableScanSuccess = useCallback((decodedText: string) => {
    onScanSuccessRef.current(decodedText);
  }, []);

  const { toggleTorch, torchSupported, torchOn } = useScanner(
    "qr-reader-ticket",
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
    const machine = await assetRepository.getByQrCode(decodedText);
    
    if (!machine) {
        setValidationError("Error: Machine not found for this QR code.");
        return;
    }

    if (ticket && machine.id !== ticket.machine_id) {
        setValidationError(`Mismatch: Machine ${machine.serial_number} does not match the ticket's assigned machine.`);
        return;
    }

    setScannedMachine(machine);
    setValidationError(null);
    setStep(2);
  }

  const bypassScanner = async () => {
    if (!ticket) return;
    const targetMachine = await assetRepository.getById(ticket.machine_id);
    if (targetMachine) {
      setScannedMachine(targetMachine);
      setStep(2);
    } else {
      toast.error('Assigned Machine could not be located.');
    }
  };

  const onSubmit = async (data: ClosureFormValues) => {
    if (data.status === 'Completed' && !photoFile && !ticket?.photo_url) {
      toast.error('Photographic evidence is required when completing a ticket.');
      return;
    }

    setIsSubmitting(true);

    if (!navigator.onLine) {
      toast.info('No connection detected. Saving task locally for auto-sync.');
      
      let photoBase64 = null;
      if (photoFile) {
        photoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(photoFile);
        });
      }

      await enqueueClosureTask({
        isMaintenanceTicket: true,
        ticketId: ticket?.id,
        existingPhotoUrl: ticket?.photo_url,
        photoBase64,
        notes: data.notes,
        asset_id: scannedMachine?.id,
        status: data.status,
      });

      setIsSubmitting(false);
      navigate('/my-route');
      return;
    }

    // Try normal submit using enqueue task queue directly (the queue processor handles online items immediately)
    let photoBase64 = null;
    if (photoFile) {
      photoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(photoFile);
      });
    }

    await enqueueClosureTask({
      isMaintenanceTicket: true,
      ticketId: ticket?.id,
      existingPhotoUrl: ticket?.photo_url,
      photoBase64,
      notes: data.notes,
      asset_id: scannedMachine?.id,
      status: data.status,
    });
    
    await processOfflineSyncQueue(queryClient);

    setIsSubmitting(false);
    navigate('/my-route');
  };

  if (isLoading) return <div className="p-8 text-center">Loading ticket...</div>;
  if (!ticket) return <div className="p-8 text-center text-red-500">Ticket not found</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 pb-28">
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
                  Ticket #{ticket.ticket_number || ticket.id?.slice(-6)}
                </span>
             </div>
             <h1 className="text-xl font-black text-gray-900 leading-tight tracking-tight">
                {ticket.unified_customers?.name || "Customer Visit"}
             </h1>
             <p className="text-xs text-gray-400 font-medium mt-1 truncate">{ticket.issue_description}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {step === 1 && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
              <Smartphone size={32} />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Scan Asset QR</h2>
            <p className="text-center text-gray-500 text-sm mb-6 max-w-[250px]">
              Point your camera at the machine's QR code sticker to verify your presence.
            </p>
            
            <div className="w-full max-w-[300px] overflow-hidden rounded-2xl shadow-inner border-2 border-gray-100 relative">
              <div id="qr-reader-ticket" className="w-full"></div>
              {torchSupported && step === 1 && (
                 <button
                   onClick={(e) => { e.preventDefault(); toggleTorch(); }}
                   className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/70 transition-colors z-10"
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
              onClick={bypassScanner}
              className="mt-3 w-full h-12 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-xs active:scale-95 transition-all"
            >
              Manual Entry Overwrite
            </button>
          </div>
        )}

        {step === 2 && (
          <form id="closure-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
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
                    <option value="Completed">Finalize & Complete Work</option>
                  </select>
                )}
              />
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resolution Notes</label>
                {selectedStatus === 'Completed' && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">*Required</span>}
              </div>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <textarea 
                    {...field}
                    placeholder="Log exact faults found and steps taken to resolve (mandatory for completion)..."
                    className={`w-full min-h-[120px] p-4 bg-gray-50 rounded-2xl border-none font-medium text-gray-900 focus:ring-2 focus:ring-brand-gold/20 outline-none resize-none ${errors.notes ? 'ring-2 ring-red-500/20 bg-red-50/50 placeholder:text-red-300' : ''}`}
                  />
                )}
              />
              {errors.notes && (
                <p className="text-xs font-bold text-red-500 mt-2">{errors.notes.message}</p>
              )}
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visual Evidence</label>
                {selectedStatus === 'Completed' && <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">*Required</span>}
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
                  id="camera-input-ticket"
                />
                <label 
                  htmlFor="camera-input-ticket" 
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
                {selectedStatus === 'Completed' ? 'Complete Task' : 'Save Status'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
