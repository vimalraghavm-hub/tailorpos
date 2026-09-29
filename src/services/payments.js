import { supabase, isSupabaseConfigured, isUuid, mapPaymentMethodToEnum, resolveOrderId } from '../lib/supabase/client.js';

export const paymentsService = {
  async getOrderPayments(shopId, orderId) {
    if (!isSupabaseConfigured || !orderId) return [];
    
    const targetUuid = await resolveOrderId(shopId, orderId);
    if (!targetUuid) return [];

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('shop_id', shopId)
      .eq('order_id', targetUuid)
      .order('paid_at', { ascending: false });

    if (error) return [];
    return data;
  },

  async recordPayment(shopId, orderId, amount, paymentMethod = 'CASH', referenceNumber = null, notes = '', profileId = null) {
    if (!isSupabaseConfigured || !orderId) return { success: true };

    const paymentVal = parseFloat(amount) || 0;
    if (paymentVal <= 0) return { success: false, error: "Payment amount must be greater than zero." };

    const orderUuid = await resolveOrderId(shopId, orderId);
    console.log(`[PAYMENT START] shopId: ${shopId}, orderRef: ${orderId}, paymentAmount: ₹${paymentVal}, method: ${paymentMethod}`);

    if (!orderUuid) {
      console.warn(`Cannot record payment: Order #${orderId} not found.`);
      return { success: false, error: `Order #${orderId} not found.` };
    }

    console.log(`[PAYMENT RESOLVED ORDER] shopId: ${shopId}, orderId: ${orderUuid}`);

    const validProfileId = isUuid(profileId) ? profileId : null;
    const enumPaymentMethod = mapPaymentMethodToEnum(paymentMethod);

    // 1. Direct table insertion with valid PostgreSQL enum value
    const paymentPayload = {
      shop_id: shopId,
      order_id: orderUuid,
      amount: paymentVal,
      payment_method: enumPaymentMethod,
      reference_number: referenceNumber || null,
      notes: notes || null,
      paid_at: new Date().toISOString(),
      created_by: validProfileId
    };

    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentPayload])
      .select()
      .maybeSingle();

    if (paymentError) {
      console.error('Error recording payment transaction:', paymentError.message, paymentError.details || '');
      return { success: false, error: paymentError.message };
    }

    console.log(`[PAYMENT INSERT] shopId: ${shopId}, orderId: ${orderUuid}, paymentId: ${newPayment.id}, paymentAmount: ₹${paymentVal}`);

    // 2. Update order totals
    const { data: targetOrder } = await supabase
      .from('orders')
      .select('total_amount, total_paid, status, customer_id, invoice_number')
      .eq('id', orderUuid)
      .maybeSingle();

    let updatedTotalPaid = paymentVal;
    let updatedBalance = 0;
    let custBalance = 0;

    if (targetOrder) {
      const totalAmount = parseFloat(targetOrder.total_amount) || 0;
      const beforePaid = parseFloat(targetOrder.total_paid) || 0;
      updatedTotalPaid = beforePaid + paymentVal;
      updatedBalance = Math.max(0, totalAmount - updatedTotalPaid);
      const isPaid = updatedBalance === 0;

      console.log(`[PAYMENT BEFORE STATE] shopId: ${shopId}, orderId: ${orderUuid}, invoiceNumber: ${targetOrder.invoice_number}, customerId: ${targetOrder.customer_id}, beforePaid: ₹${beforePaid}, total: ₹${totalAmount}, balance: ₹${Math.max(0, totalAmount - beforePaid)}`);

      const updatePayload = {
        total_paid: updatedTotalPaid,
        advance_paid: updatedTotalPaid,
        paid_amount: updatedTotalPaid,
        amount_paid: updatedTotalPaid,
        balance_amount: updatedBalance,
        pending_amount: updatedBalance,
        balance_due: updatedBalance,
        updated_at: new Date().toISOString()
      };

      if (isPaid) {
        updatePayload.payment_status = 'PAID';
        if (targetOrder.status !== 'DELIVERED') {
          updatePayload.status = 'PAID';
        }
      } else if (updatedTotalPaid > 0) {
        updatePayload.payment_status = 'PARTIALLY PAID';
      }

      await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderUuid);

      console.log(`[PAYMENT AFTER STATE] shopId: ${shopId}, orderId: ${orderUuid}, invoiceNumber: ${targetOrder.invoice_number}, beforePaid: ₹${beforePaid}, paymentAmount: ₹${paymentVal}, afterPaid: ₹${updatedTotalPaid}, balance: ₹${updatedBalance}`);

      // Idempotent audit status history for PAID
      if (isPaid) {
        try {
          const { data: existingPaidHist } = await supabase
            .from('order_status_history')
            .select('id')
            .eq('order_id', orderUuid)
            .eq('status_name', 'PAID');

          if (!existingPaidHist || existingPaidHist.length === 0) {
            await supabase.from('order_status_history').insert([{
              shop_id: shopId,
              order_id: orderUuid,
              status_name: 'PAID',
              changed_by: validProfileId,
              changed_at: new Date().toISOString()
            }]);
          }
        } catch (e) {}
      }

      // Recalculate customer balance from authoritative orders data
      if (targetOrder.customer_id) {
        const cId = String(targetOrder.customer_id);
        try {
          const { data: custOrders } = await supabase
            .from('orders')
            .select('total_amount, total_paid, status')
            .eq('customer_id', cId);

          custBalance = (custOrders || []).reduce((sum, o) => {
            if ((o.status || '').toUpperCase() === 'CANCELLED') return sum;
            const tot = parseFloat(o.total_amount) || 0;
            const pd = parseFloat(o.total_paid) || 0;
            return sum + Math.max(0, tot - pd);
          }, 0);

          await supabase
            .from('customers')
            .update({ outstanding_balance: custBalance, updated_at: new Date().toISOString() })
            .eq('id', cId);
        } catch (e) {}
      }

      console.log(`[PAYMENT SUCCESS] orderId: ${orderUuid} total: ₹${totalAmount} paid: ₹${updatedTotalPaid} balance: ₹${updatedBalance} customerOutstanding: ₹${custBalance}`);
      console.log(`[PAYMENT CUSTOMER BALANCE] shopId: ${shopId}, customerId: ${targetOrder.customer_id}, orderId: ${orderUuid}, invoiceNumber: ${targetOrder.invoice_number}, beforePaid: ₹${beforePaid}, paymentAmount: ₹${paymentVal}, afterPaid: ₹${updatedTotalPaid}, balance: ₹${updatedBalance}, customerOutstanding: ₹${custBalance}`);
    }

    console.log(`[PAYMENT END] shopId: ${shopId}, orderId: ${orderUuid}, success: true`);

    return { success: true, data: newPayment };
  }
};
