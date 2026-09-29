import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { measurementsService } from './measurements';

export const customersService = {
  async getCustomers(shopId) {
    if (!isSupabaseConfigured) return null;
    const { data: custData, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return null;
    }

    const { data: measData } = await supabase.from('measurements').select('*').eq('shop_id', shopId);
    const measMap = (measData || []).reduce((acc, m) => {
      const k = String(m.customer_id);
      if (!acc[k]) acc[k] = [];
      acc[k].push(m);
      return acc;
    }, {});

    return (custData || []).map(c => ({
      ...c,
      measurements: measMap[String(c.id)] || []
    }));
  },

  async searchCustomers(shopId, query) {
    if (!isSupabaseConfigured || !query.trim()) return [];
    const cleanQuery = query.trim().toLowerCase();

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_deleted', false)
      .or(`phone.ilike.%${cleanQuery}%,name.ilike.%${cleanQuery}%`)
      .limit(10);

    if (error) return [];
    return data;
  },

  async createCustomer(shopId, customerData) {
    if (!isSupabaseConfigured) return null;

    // Check if customer with same phone already exists
    if (customerData.phone) {
      const cleanPhone = customerData.phone.trim();
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shopId)
        .eq('phone', cleanPhone)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existing) {
        return { success: true, data: existing, isExisting: true };
      }
    }

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
      console.error('Error creating customer:', error.message, error.details || '');
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async createCustomerWithMeasurements(shopId, customerData) {
    if (!isSupabaseConfigured) return null;

    // Try atomic RPC function first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_customer_with_measurements_transaction', {
        p_shop_id: shopId,
        p_name: customerData.name?.trim() || 'Customer',
        p_phone: customerData.phone?.trim() || '',
        p_country_code: customerData.country_code || '+91',
        p_email: customerData.email || null,
        p_address: customerData.address || null,
        p_notes: customerData.notes || null,
        p_measurements: customerData.measurements || {}
      });

      if (!rpcErr && rpcRes?.success) {
        if (customerData.measurements) {
          await measurementsService.saveAllCustomerMeasurements(shopId, rpcRes.customer_id, customerData.measurements);
        }

        const { data: createdCust } = await supabase
          .from('customers')
          .select('*')
          .eq('id', rpcRes.customer_id)
          .single();

        return { success: true, data: createdCust };
      }
    } catch (e) {
      console.warn('RPC create_customer_with_measurements_transaction exception, using fallback:', e);
    }

    // Fallback: Create customer + batch measurements
    const custRes = await this.createCustomer(shopId, customerData);
    if (!custRes?.success || !custRes.data) {
      return custRes;
    }

    if (customerData.measurements) {
      await measurementsService.saveAllCustomerMeasurements(shopId, custRes.data.id, customerData.measurements);
    }

    const { data: finalCust } = await supabase
      .from('customers')
      .select('*')
      .eq('id', custRes.data.id)
      .single();

    return { success: true, data: finalCust || custRes.data };
  },

  async getCustomerProfileAndOrders(customerId) {
    if (!isSupabaseConfigured || !customerId) return null;

    try {
      // Step A: Fetch customer record
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', String(customerId))
        .single();

      if (custErr || !customer) return null;

      // Step B: Fetch orders for customer
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', String(customerId))
        .order('created_at', { ascending: false });

      // Step C: Return attached customer data cleanly
      return { ...customer, customer, orders: customerOrders || [] };
    } catch (err) {
      console.error("Error in getCustomerProfileAndOrders:", err);
      return null;
    }
  },

  async getCustomerFullProfile(shopId, customerId) {
    if (!isSupabaseConfigured || !customerId) return null;

    try {
      // Step A: Fetch customer record
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', String(customerId))
        .single();

      if (custErr || !customer) return null;

      // Step B: Fetch orders for customer
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', String(customerId))
        .order('created_at', { ascending: false });

      // Fetch measurements separately
      const { data: measRes } = await supabase
        .from('measurements')
        .select('*')
        .eq('customer_id', String(customerId));

      const measurementsObj = {};
      if (measRes && Array.isArray(measRes)) {
        measRes.forEach(m => {
          if (m.garment_type) {
            const typeKey = m.garment_type.toLowerCase();
            measurementsObj[typeKey] = {
              ...(m.measurements || {}),
              notes: m.notes || m.measurements?.notes || '',
              suppliedGarment: Boolean(m.is_customer_supplied || m.measurements?.suppliedGarment)
            };
          }
        });
      }

      return {
        customer,
        ...customer,
        measurements: measurementsObj,
        orders: customerOrders || []
      };
    } catch (err) {
      console.error("Error in getCustomerFullProfile:", err);
      return null;
    }
  },

  async updateCustomer(customerId, updateData) {
    if (!isSupabaseConfigured) return { success: true };

    const updatePayload = {
      updated_at: new Date().toISOString()
    };
    if (updateData.name !== undefined) updatePayload.name = updateData.name.trim();
    if (updateData.phone !== undefined) updatePayload.phone = updateData.phone.trim();
    if (updateData.address !== undefined) updatePayload.address = updateData.address;
    if (updateData.notes !== undefined) updatePayload.notes = updateData.notes;
    if (updateData.is_favourite !== undefined) updatePayload.is_favourite = Boolean(updateData.is_favourite);

    const { data, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error.message, error.details || '');
      return { success: false, error: error.message };
    }

    if (updateData.measurements && data?.shop_id) {
      await measurementsService.saveAllCustomerMeasurements(data.shop_id, customerId, updateData.measurements);
    }

    return { success: true, data };
  },

  async toggleCustomerFavourite(customerId, isFavourite) {
    if (!isSupabaseConfigured) return { success: true };
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({ is_favourite: Boolean(isFavourite), updated_at: new Date().toISOString() })
        .eq('id', customerId)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Notice: is_favourite column could not be updated on database (using local state fallback):', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (e) {
      console.warn('Notice: Exception updating is_favourite on database:', e?.message || e);
      return { success: false, error: e?.message };
    }
  },

  async updateCustomerLastOrderDate(customerId) {
    if (!isSupabaseConfigured || !customerId) return { success: true };
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('customers')
        .update({ last_order_date: nowIso, updated_at: nowIso })
        .eq('id', customerId)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Notice: last_order_date column notice on customer table:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (e) {
      console.warn('Notice: Exception updating customer last_order_date:', e?.message || e);
      return { success: false, error: e?.message };
    }
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
