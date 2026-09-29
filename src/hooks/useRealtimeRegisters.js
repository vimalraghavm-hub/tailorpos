import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { resolveStatusConflict } from '../utils/conflictResolver';

// Unique client-side session identifier for broadcast deduplication
export const CLIENT_SESSION_ID = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

/**
 * Realtime Subscription Hook for Production Registers
 * Listens to postgres_changes on orders, order_items, and production_tasks.
 * Deduplicates self-originated events and immutably updates local orders state.
 *
 * @param {Array} orders - Current orders state
 * @param {Function} setOrders - React state dispatcher for orders
 * @param {Function} [showToast] - Optional non-blocking toast callback
 * @param {string} [currentUserId] - Logged in worker / user ID
 */
export function useRealtimeRegisters(orders, setOrders, showToast = null, currentUserId = null) {
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('realtime:registers_v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (!newRow && !oldRow) return;

          // Deduplication: Ignore broadcasts triggered by this local client session
          if (newRow?.client_session_id && newRow.client_session_id === CLIENT_SESSION_ID) {
            return;
          }

          if (eventType === 'INSERT' && newRow) {
            setOrders((prev) => {
              const exists = prev.some(
                (o) => String(o.id) === String(newRow.id) || String(o.invoice_number) === String(newRow.invoice_number)
              );
              if (exists) return prev;
              return [newRow, ...prev];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            setOrders((prev) =>
              prev.map((order) => {
                const isTarget =
                  String(order.id) === String(newRow.id) ||
                  String(order.invoice_number) === String(newRow.invoice_number);
                if (!isTarget) return order;

                // Resolve pipeline status conflicts
                const { winnerStatus } = resolveStatusConflict(
                  order.status || order.overall_status,
                  newRow.status || newRow.overall_status,
                  (msg) => {
                    if (typeof showToast === 'function') {
                      showToast('Concurrency Notice', msg, 'info');
                    }
                  }
                );

                const updated = JSON.parse(JSON.stringify(order));
                updated.status = winnerStatus;
                updated.overall_status = winnerStatus;
                if (newRow.total_paid !== undefined) updated.total_paid = newRow.total_paid;
                if (newRow.balance_amount !== undefined) updated.balance_amount = newRow.balance_amount;
                updated.version = newRow.version || (updated.version || 1) + 1;
                updated.updated_at = newRow.updated_at || new Date().toISOString();

                if (Array.isArray(newRow.services) && newRow.services.length > 0) {
                  updated.services = newRow.services;
                } else if (Array.isArray(updated.services)) {
                  updated.services = updated.services.map((s) => ({
                    ...s,
                    status: winnerStatus,
                    task_status: winnerStatus
                  }));
                }

                return updated;
              })
            );
          } else if (eventType === 'DELETE' && oldRow) {
            setOrders((prev) => prev.filter((o) => String(o.id) !== String(oldRow.id)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_tasks' },
        (payload) => {
          const { eventType, new: newRow } = payload;
          if (!newRow) return;

          if (eventType === 'UPDATE' || eventType === 'INSERT') {
            setOrders((prev) =>
              prev.map((order) => {
                const isTarget = (order.dbId && String(order.dbId) === String(newRow.order_id)) ||
                                 (order.id && String(order.id) === String(newRow.order_id)) ||
                                 (order.invoice_number && String(order.invoice_number) === String(newRow.order_id));
                if (!isTarget) return order;

                const updated = JSON.parse(JSON.stringify(order));
                const { winnerStatus } = resolveStatusConflict(
                  updated.status,
                  newRow.status,
                  (msg) => showToast && showToast('Concurrency Notice', msg, 'info')
                );

                updated.status = winnerStatus;
                updated.overall_status = winnerStatus;
                return updated;
              })
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_statuses' },
        (payload) => {
          const { eventType, new: newRow } = payload;
          if (!newRow) return;

          if (eventType === 'UPDATE' || eventType === 'INSERT') {
            setOrders((prev) =>
              prev.map((order) => {
                const isTarget = (order.dbId && String(order.dbId) === String(newRow.order_id)) ||
                                 (order.id && String(order.id) === String(newRow.order_id)) ||
                                 (order.id && String(order.id) === String(newRow.id)) ||
                                 (order.invoice_number && String(order.invoice_number) === String(newRow.order_id));
                if (!isTarget) return order;

                const updated = JSON.parse(JSON.stringify(order));
                const targetStatus = newRow.status || newRow.name;
                if (targetStatus) {
                  const { winnerStatus } = resolveStatusConflict(
                    updated.status,
                    targetStatus,
                    (msg) => showToast && showToast('Concurrency Notice', msg, 'info')
                  );
                  updated.status = winnerStatus;
                  updated.overall_status = winnerStatus;
                }
                return updated;
              })
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        (payload) => {
          const { eventType, new: newRow } = payload;
          if (!newRow) return;

          if (eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((order) => {
                const isTarget = (order.dbId && String(order.dbId) === String(newRow.order_id)) ||
                                 (order.id && String(order.id) === String(newRow.order_id)) ||
                                 (order.invoice_number && String(order.invoice_number) === String(newRow.order_id));
                if (!isTarget) return order;

                const updated = JSON.parse(JSON.stringify(order));
                if (Array.isArray(updated.services)) {
                  updated.services = updated.services.map((s) => {
                    if (
                      String(s.id) === String(newRow.id) ||
                      String(s.serviceId) === String(newRow.service_id) ||
                      String(s.dbId || '') === String(newRow.id)
                    ) {
                      return { ...s, status: newRow.status, task_status: newRow.status };
                    }
                    return s;
                  });

                  const statuses = updated.services.map(s => (s.status || 'PENDING').toUpperCase());
                  let overall = 'IN PROGRESS';
                  if (statuses.length > 0) {
                    if (statuses.every(st => st === 'DELIVERED')) overall = 'DELIVERED';
                    else if (statuses.every(st => st === 'READY')) overall = 'READY';
                    else if (statuses.every(st => st === 'PENDING')) overall = 'PENDING';
                  }
                  updated.status = overall;
                  updated.overall_status = overall;
                }
                return updated;
              })
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setOrders, showToast, currentUserId]);
}
