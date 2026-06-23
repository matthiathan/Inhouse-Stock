import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Hash, QrCode, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { assetSchema, type AssetFormData } from '../lib/assetSchema';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function AssetForm({ initialQrCode }: { initialQrCode?: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      serial_number: '',
      qr_code: initialQrCode || '',
      machine_model: '',
      installation_date: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: AssetFormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Registering Asset:', data);
      toast.success('Asset registered successfully');
      reset();
    } catch (error) {
      toast.error('Failed to register asset. Please try again.');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-brand-gold p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Register New Machine</h2>
          </div>
          <p className="text-white/80 font-medium">Add a new asset to the inventory system</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          {/* Serial Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
              Serial Number
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Hash className="w-5 h-5" />
              </div>
              <input
                {...register('serial_number')}
                placeholder="e.g. SN-98442-X"
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all ${
                  errors.serial_number ? 'border-red-200 ring-4 ring-red-50' : 'border-transparent focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10'
                }`}
              />
            </div>
            {errors.serial_number && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs font-bold mt-1 ml-1"
              >
                {errors.serial_number.message}
              </motion.p>
            )}
          </div>

          {/* Machine Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
              Machine Model
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Package className="w-5 h-5" />
              </div>
              <input
                {...register('machine_model')}
                placeholder="e.g. LaserJet Pro M404n"
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all ${
                  errors.machine_model ? 'border-red-200 ring-4 ring-red-50' : 'border-transparent focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10'
                }`}
              />
            </div>
            {errors.machine_model && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs font-bold mt-1 ml-1"
              >
                {errors.machine_model.message}
              </motion.p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                QR Code Identifier
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <input
                  {...register('qr_code')}
                  placeholder="Scan or enter code"
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10 transition-all"
                />
              </div>
            </div>

            {/* Installation Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                Installation Date
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <input
                  type="date"
                  {...register('installation_date')}
                  className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all ${
                    errors.installation_date ? 'border-red-200 ring-4 ring-red-50' : 'border-transparent focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/10'
                  }`}
                />
              </div>
              {errors.installation_date && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs font-bold mt-1 ml-1"
                >
                  {errors.installation_date.message}
                </motion.p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-gold hover:bg-brand-gold/90 shadow-brand-gold/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Register Asset
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
