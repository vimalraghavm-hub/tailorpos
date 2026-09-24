import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const productionService = {
  async getProductionStatuses(shopId) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('production_statuses')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) return null;
    return data;
  },

  async addProductionStatus(shopId, statusName) {
    if (!isSupabaseConfigured) return null;
    const cleanName = statusName.trim().toUpperCase();

    // Get max sort_order
    const { data: existing } = await supabase
      .from('production_statuses')
      .select('sort_order')
      .eq('shop_id', shopId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order + 1) : 1;

    const { data, error } = await supabase
      .from('production_statuses')
      .insert([{
        shop_id: shopId,
        name: cleanName,
        sort_order: nextOrder,
        is_active: true,
        is_system: false
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async updateItemStatus(shopId, orderId, orderItemId, newStatusName, profileId = null) {
    if (!isSupabaseConfigured) return { success: true };
    const cleanStatus = newStatusName.trim().toUpperCase();

    // Update line item status
    const { data, error } = await supabase
      .from('order_items')
      .update({ status: cleanStatus, updated_at: new Date().toISOString() })
      .eq('id', orderItemId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Record audit history
    await supabase.from('order_status_history').insert([{
      shop_id: shopId,
      order_id: orderId,
      order_item_id: orderItemId,
      status_name: cleanStatus,
      changed_by: profileId || null,
      changed_at: new Date().toISOString()
    }]);

    return { success: true, data };
  }
};
