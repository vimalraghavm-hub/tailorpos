import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const ordersService = {
  async getOrders(shopId) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(id, name, phone, address), order_items(*), payments(*)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return null;
    }
    return data;
  },

  async createOrder(shopId, orderData, profileId) {
    if (!isSupabaseConfigured) return null;

    // Backend validation of financial totals
    const lineItems = orderData.services || [];
    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || (parseFloat(item.qty || 1) * parseFloat(item.rate || 0))), 0);
    const rawDiscount = parseFloat(orderData.discount) || 0;
    const discountVal = orderData.discount_type === 'percentage' 
      ? Math.round((subtotal * rawDiscount) / 100) 
      : rawDiscount;
    const totalAmount = Math.max(0, subtotal - discountVal);
    const advancePaid = parseFloat(orderData.advancePaid) || 0;
    const balanceAmount = Math.max(0, totalAmount - advancePaid);

    // 1. Insert Master Order Record
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        shop_id: shopId,
        customer_id: orderData.customerId,
        invoice_number: orderData.invoice_number || `INV-${Date.now().toString().slice(-4)}`,
        order_date: orderData.date || new Date().toISOString().split('T')[0],
        due_date: orderData.dueDate || new Date().toISOString().split('T')[0],
        subtotal,
        discount: discountVal,
        discount_type: orderData.discount_type || 'amount',
        total_amount: totalAmount,
        total_paid: advancePaid,
        balance_amount: balanceAmount,
        notes: orderData.notes || null,
        measurement_snapshot: orderData.measurements || {},
        status: orderData.status || 'PENDING',
        created_by: profileId || null
      }])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return { success: false, error: orderError.message };
    }

    // 2. Insert Order Line Items
    if (lineItems.length > 0) {
      const itemsToInsert = lineItems.map(item => ({
        shop_id: shopId,
        order_id: newOrder.id,
        service_id: item.serviceId || null,
        service_name_snapshot: item.name || 'Custom Service',
        quantity: item.qty || 1,
        unit_price: item.rate || 0,
        line_total: item.amount || (item.qty * item.rate),
        status: item.status || 'PENDING'
      }));

      await supabase.from('order_items').insert(itemsToInsert);
    }

    // 3. Record Initial Advance Payment if any
    if (advancePaid > 0) {
      await supabase.from('payments').insert([{
        shop_id: shopId,
        order_id: newOrder.id,
        amount: advancePaid,
        payment_method: (orderData.paymentMode || 'CASH').toUpperCase(),
        paid_at: new Date().toISOString(),
        created_by: profileId || null
      }]);
    }

    return { success: true, data: newOrder };
  },

  async updateOrderStatus(orderId, newStatus) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
};
