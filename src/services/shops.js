import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const shopsService = {
  async getShopDetails(shopId) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (error) return null;
    return data;
  },

  async updateShopDetails(shopId, updateData) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('shops')
      .update({
        name: updateData.name,
        phone: updateData.phone,
        email: updateData.email,
        address: updateData.address,
        currency: updateData.currency || 'INR',
        timezone: updateData.timezone || 'Asia/Kolkata',
        updated_at: new Date().toISOString()
      })
      .eq('id', shopId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async getShopSettings(shopId) {
    if (!isSupabaseConfigured) return {};
    const { data, error } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('shop_id', shopId);

    if (error) return {};
    const settingsMap = {};
    data.forEach(item => {
      settingsMap[item.setting_key] = item.setting_value;
    });
    return settingsMap;
  },

  async setShopSetting(shopId, key, value) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('shop_settings')
      .upsert({
        shop_id: shopId,
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'shop_id, setting_key' })
      .select();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
};
