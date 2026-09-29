import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { resolveMeasurementConflict } from '../utils/conflictResolver';

/**
 * Realtime Subscription Hook for Customer Body Measurement Presets
 * Listens to postgres_changes on customer_measurements and measurements tables.
 * Resolves concurrent updates using Last-Write-Wins (LWW) versioning and timestamps.
 *
 * @param {Array} customerMeasurements - Current measurements state
 * @param {Function} setCustomerMeasurements - State dispatcher
 * @param {Function} [showToast] - Optional notification callback
 */
export function useRealtimeMeasurements(customerMeasurements, setCustomerMeasurements, showToast = null) {
  const measurementsRef = useRef(customerMeasurements);
  measurementsRef.current = customerMeasurements;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('realtime:measurements_v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_measurements' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (!newRow && !oldRow) return;

          if (eventType === 'INSERT' && newRow) {
            setCustomerMeasurements((prev) => {
              const exists = (prev || []).some((m) => String(m.id) === String(newRow.id));
              if (exists) return prev;
              return [newRow, ...(prev || [])];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            setCustomerMeasurements((prev) =>
              (prev || []).map((m) => {
                if (String(m.id) === String(newRow.id)) {
                  return resolveMeasurementConflict(m, newRow);
                }
                return m;
              })
            );
          } else if (eventType === 'DELETE' && oldRow) {
            setCustomerMeasurements((prev) => (prev || []).filter((m) => String(m.id) !== String(oldRow.id)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'measurements' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (!newRow && !oldRow) return;

          if (eventType === 'INSERT' && newRow) {
            setCustomerMeasurements((prev) => {
              const exists = (prev || []).some((m) => String(m.id) === String(newRow.id));
              if (exists) return prev;
              return [newRow, ...(prev || [])];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            setCustomerMeasurements((prev) =>
              (prev || []).map((m) => {
                if (String(m.id) === String(newRow.id)) {
                  return resolveMeasurementConflict(m, newRow);
                }
                return m;
              })
            );
          } else if (eventType === 'DELETE' && oldRow) {
            setCustomerMeasurements((prev) => (prev || []).filter((m) => String(m.id) !== String(oldRow.id)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setCustomerMeasurements, showToast]);
}
