import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const authService = {
  async login(email, password) {
    if (!isSupabaseConfigured) {
      // Demo authentication simulation
      const cleanEmail = email.toLowerCase().trim();
      let role = 'WORKER';
      let name = 'Worker User';

      if (cleanEmail.includes('owner')) {
        role = 'OWNER';
        name = 'Mohit Owner';
      } else if (cleanEmail.includes('crm')) {
        role = 'CRM';
        name = 'CRM Manager';
      }

      return {
        success: true,
        user: { id: 'demo-user-123', email: cleanEmail },
        profile: {
          id: 'demo-profile-123',
          shop_id: 'a1000000-0000-0000-0000-000000000001',
          full_name: name,
          email: cleanEmail,
          role,
          is_active: true
        }
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Retrieve user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      return { 
        success: true, 
        user: data.user, 
        profile: {
          id: data.user.id,
          shop_id: 'a1000000-0000-0000-0000-000000000001',
          full_name: data.user.email.split('@')[0],
          email: data.user.email,
          role: 'OWNER',
          is_active: true
        }
      };
    }

    return { success: true, user: data.user, profile };
  },

  async logout() {
    if (!isSupabaseConfigured) return { success: true };
    const { error } = await supabase.auth.signOut();
    return { success: !error, error: error?.message };
  },

  async getCurrentSession() {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getCurrentProfile(userId) {
    if (!isSupabaseConfigured || !userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*, shops(*)')
      .eq('auth_user_id', userId)
      .single();

    if (error) return null;
    return data;
  }
};
