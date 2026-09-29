import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { DEFAULT_WORKER_PERMISSIONS } from './workers';

export const authService = {
  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      // 1. Query the workers table first using ilike for email case insensitivity
      try {
        const { data: worker, error: workerErr } = await supabase
          .from('workers')
          .select('*')
          .ilike('email', cleanEmail)
          .eq('password', password)
          .maybeSingle();

        if (!workerErr && worker) {
          // b. Check if worker account is deactivated
          if (worker.is_active === false || worker.status === 'INACTIVE' || worker.is_online === false) {
            return { success: false, error: 'Account disabled by shop owner.' };
          }

          const workerProfile = {
            ...worker,
            id: worker.id,
            full_name: worker.name || worker.full_name || 'Worker Profile',
            name: worker.name || worker.full_name || 'Worker Profile',
            role: 'WORKER'
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify({ ...workerProfile, role: 'WORKER', id: worker.id }));
            localStorage.setItem('tailorpos_profile', JSON.stringify(workerProfile));
          }

          return { 
            success: true, 
            user: { id: worker.id, email: worker.email, ...workerProfile }, 
            profile: workerProfile 
          };
        }
      } catch (err) {
        console.warn("Notice: Workers table lookup notice:", err?.message || err);
      }

      // c. IF NO WORKER MATCHES, fallback to owner login using Supabase Auth:
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (!error && data?.user) {
          const profile = await this.getCurrentProfile(data.user.id, cleanEmail);

          const ownerProfile = profile || {
            id: data.user.id,
            auth_user_id: data.user.id,
            shop_id: 'a1000000-0000-0000-0000-000000000001',
            full_name: data.user.email ? data.user.email.split('@')[0] : 'Shop Owner',
            email: data.user.email,
            role: 'OWNER',
            is_online: true,
            is_active: true,
            permissions: DEFAULT_WORKER_PERMISSIONS
          };

          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify({ ...ownerProfile, role: 'OWNER', id: data.user.id }));
            localStorage.setItem('tailorpos_profile', JSON.stringify(ownerProfile));
          }

          return { 
            success: true, 
            user: data.user, 
            profile: ownerProfile 
          };
        }
      } catch (err) {
        console.warn("Notice: Owner Supabase Auth lookup notice:", err?.message || err);
      }
    }

    // Local / Demo Login Fallback
    const savedWorkers = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('tailorpos_workers_list') || '[]') : [];
    const matchedWorker = savedWorkers.find(w => w.email.toLowerCase() === cleanEmail && (w.password === password || !w.password));

    if (matchedWorker) {
      if (matchedWorker.is_active === false || matchedWorker.status === 'INACTIVE' || matchedWorker.is_online === false) {
        return { success: false, error: 'Account disabled by shop owner.' };
      }
      const workerProfile = { ...matchedWorker, role: 'WORKER', id: matchedWorker.id };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(workerProfile));
        localStorage.setItem('tailorpos_profile', JSON.stringify(workerProfile));
      }
      return { success: true, user: { id: matchedWorker.id, email: matchedWorker.email, ...workerProfile }, profile: workerProfile };
    }

    if (cleanEmail === 'owner@mohittailoring.app' || cleanEmail.includes('owner')) {
      const ownerProfile = {
        id: 'owner-1',
        auth_user_id: 'owner-1',
        shop_id: 'a1000000-0000-0000-0000-000000000001',
        full_name: 'Shop Owner',
        email: cleanEmail,
        role: 'OWNER',
        is_online: true,
        is_active: true
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(ownerProfile));
        localStorage.setItem('tailorpos_profile', JSON.stringify(ownerProfile));
      }
      return { success: true, user: { id: 'owner-1', email: cleanEmail }, profile: ownerProfile };
    }

    // d. Display "Invalid email or password" only when neither lookup succeeds
    return { success: false, error: 'Invalid email or password.' };
  },

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('tailorpos_profile');
      localStorage.removeItem('tailorpos_user');
      localStorage.removeItem('tailorpos_session');
    }
    if (!isSupabaseConfigured || !supabase) return { success: true };
    try {
      await supabase.auth.signOut();
      return { success: true };
    } catch (e) {
      console.warn("Supabase auth.signOut warning caught cleanly:", e?.message || e);
      return { success: true };
    }
  },

  async getCurrentSession() {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session || null;
    } catch (e) {
      return null;
    }
  },

  async getCurrentProfile(userId, email = '') {
    if (!isSupabaseConfigured) return null;
    
    // First check workers table using ilike
    if (email) {
      try {
        const { data: workerData } = await supabase
          .from('workers')
          .select('*')
          .ilike('email', email.trim())
          .maybeSingle();

        if (workerData) {
          return {
            ...workerData,
            full_name: workerData.name || workerData.full_name || 'Worker Profile',
            role: 'WORKER'
          };
        }
      } catch (_) {}
    }

    try {
      let { data } = await supabase
        .from('profiles')
        .select('*, shops(*)')
        .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();

      if (!data) {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user && user.id === userId) {
          return {
            id: user.id,
            auth_user_id: user.id,
            shop_id: 'a1000000-0000-0000-0000-000000000001',
            full_name: user.email ? user.email.split('@')[0] : 'Shop Owner',
            email: user.email || '',
            role: 'OWNER',
            is_online: true,
            is_active: true,
            permissions: DEFAULT_WORKER_PERMISSIONS,
            shops: {
              id: 'a1000000-0000-0000-0000-000000000001',
              name: 'Mohit Tailoring POS',
              currency_symbol: '₹'
            }
          };
        }
      }
      return data;
    } catch (e) {
      return null;
    }
  }
};
