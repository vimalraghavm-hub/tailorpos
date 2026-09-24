import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const paymentsService = {
  async getOrderPayments(shopId, orderId) {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('shop_id', shopId)
      .eq('order_id', orderId)
      .order('paid_at', { ascending: false });

    if (error) return [];
    return data;
  },

  async recordPayment(shopId, orderId, amount, paymentMethod = 'CASH', referenceNumber = null, notes = '', profileId = null) {
    if (!isSupabaseConfigured) return { success: true };

    const paymentVal = parseFloat(amount) || 0;
    if (paymentVal <= 0) return { success: false, error: "Payment amount must be greater than zero." };

    // 1. Record payment transaction
    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        shop_id: shopId,
        order_id: orderId,
        amount: paymentVal,
        payment_method: paymentMethod.toUpperCase(),
        reference_number: referenceNumber || null,
        notes: notes || null,
        paid_at: new Date().toISOString(),
        created_by: profileId || null
      }])
      .select()
      .single();

    if (paymentError) return { success: false, error: paymentError.message };

    // 2. Fetch current order totals to update total_paid & balance_amount safely
    const { data: order } = await supabase
      .from('orders')
      .select('total_amount, total_paid')
      .eq('id', orderId)
      .single();

    if (order) {
      const updatedTotalPaid = (parseFloat(order.total_paid) || 0) + paymentVal;
      const updatedBalance = Math.max(0, (parseFloat(order.total_amount) || 0) - updatedTotalPaid);

      await supabase
        .from('orders')
        .update({
          total_paid: updatedTotalPaid,
          balance_amount: updatedBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    return { success: true, data: newPayment };
  }
};
