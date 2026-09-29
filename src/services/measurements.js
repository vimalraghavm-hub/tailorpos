import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const measurementsService = {
  async getCustomerMeasurements(shopId, customerId) {
    if (!isSupabaseConfigured || !customerId) return [];
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId);

    if (error) {
      console.error('Error fetching customer measurements:', error);
      return [];
    }
    return data;
  },

  async saveMeasurement(shopId, customerId, garmentType, measurementsJson, notes = '', isCustomerSupplied = false) {
    if (!isSupabaseConfigured || !customerId || !garmentType) return { success: true };

    const upperGarment = garmentType.toUpperCase();
    const payload = {
      shop_id: shopId,
      customer_id: customerId,
      garment_type: upperGarment,
      measurements: measurementsJson || {},
      notes: notes || null,
      is_customer_supplied: Boolean(isCustomerSupplied),
      updated_at: new Date().toISOString()
    };

    // 1. Check if record exists for customer_id and garment_type
    const { data: existing, error: checkError } = await supabase
      .from('measurements')
      .select('id')
      .eq('customer_id', customerId)
      .eq('garment_type', upperGarment)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking measurement existence:', checkError.message, checkError.details || '');
    }

    let res;
    if (existing && existing.id) {
      // Record exists -> update explicitly
      res = await supabase
        .from('measurements')
        .update({
          measurements: payload.measurements,
          notes: payload.notes,
          is_customer_supplied: payload.is_customer_supplied,
          updated_at: payload.updated_at
        })
        .eq('id', existing.id)
        .select();
    } else {
      // Record does not exist -> insert explicitly
      res = await supabase
        .from('measurements')
        .insert([payload])
        .select();
    }

    if (res.error) {
      console.error('Error saving measurement:', res.error.message, res.error.details || '');
      return { success: false, error: res.error.message };
    }
    return { success: true, data: res.data };
  },

  async saveAllCustomerMeasurements(shopId, customerId, allMeasurements) {
    if (!isSupabaseConfigured || !customerId || !allMeasurements) return { success: true };

    const promises = [];
    for (const [garmentKey, measObj] of Object.entries(allMeasurements)) {
      if (measObj && typeof measObj === 'object' && Object.keys(measObj).length > 0) {
        // Save if suppliedGarment is true, or notes exist, or any field has non-empty value
        const isSupplied = Boolean(measObj.suppliedGarment);
        const hasNotes = Boolean(measObj.notes && String(measObj.notes).trim());
        const hasFieldValues = Object.entries(measObj).some(([k, v]) => 
          k !== 'suppliedGarment' && k !== 'notes' && v !== '' && v !== null && v !== undefined
        );

        if (isSupplied || hasNotes || hasFieldValues) {
          promises.push(
            this.saveMeasurement(
              shopId,
              customerId,
              garmentKey,
              measObj,
              measObj.notes || '',
              isSupplied
            )
          );
        }
      }
    }

    if (promises.length === 0) return { success: true };

    const results = await Promise.all(promises);
    const failed = results.find(r => !r.success);
    if (failed) {
      return { success: false, error: failed.error };
    }
    return { success: true };
  }
};
