// ============================================================================
// MOHIT TAILORING POS - CONFLICT RESOLUTION & OCC UTILITIES
// ============================================================================

/**
 * Pipeline Stage Priority Map
 * Higher numerical value = advanced stage in tailoring workflow.
 */
export const STATUS_PRIORITY = {
  PENDING: 1,
  CUTTING: 2,
  STITCHING: 3,
  FITTING: 4,
  PACKING: 5,
  READY: 6,
  DELIVERED: 7
};

/**
 * Resolves priority value for a given status string.
 */
export const getStatusPriority = (statusName) => {
  if (!statusName) return 1;
  const key = String(statusName).trim().toUpperCase();
  return STATUS_PRIORITY[key] || 2; // Default custom stages to priority level 2
};

/**
 * Resolves production status conflict between local state vs incoming remote broadcast payload.
 * Applies Pipeline Stage Priority (higher stage wins) or LWW for equal priority stages.
 *
 * @param {string} currentStatus - Current local order/task status
 * @param {string} incomingStatus - Incoming broadcast payload status
 * @param {Function} [onConflictNotify] - Optional callback to trigger toast notification
 * @returns {{ winnerStatus: string, wasOverridden: boolean }}
 */
export function resolveStatusConflict(currentStatus, incomingStatus, onConflictNotify = null) {
  if (!currentStatus) return { winnerStatus: incomingStatus || 'PENDING', wasOverridden: false };
  if (!incomingStatus) return { winnerStatus: currentStatus, wasOverridden: false };

  const currentPri = getStatusPriority(currentStatus);
  const incomingPri = getStatusPriority(incomingStatus);

  if (incomingPri >= currentPri) {
    return { winnerStatus: incomingStatus, wasOverridden: false };
  } else {
    if (typeof onConflictNotify === 'function') {
      onConflictNotify(
        `Retained higher-priority status "${currentStatus.toUpperCase()}" over incoming "${incomingStatus.toUpperCase()}"`
      );
    }
    return { winnerStatus: currentStatus, wasOverridden: true };
  }
}

/**
 * Last-Write-Wins (LWW) Conflict Resolver for body measurement preset updates.
 * Compares `version` column first, falling back to `updated_at` / `updatedAt` timestamps.
 *
 * @param {Object} localMeasurement - Existing local measurement record
 * @param {Object} incomingMeasurement - Incoming remote measurement record
 * @returns {Object} Winning measurement record
 */
export function resolveMeasurementConflict(localMeasurement, incomingMeasurement) {
  if (!localMeasurement) return incomingMeasurement;
  if (!incomingMeasurement) return localMeasurement;

  const localVersion = Number(localMeasurement.version || 0);
  const incomingVersion = Number(incomingMeasurement.version || 0);

  if (incomingVersion > localVersion) {
    return incomingMeasurement;
  } else if (incomingVersion < localVersion) {
    return localMeasurement;
  }

  // Fallback to timestamp comparison
  const localTime = new Date(localMeasurement.updated_at || localMeasurement.updatedAt || 0).getTime();
  const incomingTime = new Date(incomingMeasurement.updated_at || incomingMeasurement.updatedAt || 0).getTime();

  return incomingTime >= localTime ? incomingMeasurement : localMeasurement;
}
