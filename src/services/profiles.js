import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const profilesService = {
  async getProfiles(shopId) {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('shop_id', shopId)
      .order('full_name');

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
    return data;
  },

  async updateRole(profileId, newRole) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async toggleActiveStatus(profileId, isActive) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
};
