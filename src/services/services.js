import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const catalogServicesService = {
  async getServices(shopId) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name');

    if (error) return null;
    return data;
  },

  async addService(shopId, serviceData) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('services')
      .insert([{
        shop_id: shopId,
        name: serviceData.name.trim(),
        default_price: parseFloat(serviceData.defaultRate) || 0.00,
        category: serviceData.category || 'General',
        is_active: true
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async updateService(serviceId, updatedData) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('services')
      .update({
        name: updatedData.name ? updatedData.name.trim() : undefined,
        default_price: updatedData.defaultRate !== undefined ? parseFloat(updatedData.defaultRate) || 0.00 : undefined,
        category: updatedData.category || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async deleteService(serviceId) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('services')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', serviceId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
};
