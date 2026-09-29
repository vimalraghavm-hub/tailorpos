import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const DEFAULT_WORKER_PERMISSIONS = {
  tabs: ['registers', 'dashboard'],
  view_all_orders: false,
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
   * Fetch all worker profiles for a shop from workers table / profiles table
   */
  async getWorkers(shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        // Flat query order_assignments to count active assignments per worker
        let activeAssignments = [];
        try {
          const { data: assignData } = await supabase
            .from('order_assignments')
            .select('*')
            .eq('shop_id', shopId)
            .eq('status', 'ACTIVE');
          if (assignData) activeAssignments = assignData;
        } catch (e) {}

        // Flat query customer_assignments to count active customer assignments per worker
        let activeCustAssignments = [];
        try {
          const { data: custAssignData } = await supabase
            .from('customer_assignments')
            .select('*')
            .eq('shop_id', shopId)
            .eq('status', 'ACTIVE');
          if (custAssignData) activeCustAssignments = custAssignData;
        } catch (e) {}

        // First fetch from public.workers table
        const { data: workersData, error: workersErr } = await supabase
          .from('workers')
          .select('*')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false });

        if (!workersErr && workersData && workersData.length > 0) {
          return workersData.map(w => {
            const wIdStr = String(w.id || '').trim();
            const authIdStr = String(w.auth_user_id || '').trim();
            const ordCount = activeAssignments.filter(a => String(a.worker_id || '').trim() === wIdStr || (authIdStr && String(a.worker_id || '').trim() === authIdStr)).length;
            const custCount = activeCustAssignments.filter(a => String(a.worker_id || '').trim() === wIdStr || (authIdStr && String(a.worker_id || '').trim() === authIdStr)).length;
            return {
              ...w,
              full_name: w.name || w.full_name || 'Worker Profile',
              name: w.name || w.full_name || 'Worker Profile',
              is_online: w.is_online !== false && w.is_active !== false,
              is_active: w.is_online !== false && w.is_active !== false,
              permissions: typeof w.permissions === 'object' && w.permissions ? w.permissions : DEFAULT_WORKER_PERMISSIONS,
              assignedCount: ordCount,
              assignedCustomersCount: custCount
            };
          });
        }

        // Fallback to public.profiles table
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('shop_id', shopId)
          .eq('role', 'WORKER')
          .order('created_at', { ascending: false });

        if (!profilesErr && profilesData) {
          return profilesData.map(w => {
            const wIdStr = String(w.id || '').trim();
            const authIdStr = String(w.auth_user_id || '').trim();
            const ordCount = activeAssignments.filter(a => String(a.worker_id || '').trim() === wIdStr || (authIdStr && String(a.worker_id || '').trim() === authIdStr)).length;
            const custCount = activeCustAssignments.filter(a => String(a.worker_id || '').trim() === wIdStr || (authIdStr && String(a.worker_id || '').trim() === authIdStr)).length;
            return {
              ...w,
              full_name: w.full_name || w.name || 'Worker Profile',
              name: w.full_name || w.name || 'Worker Profile',
              is_online: w.is_online !== false && w.is_active !== false,
              is_active: w.is_online !== false && w.is_active !== false,
              permissions: typeof w.permissions === 'object' && w.permissions ? w.permissions : DEFAULT_WORKER_PERMISSIONS,
              assignedCount: ordCount,
              assignedCustomersCount: custCount
            };
          });
        }
      }

      // Local storage fallback
      const saved = typeof window !== 'undefined' ? localStorage.getItem('tailorpos_workers_list') : null;
      if (saved) {
        return JSON.parse(saved);
      }

      const demoWorkers = [
        {
          id: 'w-101',
          shop_id: shopId,
          full_name: 'Master Tailor Ramesh',
          name: 'Master Tailor Ramesh',
          phone: '+91 9876543210',
          email: 'worker1@mohittailoring.app',
          role: 'WORKER',
          is_online: true,
          is_active: true,
          permissions: { ...DEFAULT_WORKER_PERMISSIONS, tabs: ['registers', 'dashboard', 'customers'], VIEW_ALL_ORDERS: true, view_all_orders: true, VIEW_CUSTOMER_PROFILE: true },
          assignedCount: 3,
          created_at: new Date().toISOString()
        },
        {
          id: 'w-102',
          shop_id: shopId,
          full_name: 'Stitching Specialist Suresh',
          name: 'Stitching Specialist Suresh',
          phone: '+91 9876543211',
          email: 'worker2@mohittailoring.app',
          role: 'WORKER',
          is_online: true,
          is_active: true,
          permissions: { ...DEFAULT_WORKER_PERMISSIONS, tabs: ['registers', 'dashboard'] },
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
   * Create worker profile by inserting directly into public.workers (No supabase.auth.signUp to prevent owner session logout)
   */
  async createWorker(workerData) {
    try {
      const shopId = workerData.shopId || workerData.shop_id || 'a1000000-0000-0000-0000-000000000001';
      const cleanEmail = (workerData.email || '').trim().toLowerCase();
      const cleanPhone = (workerData.phone || '').trim();
      const workerName = (workerData.name || workerData.fullName || workerData.full_name || cleanEmail.split('@')[0]).trim();
      const workerPermissions = workerData.permissions || DEFAULT_WORKER_PERMISSIONS;
      const rawPassword = workerData.password || '';

      const newWorkerPayload = {
        shop_id: shopId,
        name: workerName,
        full_name: workerName,
        email: cleanEmail,
        phone: cleanPhone,
        password: rawPassword,
        role: workerData.role || 'WORKER',
        status: 'ACTIVE',
        is_active: true,
        is_online: true,
        permissions: workerPermissions,
        updated_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        // Direct insert into workers table returning newly created record
        const { data: workerRecord, error: workerErr } = await supabase
          .from('workers')
          .insert([newWorkerPayload])
          .select('*')
          .single();

        if (workerErr) {
          console.error("Worker insert error:", workerErr.message);
          let userMessage = workerErr.message;
          if (workerErr.code === '23505' || workerErr.message?.includes('duplicate key') || workerErr.message?.toLowerCase().includes('already exists')) {
            userMessage = "A worker profile with this email address already exists.";
          }
          return { success: false, error: userMessage };
        }

        if (workerRecord) {
          // Sync to profiles table if present
          try {
            await supabase.from('profiles').upsert([{
              id: workerRecord.id,
              shop_id: shopId,
              full_name: workerName,
              email: cleanEmail,
              phone: cleanPhone,
              role: workerData.role || 'WORKER',
              is_active: true,
              is_online: true,
              permissions: workerPermissions,
              updated_at: new Date().toISOString()
            }], { onConflict: 'email' });
          } catch (_) {}

          return { success: true, worker: workerRecord };
        }
      }

      // Standalone/Demo fallback
      const newWorker = {
        id: `w-${Date.now()}`,
        ...newWorkerPayload,
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
      console.error("Error creating worker profile:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Update worker permissions
   */
  async updatePermissions(workerId, permissions, shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('workers')
          .update({ permissions, updated_at: new Date().toISOString() })
          .eq('id', workerId);

        await supabase
          .from('profiles')
          .update({ permissions, updated_at: new Date().toISOString() })
          .eq('id', workerId);

        return { success: true };
      }

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
   * Enable / Disable worker account (is_active & is_online)
   */
  async toggleStatus(workerId, isActive, shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        const newStatus = isActive ? 'ACTIVE' : 'INACTIVE';
        const payload = { 
          status: newStatus, 
          is_active: isActive, 
          is_online: isActive, 
          updated_at: new Date().toISOString() 
        };

        const { error: wErr } = await supabase.from('workers').update(payload).eq('id', workerId);
        if (wErr) {
          console.warn("Workers table update notice:", wErr.message);
        }

        try {
          await supabase.from('profiles').update(payload).eq('id', workerId);
        } catch (_) {}

        return { success: true };
      }

      const workers = await this.getWorkers(shopId);
      const updated = workers.map(w => w.id === workerId ? { ...w, is_active: isActive, is_online: isActive, status: isActive ? 'ACTIVE' : 'INACTIVE' } : w);
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
   * Delete worker profile (Delete associated assignment records first for clean cascading)
   */
  async deleteWorker(workerId, shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('order_assignments').delete().eq('worker_id', workerId);
        } catch (e) {}
        try {
          await supabase.from('customer_assignments').delete().eq('worker_id', workerId);
        } catch (e) {}

        await supabase.from('workers').delete().eq('id', workerId);
        await supabase.from('profiles').delete().eq('id', workerId);

        return { success: true };
      }

      const workers = await this.getWorkers(shopId);
      const updated = workers.filter(w => w.id !== workerId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailorpos_workers_list', JSON.stringify(updated));
      }
      return { success: true };
    } catch (e) {
      console.error("Error deleting worker profile:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Assign orders to workers (Clean upsert & error catching)
   */
  async assignOrder({ shopId = 'a1000000-0000-0000-0000-000000000001', orderId, workerIds = [], assignedBy = null, customerId = null, alsoAssignCustomer = false }) {
    try {
      const targetWorkerIds = Array.isArray(workerIds) ? workerIds.filter(Boolean) : (workerIds ? [workerIds] : []);
      const warnings = [];

      if (isSupabaseConfigured && supabase) {
        // Delete previous assignments for order cleanly to avoid duplicate 400 conflict
        try {
          await supabase.from('order_assignments').delete().eq('order_id', orderId);
        } catch (e) {
          console.warn("Notice deleting previous order assignments:", e);
        }

        if (targetWorkerIds.length > 0) {
          const rows = targetWorkerIds.map(wId => ({
            shop_id: shopId,
            order_id: orderId,
            worker_id: wId,
            assigned_by: assignedBy || 'owner',
            status: 'ACTIVE'
          }));

          const { error: upsertErr } = await supabase
            .from('order_assignments')
            .upsert(rows, { onConflict: 'order_id,worker_id' });

          if (upsertErr) {
            console.warn("Notice: order_assignments upsert handled:", upsertErr.message);
          }
        }

        if (alsoAssignCustomer && customerId && targetWorkerIds.length > 0) {
          await this.assignCustomer({ shopId, customerId, workerIds: targetWorkerIds, assignedBy: assignedBy || 'owner' });
        }

        const workers = await this.getWorkers(shopId);
        targetWorkerIds.forEach(wId => {
          const worker = workers.find(w => w.id === wId || w.auth_user_id === wId);
          if (worker) {
            const hasCustomerAccess = (worker.permissions?.tabs && worker.permissions.tabs.includes('customers')) || worker.permissions?.VIEW_CUSTOMER_PROFILE;
            if (!hasCustomerAccess && alsoAssignCustomer) {
              warnings.push(`Worker ${worker.full_name || worker.name} does not have access to the Customers tab yet.`);
            }
          }
        });

        return { success: true, warnings };
      }

      const savedMap = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_order_assignments') || '{}') : {};
      savedMap[orderId] = targetWorkerIds;
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailorpos_order_assignments', JSON.stringify(savedMap));
      }

      if (alsoAssignCustomer && customerId) {
        const custMap = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_customer_assignments') || '{}') : {};
        custMap[customerId] = targetWorkerIds;
        if (typeof window !== 'undefined') {
          localStorage.setItem('tailorpos_customer_assignments', JSON.stringify(custMap));
        }
      }

      return { success: true, warnings };
    } catch (e) {
      console.error("Error assigning order to worker:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Assign customer profiles to workers (Clean upsert & error catching)
   */
  async assignCustomer({ shopId = 'a1000000-0000-0000-0000-000000000001', customerId, workerIds = [], assignedBy = null }) {
    try {
      const targetWorkerIds = Array.isArray(workerIds) ? workerIds.filter(Boolean) : (workerIds ? [workerIds] : []);
      const warnings = [];

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('customer_assignments').delete().eq('customer_id', customerId);
        } catch (e) {
          console.warn("Notice deleting previous customer assignments:", e);
        }

        if (targetWorkerIds.length > 0) {
          const rows = targetWorkerIds.map(wId => ({
            shop_id: shopId,
            customer_id: customerId,
            worker_id: wId,
            assigned_by: assignedBy || 'owner',
            status: 'ACTIVE'
          }));

          const { error: upsertErr } = await supabase
            .from('customer_assignments')
            .upsert(rows, { onConflict: 'customer_id,worker_id' });

          if (upsertErr) {
            console.warn("Notice: customer_assignments upsert handled:", upsertErr.message);
          }
        }

        const workers = await this.getWorkers(shopId);
        targetWorkerIds.forEach(wId => {
          const worker = workers.find(w => w.id === wId || w.auth_user_id === wId);
          if (worker) {
            const hasCustomerAccess = (worker.permissions?.tabs && worker.permissions.tabs.includes('customers')) || worker.permissions?.VIEW_CUSTOMER_PROFILE;
            if (!hasCustomerAccess) {
              warnings.push(`Worker ${worker.full_name || worker.name} does not have access to the Customers tab yet.`);
            }
          }
        });

        return { success: true, warnings };
      }

      const custMap = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_customer_assignments') || '{}') : {};
      custMap[customerId] = targetWorkerIds;
      if (typeof window !== 'undefined') {
        localStorage.setItem('tailorpos_customer_assignments', JSON.stringify(custMap));
      }

      return { success: true, warnings };
    } catch (e) {
      console.error("Error assigning customer to worker:", e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Get all active order assignments for a shop (Flat query without nested joins)
   */
  async getAssignments(shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        let workerNameMap = {};
        try {
          const { data: wList } = await supabase.from('workers').select('id, name, full_name, email').eq('shop_id', shopId);
          if (wList) {
            wList.forEach(w => {
              workerNameMap[w.id] = w.name || w.full_name || w.email || 'Assigned Worker';
            });
          }
        } catch (e) {}

        const { data, error } = await supabase
          .from('order_assignments')
          .select('*')
          .eq('shop_id', shopId)
          .eq('status', 'ACTIVE');

        if (!error && data) {
          const map = {};
          data.forEach(row => {
            if (!map[row.order_id]) map[row.order_id] = [];
            map[row.order_id].push({
              assignmentId: row.id,
              workerId: row.worker_id,
              workerName: workerNameMap[row.worker_id] || row.worker_name || 'Assigned Worker',
              assignedAt: row.assigned_at
            });
          });
          return map;
        }
      }

      const saved = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_order_assignments') || '{}') : {};
      const normalizedMap = {};
      Object.keys(saved).forEach(orderId => {
        const val = saved[orderId];
        const arr = Array.isArray(val) ? val : [val];
        normalizedMap[orderId] = arr.map(wId => ({ workerId: wId, workerName: 'Worker' }));
      });
      return normalizedMap;
    } catch (e) {
      console.error("Error fetching order assignments:", e);
      return {};
    }
  },

  /**
   * Get all active customer assignments for a shop (Flat query without nested joins)
   */
  async getCustomerAssignments(shopId = 'a1000000-0000-0000-0000-000000000001') {
    try {
      if (isSupabaseConfigured && supabase) {
        let workerNameMap = {};
        try {
          const { data: wList } = await supabase.from('workers').select('id, name, full_name, email').eq('shop_id', shopId);
          if (wList) {
            wList.forEach(w => {
              workerNameMap[w.id] = w.name || w.full_name || w.email || 'Assigned Worker';
            });
          }
        } catch (e) {}

        const { data, error } = await supabase
          .from('customer_assignments')
          .select('*')
          .eq('shop_id', shopId)
          .eq('status', 'ACTIVE');

        if (!error && data) {
          const map = {};
          data.forEach(row => {
            if (!map[row.customer_id]) map[row.customer_id] = [];
            map[row.customer_id].push({
              assignmentId: row.id,
              workerId: row.worker_id,
              workerName: workerNameMap[row.worker_id] || row.worker_name || 'Assigned Worker',
              assignedAt: row.assigned_at
            });
          });
          return map;
        }
      }

      const saved = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_customer_assignments') || '{}') : {};
      const normalizedMap = {};
      Object.keys(saved).forEach(custId => {
        const val = saved[custId];
        const arr = Array.isArray(val) ? val : [val];
        normalizedMap[custId] = arr.map(wId => ({ workerId: wId, workerName: 'Worker' }));
      });
      return normalizedMap;
    } catch (e) {
      console.error("Error fetching customer assignments:", e);
      return {};
    }
  }
};
