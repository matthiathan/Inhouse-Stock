import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Barcode, Plus, Minus, Save, RefreshCcw, CheckCircle, Package } from 'lucide-react';
import { uploadStockPhoto } from '../lib/storage';
import { stockRepository } from '../features/inventory/repository';
import { toast } from 'sonner';
import { StockItem } from '../types';

interface NewStockMenuProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialBarcode?: string;
  existingItems?: StockItem[];
}

interface StockFormValues {
  barcode: string;
  item_name: string;
  units_per_box: number;
  box_quantity: number;
  image_url: string;
  notes: string;
  sku?: string;
}

export function NewStockMenu({ onSuccess, onCancel, initialBarcode = '', existingItems = [] }: NewStockMenuProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { register, handleSubmit, watch, setValue, reset } = useForm<StockFormValues>({
    defaultValues: {
      barcode: initialBarcode,
      item_name: '',
      units_per_box: 1,
      box_quantity: 0,
      image_url: '',
      notes: ''
    }
  });

  const boxes = watch('box_quantity');
  const barcode = watch('barcode');

  // Auto-lookup logic
  useEffect(() => {
    if (barcode && existingItems.length > 0) {
      const matched = existingItems.find(item => 
        String(item.barcode) === barcode || String(item.sku) === barcode
      );
      if (matched) {
        setValue('item_name', matched.item_name || '');
        setValue('units_per_box', matched.units_per_box || 1);
        setValue('notes', matched.notes || '');
        if (matched.image_url) {
          setPreviewUrl(matched.image_url);
          setValue('image_url', matched.image_url);
        }
      }
    }
  }, [barcode, existingItems, setValue]);

  // Handle Image Capture and Immediate Upload
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!barcode) {
      toast.error("Please scan or enter a barcode first");
      return;
    }

    setIsUploading(true);
    // Local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl); 

    try {
      const remoteUrl = await uploadStockPhoto(file, barcode);
      setValue('image_url', remoteUrl);
      toast.success('Photo synced');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Cloud sync failed, but you can still save');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: StockFormValues) => {
    setIsSaving(true);
    try {
      const totalQuantity = (data.units_per_box || 1) * (data.box_quantity || 0);
      const generatedSku = `SKU-${data.barcode.slice(-6)}-${Math.floor(Math.random() * 1000)}`;

      await stockRepository.uploadAndReceive(null, {
        item_name: data.item_name,
        sku: data.sku || generatedSku,
        barcode: data.barcode,
        box_quantity: data.box_quantity,
        units_per_box: data.units_per_box,
        quantity: totalQuantity,
        notes: data.notes || '',
        image_url: data.image_url || undefined
      });

      toast.success('Stock inventory updated!');
      reset();
      setPreviewUrl(null);
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Save failed: ' + message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-base md:bg-black/60 md:backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="w-full max-w-lg bg-bg-elevated min-h-screen md:min-h-0 md:rounded-2xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-bg-elevated sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Package className="text-brand-gold" size={24} /> 
              Receive Shipments
            </h2>
            <p className="text-xs text-text-secondary">Scan, Snap, and Save stock arrivals</p>
          </div>
          <button 
            type="button" 
            onClick={onCancel}
            className="p-2 text-text-secondary hover:bg-bg-base rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6 flex-grow">
          {/* Identity Card */}
          <div className="space-y-4">
            <div className="bg-bg-base p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Item Identity</label>
              <div className="space-y-3">
                <div className="relative">
                  <Barcode className="absolute left-3 top-3 text-text-secondary" size={18} />
                  <input 
                    {...register('barcode', { required: true })} 
                    placeholder="Scan or type barcode" 
                    className="w-full pl-10 p-3 bg-bg-elevated border border-brand-border rounded-lg outline-none focus:border-brand-gold text-text-primary font-mono"
                  />
                </div>
                
                <input 
                  {...register('item_name', { required: true })} 
                  placeholder="Item Description (e.g. Arabica Beans 1kg)" 
                  className="w-full p-3 border border-brand-border rounded-lg font-medium bg-bg-elevated text-text-primary outline-none focus:border-brand-gold"
                />
              </div>
            </div>

            {/* Quantity Card (Mobile Optimized) */}
            <div className="bg-bg-base p-4 rounded-xl border border-brand-border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Inventory Counts</label>
                <div className="flex items-center gap-2">
                   <span className="text-xs text-text-secondary">Units/Box:</span>
                   <input 
                    type="number" 
                    {...register('units_per_box', { valueAsNumber: true })} 
                    className="w-16 p-1 border border-brand-border rounded bg-bg-elevated text-center text-sm font-bold text-brand-gold" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-elevated p-4 rounded-lg border border-brand-border">
                <div className="flex flex-col">
                  <span className="font-bold text-text-primary text-lg">{boxes}</span>
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-tight">Total Boxes</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setValue('box_quantity', Math.max(0, boxes - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-bg-base border border-brand-border rounded-full shadow-sm hover:bg-bg-elevated active:scale-95 transition-all"
                  >
                    <Minus size={20} className="text-text-primary" />
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setValue('box_quantity', boxes + 1)}
                    className="w-12 h-12 flex items-center justify-center bg-brand-gold text-white rounded-full shadow-lg hover:bg-brand-gold/90 active:scale-95 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-brand-border/50 flex justify-between items-center">
                 <span className="text-xs font-semibold text-text-secondary">Calculated Quantity:</span>
                 <span className="text-lg font-bold text-brand-gold">
                    {(watch('units_per_box') || 0) * boxes} <span className="text-[10px] text-text-secondary ml-1">UNITS</span>
                 </span>
              </div>
            </div>

            {/* Media Capture Card */}
            <div className="bg-bg-base p-2 rounded-xl border border-brand-border shadow-sm overflow-hidden">
              <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-brand-border rounded-lg bg-bg-elevated cursor-pointer overflow-hidden group">
                {previewUrl ? (
                  <div className="relative w-full h-full">
                    <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Camera className="text-white" size={32} />
                    </div>
                    {isUploading ? (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <RefreshCcw className="animate-spin text-white" size={32} />
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                        <CheckCircle size={16} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {isUploading ? (
                      <RefreshCcw className="animate-spin text-brand-gold mb-2" size={32} />
                    ) : (
                      <Camera className="text-text-secondary mb-2 group-hover:text-brand-gold transition-colors" size={32} />
                    )}
                    <p className="text-sm text-text-secondary font-semibold">
                      {isUploading ? 'Uploading to cloud...' : 'Tap to capture item photo'}
                    </p>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={handleImageCapture}
                  disabled={isUploading}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Internal Notes</label>
              <textarea 
                {...register('notes')}
                rows={2}
                placeholder="Batch info, expiry dates, or warehouse bin location..."
                className="w-full p-3 border border-brand-border rounded-lg bg-bg-base text-text-primary text-sm resize-none outline-none focus:border-brand-gold"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-brand-border bg-bg-elevated flex gap-3 sticky bottom-0">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 py-4 border border-brand-border text-text-primary font-bold rounded-xl hover:bg-bg-base transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isUploading || isSaving}
            className="flex-[2] py-4 bg-emerald-600 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 transition-transform active:scale-95"
          >
            {isSaving ? (
              <RefreshCcw className="animate-spin" size={24} />
            ) : (
              <Save size={24} />
            )}
            Save To Inventory
          </button>
        </div>
      </form>
    </div>
  );
}
