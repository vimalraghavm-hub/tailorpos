import { supabase, isSupabaseConfigured, isUuid } from '../lib/supabase/client';

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

  async updateItemStatus(shopId, orderId, orderItemId, newStatusName, profileId = null, overallOrderStatus = null) {
    if (!isSupabaseConfigured) return { success: true, data: null };
    const cleanStatus = newStatusName.trim().toUpperCase();

    let itemData = null;
    let itemError = null;

    // 1. Update line item status in Supabase order_items table using explicit primary key ID
    if (isUuid(orderItemId)) {
      try {
        const { data, error } = await supabase
          .from('order_items')
          .update({ status: cleanStatus, updated_at: new Date().toISOString() })
          .eq('id', orderItemId)
          .select();

        if (error) {
          console.warn("Notice updating order_items status:", error.message);
          itemError = error;
        } else {
          itemData = data;
        }
      } catch (e) {
        console.warn("Exception updating order_items status:", e);
        itemError = e;
      }
    }

    // 2. Query production_statuses table using PATCH .update() if task/status ID matches
    try {
      if (isUuid(orderItemId)) {
        const { data, error } = await supabase
          .from('production_statuses')
          .update({ name: cleanStatus, updated_at: new Date().toISOString() })
          .eq('id', orderItemId)
          .select();

        if (!error && data && data.length > 0) {
          itemData = data;
        }
      }
    } catch (e) {}

    // 3. Sync master orders table status in Supabase safely via PATCH .update()
    if (orderId && overallOrderStatus) {
      try {
        let query = supabase
          .from('orders')
          .update({ status: overallOrderStatus, updated_at: new Date().toISOString() });

        if (isUuid(orderId)) {
          query = query.eq('id', orderId);
        } else {
          query = query.eq('invoice_number', String(orderId));
        }

        await query;
      } catch (e) {
        console.warn("Notice updating master orders status:", e);
      }
    }

    // 4. Record audit history in non-blocking background promise without assigned id
    if (isUuid(orderId)) {
      const historyPayload = {
        shop_id: shopId,
        order_id: orderId,
        order_item_id: isUuid(orderItemId) ? orderItemId : null,
        status_name: cleanStatus,
        changed_by: isUuid(profileId) ? profileId : null,
        changed_at: new Date().toISOString()
      };

      Promise.resolve(
        supabase.from('order_status_history').insert([historyPayload])
      ).catch((e) => {
        console.warn('order_status_history non-fatal background notice:', e?.message || e);
      });
    }

    return { success: !itemError, data: itemData, error: itemError };
  },

  async deleteProductionStatus(shopId, statusId, statusName) {
    if (!isSupabaseConfigured) return { success: true };
    try {
      let query = supabase.from('production_statuses').delete().eq('shop_id', shopId);
      if (isUuid(statusId)) {
        query = query.eq('id', statusId);
      } else if (statusName) {
        query = query.eq('name', statusName.trim().toUpperCase());
      } else {
        query = query.eq('id', statusId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Notice deleting production status in Supabase:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (e) {
      console.warn('Exception deleting production status:', e);
      return { success: false, error: e?.message };
    }
  },

  async reorderProductionStatuses(shopId, orderedStatuses) {
    if (!isSupabaseConfigured || !Array.isArray(orderedStatuses)) return { success: true };
    try {
      const updates = orderedStatuses.map((st, index) => {
        const payload = { sort_order: index + 1, updated_at: new Date().toISOString() };
        if (isUuid(st.id)) {
          return supabase.from('production_statuses').update(payload).eq('id', st.id).eq('shop_id', shopId);
        } else if (st.name) {
          return supabase.from('production_statuses').update(payload).eq('name', st.name.trim().toUpperCase()).eq('shop_id', shopId);
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      return { success: true };
    } catch (e) {
      console.warn('Exception reordering production statuses:', e);
      return { success: false, error: e?.message };
    }
  }
};