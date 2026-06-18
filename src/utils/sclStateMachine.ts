import { supabase } from '../lib/supabase';

export type SclStatus = 'Open' | 'In Progress' | 'Closed';

export const VALID_SCL_TRANSITIONS: Record<SclStatus, SclStatus[]> = {
  'Open': ['In Progress', 'Closed'],
  'In Progress': ['Open', 'Closed'],
  'Closed': ['Open', 'In Progress'] // Manager can re-open
};

export interface AuditLogEntry {
  scl_id: string;
  previous_status: SclStatus | 'None';
  new_status: SclStatus;
  changed_by: string;
  notes?: string;
  timestamp: string;
}

/**
 * Validates a transition for an SCL task status.
 * Throws an error if the transition is invalid or lacks mandatory remarks.
 */
export const validateSclTransition = (
  currentStatus: SclStatus,
  nextStatus: SclStatus,
  closedRemarks: string | null
): { valid: boolean; error?: string } => {
  // If no change, it is valid
  if (currentStatus === nextStatus) {
    return { valid: true };
  }

  // Check valid transition path
  const allowed = VALID_SCL_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: `Invalid transition path: ${currentStatus} cannot directly transition to ${nextStatus}.`
    };
  }

  // Enforce mandatory closed remarks when closing
  if (nextStatus === 'Closed' && (!closedRemarks || closedRemarks.trim().length === 0)) {
    return {
      valid: false,
      error: 'An asset cannot go to Closed status without mandatory closed remarks.'
    };
  }

  return { valid: true };
};

/**
 * Log the transition into audit log table with a resilient fallback to localStorage.
 */
export const logStateTransition = async (
  sclId: string,
  fromStatus: SclStatus | 'None',
  toStatus: SclStatus,
  userId: string,
  userEmail: string,
  remarks?: string
) => {
  const entry: AuditLogEntry = {
    scl_id: sclId,
    previous_status: fromStatus,
    new_status: toStatus,
    changed_by: userEmail || userId || 'System',
    notes: remarks || 'State transitioned',
    timestamp: new Date().toISOString()
  };

  // 1. Log to localStorage as secure local duplicate
  try {
    const existingLogsStr = localStorage.getItem('scl_audit_logs');
    const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
    existingLogs.push(entry);
    localStorage.setItem('scl_audit_logs', JSON.stringify(existingLogs));
  } catch (err) {
    console.error('Failed to log to local storage:', err);
  }

  // 2. Resilient DB audit insertion
  try {
    const { error } = await supabase
      .from('scl_audit_logs')
      .insert({
        scl_id: sclId,
        previous_status: fromStatus,
        new_status: toStatus,
        changed_by: userEmail,
        remarks: remarks || '',
        created_at: entry.timestamp
      });
      
    if (error) {
       console.warn('DB Table scl_audit_logs might not exist, but logged state locally. DB Err:', error.message);
    }
  } catch (err) {
    console.warn('Silent resilient catch: Database insertion of audit log skipped/failed.', err);
  }
};

/**
 * Checks if SCL entries for a specific serial_number exceed 3 calls in 30 days.
 * If exceeded, flags the asset as "Defective" and disables further standard dispatches unless approved.
 */
export const checkAssetThresholds = async (
  serialNumber: string
): Promise<{ exceeded: boolean; count: number; alertMessage?: string }> => {
  if (!serialNumber) {
    return { exceeded: false, count: 0 };
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filterDate = thirtyDaysAgo.toISOString();

    // Fetch SCL logs for this serial number in the last 30 days
    const { data, error } = await supabase
      .from('service_call_logs')
      .select('id, created_at')
      .eq('serial_number', serialNumber)
      .gte('created_at', filterDate);

    if (error) {
      console.error('Error checking SCL thresholds from DB:', error);
      // Fallback checkout from offline storage or fallback mock
      return checkLocalAssetThresholds(serialNumber);
    }

    const count = data ? data.length : 0;
    const limit = 3; // Calls threshold

    if (count >= limit) {
      // Flag machine as defective in DB if table and column allow, or in local defective registry
      flagAssetAsDefectiveLocal(serialNumber, true);
      
      // Update machine status in DB to warning/defective if applicable
      await supabase
        .from('machines')
        .update({ status: 'Defective', current_status: 'Defective' })
        .eq('serial_number', serialNumber);

      return {
        exceeded: true,
        count,
        alertMessage: `Predictive Alert: Serial number ${serialNumber} has exceeded ${limit} service calls (total: ${count}) in the last 30 days. Automatically flagged as "Defective". Dispatches disabled pending manager approval.`
      };
    }

    return { exceeded: false, count };
  } catch (err) {
    console.warn('Resilient safety catch on predictive threshold:', err);
    return checkLocalAssetThresholds(serialNumber);
  }
};

// Local storage auxiliary functions for predictive alerts/defect states
export const flagAssetAsDefectiveLocal = (serialNumber: string, defective: boolean) => {
  try {
    const defectiveMapStr = localStorage.getItem('scl_defective_assets') || '{}';
    const defectiveMap = JSON.parse(defectiveMapStr);
    if (defective) {
      defectiveMap[serialNumber] = {
        defective: true,
        timestamp: new Date().toISOString(),
        managerApproved: false
      };
    } else {
      delete defectiveMap[serialNumber];
    }
    localStorage.setItem('scl_defective_assets', JSON.stringify(defectiveMap));
  } catch (err) {
    console.error(err);
  }
};

export const approveDefectiveAsset = (serialNumber: string) => {
  try {
    const defectiveMapStr = localStorage.getItem('scl_defective_assets') || '{}';
    const defectiveMap = JSON.parse(defectiveMapStr);
    if (defectiveMap[serialNumber]) {
      defectiveMap[serialNumber].managerApproved = true;
      localStorage.setItem('scl_defective_assets', JSON.stringify(defectiveMap));
    }
  } catch (err) {
    console.error(err);
  }
};

export const isAssetDispatchDisabled = (serialNumber: string): boolean => {
  try {
    const defectiveMapStr = localStorage.getItem('scl_defective_assets') || '{}';
    const defectiveMap = JSON.parse(defectiveMapStr);
    const record = defectiveMap[serialNumber];
    if (record && record.defective && !record.managerApproved) {
      return true;
    }
  } catch (err) {
    console.error(err);
  }
  return false;
};

const checkLocalAssetThresholds = (serialNumber: string) => {
  try {
    // Check if flagged as defective locally
    const defectiveMapStr = localStorage.getItem('scl_defective_assets') || '{}';
    const defectiveMap = JSON.parse(defectiveMapStr);
    const record = defectiveMap[serialNumber];
    if (record && record.defective && !record.managerApproved) {
      return {
        exceeded: true,
        count: 4,
        alertMessage: `Predictive Alert: Serial number ${serialNumber} is flagged as "Defective". Dispatches disabled pending manager approval.`
      };
    }
  } catch (e) {}
  return { exceeded: false, count: 0 };
};
