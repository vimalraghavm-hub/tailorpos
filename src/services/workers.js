import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

const EDGE_FUNCTION_NAME = 'manage-workers';

export const DEFAULT_WORKER_PERMISSIONS = {
  VIEW_REGISTERS: true,
  VIEW_ASSIGNED_ORDERS: true,
  UPDATE_PRODUCTION_STATUS: true,
  MARK_WORK_COMPLETE: true,
  VIEW_CUSTOMER_PROFILE: false,
  VIEW_CUSTOMER_CONTACT: false,
  VIEW_PAYMENTS: false,
  SEND_WHATSAPP: false,
  MANAGE_WORKFLOW: false,
  VIEW_ALL_ORDERS: false
};

export const workersService = {
  /**
   * Fetch all worker profiles for a shop
   */
  async getWorkers(shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, order_assignments(id, order_id, status)')
          .eq('shop_id', shopId)
          .eq('role', 'WORKER')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(w => ({
            ...w,
            permissions: typeof w.permissions === 'object' && w.permissions ? w.permissions : DEFAULT_WORKER_PERMISSIONS,
            assignedCount: (w.order_assignments || []).filter(a => a.status === 'ACTIVE').length
          }));
        }
      }

      // Demo/local storage fallback
      const saved = typeof window !== 'undefined' ? localStorage.getItem('tailorpos_workers_list') : null;
      if (saved) {
        return JSON.parse(saved);
      }

      // Default demo worker profiles
      const demoWorkers = [
        {
          id: 'w-101',
          shop_id: shopId,
          full_name: 'Master Tailor Ramesh',
          email: 'worker1@mohittailoring.app',
          role: 'WORKER',
          is_active: true,
          permissions: { ...DEFAULT_WORKER_PERMISSIONS, VIEW_ALL_ORDERS: true },
          assignedCount: 3,
          created_at: new Date().toISOString()
        },
        {
          id: 'w-102',
          shop_id: shopId,
          full_name: 'Stitching Specialist Suresh',
          email: 'worker2@mohittailoring.app',
          role: 'WORKER',
          is_active: true,
          permissions: { ...DEFAULT_WORKER_PERMISSIONS },
          assignedCount: 1,
          created_at: new Date().toISOString()
        }
      ];

      return demoWorkers;
    } catch (e) {
      console.error("Error fetching workers:", e);
      return [];
    }
  },

  /**
   * Create a new worker account
   */
  async createWorker({ shopId = 'a1000000-0000-0000-0000-000000000001', email, password, fullName, permissions }) {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
          body: {
            action: 'CREATE_WORKER',
            shopId,
            email,
            password,
            fullName,
            permissions: permissions || DEFAULT_WORKER_PERMISSIONS
          }
        });

        if (!error && data?.success) {
          return { success: true, worker: data.worker };
        }

        if (error || data?.error) {
          return { success: false, error: data?.error || error?.message || "Failed to create worker account" };
        }
      }

      // Standalone/Demo fallback
      const newWorker = {
        id: `w-${Date.now()}`,
        shop_id: shopId,
        full_name: fullName,
        email: email.toLowerCase().trim(),
        role: 'WORKER',
        is_active: true,
        permissions: permissions || DEFAULT_WORKER_PERMISSIONS,
        assignedCount: 0,
        created_at: new Date().toISOString()
      };

      const existingWorkers = await this.getWorkers(shopId);
      const updated = [newWorker, ...existingWorkers];
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailorpos_workers_list', JSON.stringify(updated));
      }

      return { success: true, worker: newWorker };
    } catch (e) {
      console.error("Error creating worker:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Update worker granular permissions
   */
  async updatePermissions(workerId, permissions, shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ permissions, updated_at: new Date().toISOString() })
          .eq('id', workerId)
          .select()
          .single();

        if (!error && data) {
          return { success: true, worker: data };
        }
      }

      // Standalone/Demo fallback
      const workers = await this.getWorkers(shopId);
      const updated = workers.map(w => w.id === workerId ? { ...w, permissions } : w);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailorpos_workers_list', JSON.stringify(updated));
      }
      return { success: true };
    } catch (e) {
      console.error("Error updating worker permissions:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Enable / Disable worker account
   */
  async toggleStatus(workerId, isActive, shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', workerId)
          .select()
          .single();

        if (!error && data) {
          return { success: true, worker: data };
        }
      }

      const workers = await this.getWorkers(shopId);
      const updated = workers.map(w => w.id === workerId ? { ...w, is_active: isActive } : w);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailorpos_workers_list', JSON.stringify(updated));
      }
      return { success: true };
    } catch (e) {
      console.error("Error toggling worker status:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Assign an order to a worker
   */
  async assignOrder({ shopId = 'a1000000-0000-0000-0000-000000000001', orderId, workerId, assignedBy = null }) {
    try {
      if (isSupabaseConfigured && supabase) {
        // Mark existing active assignment as INACTIVE
        await supabase
          .from('order_assignments')
          .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
          .eq('order_id', orderId)
          .eq('status', 'ACTIVE');

        if (workerId) {
          const { data, error } = await supabase
            .from('order_assignments')
            .insert([{
              shop_id: shopId,
              order_id: orderId,
              worker_id: workerId,
              assigned_by: assignedBy,
              status: 'ACTIVE'
            }])
            .select()
            .single();

          if (error) return { success: false, error: error.message };
          return { success: true, assignment: data };
        }
        return { success: true, message: "Worker assignment removed" };
      }

      // Standalone/Demo fallback
      const savedMap = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_order_assignments') || '{}') : {};
      if (workerId) {
        savedMap[orderId] = workerId;
      } else {
        delete savedMap[orderId];
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailorpos_order_assignments', JSON.stringify(savedMap));
      }
      return { success: true };
    } catch (e) {
      console.error("Error assigning order to worker:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Get all active order assignments for a shop
   */
  async getAssignments(shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('order_assignments')
          .select('*, profiles(id, full_name, email)')
          .eq('shop_id', shopId)
          .eq('status', 'ACTIVE');

        if (!error && data) {
          const map = {};
          data.forEach(row => {
            map[row.order_id] = {
              assignmentId: row.id,
              workerId: row.worker_id,
              workerName: row.profiles?.full_name || 'Assigned Worker',
              assignedAt: row.assigned_at
            };
          });
          return map;
        }
      }

      return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_order_assignments') || '{}') : {};
    } catch (e) {
      console.error("Error fetching order assignments:", e);
      return {};
    }
  }
};
