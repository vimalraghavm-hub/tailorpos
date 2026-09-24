import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const customersService = {
  async getCustomers(shopId) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('customers')
      .select('*, measurements(*)')
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return null;
    }
    return data;
  },

  async searchCustomers(shopId, query) {
    if (!isSupabaseConfigured || !query.trim()) return [];
    const cleanQuery = query.trim().toLowerCase();

    const { data, error } = await supabase
      .from('customers')
      .select('*, measurements(*)')
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .or(`phone.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%`)
      .limit(10);

    if (error) return [];
    return data;
  },

  async createCustomer(shopId, customerData) {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('customers')
      .insert([{
        shop_id: shopId,
        name: customerData.name.trim(),
        phone: customerData.phone.trim(),
        country_code: customerData.country_code || '+91',
        email: customerData.email || null,
        address: customerData.address || null,
        notes: customerData.notes || null,
        is_deleted: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async updateCustomer(customerId, updateData) {
    if (!isSupabaseConfigured) return { success: true };

    const { data, error } = await supabase
      .from('customers')
      .update({
        name: updateData.name ? updateData.name.trim() : undefined,
        phone: updateData.phone ? updateData.phone.trim() : undefined,
        address: updateData.address !== undefined ? updateData.address : undefined,
        notes: updateData.notes !== undefined ? updateData.notes : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async softDeleteCustomer(customerId) {
    if (!isSupabaseConfigured) return { success: true };

    const { data, error } = await supabase
      .from('customers')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', customerId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
};
