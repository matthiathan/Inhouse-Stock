import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { sclRepository } from '../features/dispatch/repository';

const DB_NAME = 'OfflineSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'closure_queue';

export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const enqueueClosureTask = async (taskData: any): Promise<void> => {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...taskData, queuedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getOfflineTasks = async (): Promise<any[]> => {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteQueuedTask = async (id: number): Promise<void> => {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const processOfflineSyncQueue = async (queryClient?: any) => {
  if (!navigator.onLine) return;
  
  const tasks = await getOfflineTasks();
  if (tasks.length === 0) return;

  console.log(`Syncing ${tasks.length} offline closure records...`);
  let successCount = 0;

  for (const task of tasks) {
    try {
      let photoUrl = task.existingPhotoUrl;

      // 1. Upload photo if present
      if (task.photoBase64) {
        // Convert base64 back to Blob
        const res = await fetch(task.photoBase64);
        const blob = await res.blob();
        
        const fileName = `${task.sclId}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('maintenance-photos')
          .upload(fileName, blob, { contentType: blob.type });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        
        const { data: urlData } = supabase.storage.from('maintenance-photos').getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      // 2. Update DB
      await sclRepository.update(task.sclId, {
        photo_url: photoUrl,
        closed_remarks: task.notes,
        serial_number: task.serial_number,
        qrcode: task.qrcode,
        current_status: task.status,
        status: task.status,
        ...(task.status === 'Closed' ? { closed_date: new Date().toISOString() } : {})
      } as any);

      // 3. Delete from queue
      await deleteQueuedTask(task.id);
      successCount++;
    } catch (err) {
      console.error('Failed to sync task:', task.sclId, err);
    }
  }

  if (successCount > 0) {
    toast.success(`Synced ${successCount} offline tasks to server!`);
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['sclTasks'] });
    }
  }
};
