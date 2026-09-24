import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const measurementsService = {
  async getCustomerMeasurements(shopId, customerId) {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId);

    if (error) return [];
    return data;
  },

  async saveMeasurement(shopId, customerId, garmentType, measurementsJson, notes = '', isCustomerSupplied = false) {
    if (!isSupabaseConfigured) return { success: true };

    const { data, error } = await supabase
      .from('measurements')
      .upsert({
        shop_id: shopId,
        customer_id: customerId,
        garment_type: garmentType.toUpperCase(),
        measurements: measurementsJson || {},
        notes: notes || null,
        is_customer_supplied: Boolean(isCustomerSupplied),
        updated_at: new Date().toISOString()
      }, { onConflict: 'shop_id, customer_id, garment_type' })
      .select();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
};
