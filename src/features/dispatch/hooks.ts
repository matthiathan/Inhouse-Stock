import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sclRepository } from './repository';
import { ServiceCallLog } from '../../types';
import { supabase } from '../../lib/supabase';
import { getTableByPrefix } from '../../services/routeService';
import { DB_COLS } from '../../constants/db';
import { toast } from 'sonner';
import { useEffect } from 'react';

export const useSclTasks = () => {
  return useQuery({
    queryKey: ['sclTasks'],
    queryFn: () => sclRepository.getAll(),
  });
};

export const useUpdateSclTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; update: Partial<ServiceCallLog> }) => 
        sclRepository.update(data.id, data.update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sclTasks'] });
    },
  });
};

export const useContractLookup = (faDocId?: string) => {
  return useQuery({
    queryKey: ['contract-lookup', faDocId],
    queryFn: async () => {
      if (!faDocId) return null;
      
      const tableName = getTableByPrefix(faDocId);
      if (!tableName) return null;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(DB_COLS.DOC_NUM, faDocId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!faDocId,
  });
};

export const useSubmitSCL = () => {
  const queryClient = useQueryClient();

  // Background sync effect
  useEffect(() => {
    const syncQueue = async () => {
      if (!navigator.onLine) return;
      
      const queue = JSON.parse(localStorage.getItem('scl_queue') || '[]');
      if (queue.length === 0) return;

      console.log(`Syncing ${queue.length} offline SCL records...`);
      const remainingItems = [];
      let successCount = 0;

      for (const item of queue) {
        try {
          const { queuedAt, ...formData } = item;
          await sclRepository.create(formData);
          successCount++;
        } catch (err) {
          console.error("Sync failed for item:", err);
          remainingItems.push(item);
        }
      }

      localStorage.setItem('scl_queue', JSON.stringify(remainingItems));
      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline SCL records!`);
        queryClient.invalidateQueries({ queryKey: ['sclTasks'] });
      }
    };

    window.addEventListener('online', syncQueue);
    // Attempt initial sync
    syncQueue();

    return () => window.removeEventListener('online', syncQueue);
  }, [queryClient]);

  return useMutation({
    mutationFn: async (formData: Omit<ServiceCallLog, 'id' | 'created_at'>) => {
      // 1. Check network status before attempting database call
      if (!navigator.onLine) {
        // 2. Save to local storage if offline
        const offlineQueue = JSON.parse(localStorage.getItem('scl_queue') || '[]');
        offlineQueue.push({ ...formData, queuedAt: new Date().toISOString() });
        localStorage.setItem('scl_queue', JSON.stringify(offlineQueue));
        
        throw new Error('OFFLINE_SAVED');
      }

      // 3. Normal online submission
      return await sclRepository.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sclTasks'] });
    },
    onError: (error: Error) => {
      if (error.message === 'OFFLINE_SAVED') {
        toast.info("No internet. Form saved offline and will sync automatically.");
      } else {
        toast.error("Failed to submit: " + error.message);
      }
    }
  });
};
