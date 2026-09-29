import { supabase, isSupabaseConfigured, isUuid, mapPaymentMethodToEnum, resolveOrderId } from '../lib/supabase/client.js';
import { paymentsService } from './payments.js';

export async function deliverOrder(shopId, orderId, amountPaidNow = 0, paymentMode = 'CASH', profileId = null) {
  try {
    if (!isSupabaseConfigured || !supabase || !orderId) return { success: true };

    const parsedPaidNow = Math.max(0, parseFloat(amountPaidNow) || 0);
    const validProfileId = isUuid(profileId) ? profileId : null;

    // 1. Canonical Identifier Resolution (Invoice / UUID -> Canonical UUID)
    const orderUuid = await resolveOrderId(shopId, orderId);
    console.log(`[DELIVERY START] shopId: ${shopId}, orderRef: ${orderId}, paymentNow: ₹${parsedPaidNow}`);

    if (!orderUuid) {
      const errMessage = `Cannot deliver order: Order #${orderId} not found.`;
      console.warn(errMessage);
      return { success: false, error: errMessage };
    }

    // 2. Fetch target order by canonical UUID
    let orderQuery = supabase.from('orders').select('*').eq('id', orderUuid);
    if (shopId) orderQuery = orderQuery.eq('shop_id', shopId);
    const { data: targetOrder, error: fetchErr } = await orderQuery.maybeSingle();

    if (fetchErr || !targetOrder) {
      const errMessage = `Cannot deliver order: Order #${orderId} not found.`;
      console.warn(errMessage);
      return { success: false, error: errMessage };
    }

    const currentTotal = parseFloat(targetOrder.total_amount) || 0;
    const currentPaid = parseFloat(targetOrder.total_paid) || 0;
    const outstandingBalance = Math.max(0, currentTotal - currentPaid);

    console.log(`[DELIVERY RESOLVED ORDER] shopId: ${shopId}, orderId: ${orderUuid}, invoiceNumber: ${targetOrder.invoice_number}, customerId: ${targetOrder.customer_id}`);
    console.log(`[DELIVERY BEFORE STATE] beforePaid: ₹${currentPaid}, beforeStatus: ${targetOrder.status}, total: ₹${currentTotal}, balance: ₹${outstandingBalance}`);

    if (parsedPaidNow > outstandingBalance) {
      const errMessage = `Payment amount (₹${parsedPaidNow}) exceeds remaining balance (₹${outstandingBalance}) for order #${targetOrder.invoice_number || orderId}`;
      console.warn(errMessage);
      return { success: false, error: errMessage };
    }

    const enumPaymentMethod = mapPaymentMethodToEnum(paymentMode);

    // 3. Record Payment if > 0
    if (parsedPaidNow > 0) {
      console.log(`[DELIVERY PAYMENT] shopId: ${shopId}, orderId: ${orderUuid}, invoiceNumber: ${targetOrder.invoice_number}, paymentAmount: ₹${parsedPaidNow}, method: ${enumPaymentMethod}`);
      const payRes = await paymentsService.recordPayment(
        shopId,
        orderUuid,
        parsedPaidNow,
        enumPaymentMethod,
        targetOrder.invoice_number,
        'Payment collected during delivery',
        validProfileId
      );
      if (payRes && payRes.success === false) {
        return { success: false, error: payRes.error || 'Payment recording failed during delivery' };
      }
    }

    // 4. Compute updated payment fields
    const newTotalPaid = Math.min(currentTotal, currentPaid + parsedPaidNow);
    const newBalance = Math.max(0, currentTotal - newTotalPaid);
    let newPaymentStatus = 'UNPAID';
    if (newTotalPaid <= 0) newPaymentStatus = 'UNPAID';
    else if (newBalance === 0) newPaymentStatus = 'PAID';
    else newPaymentStatus = 'PARTIALLY PAID';

    const nowIso = new Date().toISOString();

    // 5. Update Order Fields (Delivery + Payments)
    console.log(`[DELIVERY ORDER UPDATE] shopId: ${shopId}, orderId: ${orderUuid}, invoiceNumber: ${targetOrder.invoice_number}, beforePaid: ₹${currentPaid}, paymentAmount: ₹${parsedPaidNow}, afterPaid: ₹${newTotalPaid}, balance: ₹${newBalance}`);
    const { data: updatedOrder, error: orderErr } = await supabase
      .from('orders')
      .update({
        status: 'DELIVERED',
        overall_status: 'DELIVERED',
        workflow_status: 'DELIVERED',
        is_delivered: true,
        delivered_at: targetOrder.delivered_at || nowIso,
        total_paid: newTotalPaid,
        advance_paid: newTotalPaid,
        paid_amount: newTotalPaid,
        amount_paid: newTotalPaid,
        balance_amount: newBalance,
        pending_amount: newBalance,
        balance_due: newBalance,
        payment_status: newPaymentStatus,
        updated_at: nowIso
      })
      .eq('id', orderUuid)
      .select()
      .maybeSingle();

    if (orderErr) {
      console.error('Error updating order delivery status:', orderErr.message);
      return { success: false, error: orderErr.message };
    }

    // 6. Sync order items
    try {
      await supabase
        .from('order_items')
        .update({ status: 'DELIVERED', updated_at: nowIso })
        .eq('order_id', orderUuid)
        .neq('status', 'CANCELLED');
    } catch (e) {}

    // 7. Audit status history insertion (Idempotent check)
    try {
      const { data: existingHist } = await supabase
        .from('order_status_history')
        .select('id')
        .eq('order_id', orderUuid)
        .eq('status_name', 'DELIVERED');

      if (!existingHist || existingHist.length === 0) {
        console.log(`[HISTORY] orderId: ${orderUuid} status: DELIVERED action: CREATED`);
        await supabase.from('order_status_history').insert([{
          shop_id: shopId,
          order_id: orderUuid,
          status_name: 'DELIVERED',
          changed_by: validProfileId,
          changed_at: updatedOrder?.delivered_at || nowIso,
          notes: 'Order delivered via canonical delivery transaction'
        }]);
      } else {
        console.log(`[HISTORY] orderId: ${orderUuid} status: DELIVERED action: ALREADY_EXISTS`);
      }
    } catch (e) {}

    // 8. Recalculate customer balance from authoritative orders data
    let custOutstanding = 0;
    if (targetOrder.customer_id) {
      const cId = String(targetOrder.customer_id);
      try {
        const { data: custOrders } = await supabase
          .from('orders')
          .select('total_amount, total_paid, status')
          .eq('customer_id', cId);

        custOutstanding = (custOrders || []).reduce((sum, o) => {
          if ((o.status || '').toUpperCase() === 'CANCELLED') return sum;
          const tot = parseFloat(o.total_amount) || 0;
          const pd = parseFloat(o.total_paid) || 0;
          return sum + Math.max(0, tot - pd);
        }, 0);

        await supabase
          .from('customers')
          .update({ outstanding_balance: custOutstanding, updated_at: nowIso })
          .eq('id', cId);
      } catch (e) {}
    }

    console.log(`[DELIVERY SUCCESS] orderId: ${orderUuid} status: DELIVERED total: ₹${currentTotal} paid: ₹${newTotalPaid} balance: ₹${newBalance} customerOutstanding: ₹${custOutstanding}`);
    console.log(`[DELIVERY END] shopId: ${shopId}, orderId: ${orderUuid}, invoiceNumber: ${targetOrder.invoice_number}, success: true`);

    return { success: true, data: updatedOrder || targetOrder };
  } catch (err) {
    console.error('Failed to deliver order:', err);
    return { success: false, error: err.message || err };
  }
}

export async function markOrderDeliveredAndPaid(orderId, orderTotal) {
  return deliverOrder('a1000000-0000-0000-0000-000000000001', orderId, orderTotal, 'CASH');
}

export async function markOrderDelivered(orderId) {
  return deliverOrder('a1000000-0000-0000-0000-000000000001', orderId, 0, 'CASH');
}

export async function fetchAllOrders(shopId = 'a1000000-0000-0000-0000-000000000001', currentUser = null) {
  try {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    // WORKER SPECIFIC FILTERING
    if (currentUser?.role === 'WORKER') {
      const workerId = String(currentUser.id || currentUser.worker_id || currentUser.auth_user_id || '').trim();
      
      // Fetch assigned order IDs for this worker
      const { data: assignments } = await supabase
        .from('order_assignments')
        .select('order_id')
        .eq('worker_id', workerId);

      const assignedIds = (assignments || [])
        .map(a => String(a.order_id).trim())
        .filter(Boolean);

      if (assignedIds.length === 0) {
        return [];
      }

      query = query.in('id', assignedIds);
    }

    const { data: ordersData, error } = await query;

    if (error) {
      console.error("Orders fetch error:", error);
      return [];
    }

    // Fetch related customers & order_items cleanly in separate requests
    const { data: customersData } = await supabase.from('customers').select('*');
    const { data: itemsData } = await supabase.from('order_items').select('*');

    const custMap = (customersData || []).reduce((acc, c) => ({ ...acc, [String(c.id)]: c }), {});
    const itemMap = (itemsData || []).reduce((acc, item) => {
      const k = String(item.order_id);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});

    const joinedOrders = (ordersData || []).map(ord => ({
      ...ord,
      customers: custMap[String(ord.customer_id)] || ord.customers || null,
      order_items: itemMap[String(ord.id)] || ord.order_items || []
    }));

    return joinedOrders.filter(ord => !ord.hidden_from_register && !ord.archived_in_register);
  } catch (err) {
    console.error("Error in fetchAllOrders:", err);
    return [];
  }
}

export async function removeOrderFromRegister(orderId) {
  // Hide from register table without deleting record from customer profile
  try {
    const { error } = await supabase
      .from('orders')
      .update({ hidden_from_register: true, archived_in_register: true })
      .eq('id', String(orderId));

    if (error) {
      console.error("Failed to remove order from register:", error);
      const { error: fbErr } = await supabase
        .from('orders')
        .update({ archived_in_register: true })
        .eq('id', String(orderId));

      if (fbErr) return false;
    }
    return true;
  } catch (err) {
    console.error("Error removing order from register:", err);
    return false;
  }
}



export async function getOrdersByCustomer(shopId, customerId) {
    if (!isSupabaseConfigured || !customerId) return [];
    
    // Clean fetch for orders
    const { data: ordersData, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', String(customerId))
      .order('created_at', { ascending: false });

    if (ordErr) {
      console.error('Error fetching customer orders:', ordErr);
      return [];
    }

    // Clean fetch for customer details
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', String(customerId))
      .maybeSingle();

    const orderIds = (ordersData || []).map(o => String(o.id));
    let itemsData = [];
    let paymentsData = [];

    if (orderIds.length > 0) {
      const { data: items } = await supabase.from('order_items').select('*').in('order_id', orderIds);
      const { data: payments } = await supabase.from('payments').select('*').in('order_id', orderIds);
      itemsData = items || [];
      paymentsData = payments || [];
    }

    const itemsMap = itemsData.reduce((acc, item) => {
      const k = String(item.order_id);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});

    const paymentsMap = paymentsData.reduce((acc, pay) => {
      const k = String(pay.order_id);
      if (!acc[k]) acc[k] = [];
      acc[k].push(pay);
      return acc;
    }, {});

    return (ordersData || []).map(order => ({
      ...order,
      customers: customerData || null,
      order_items: itemsMap[String(order.id)] || [],
      payments: paymentsMap[String(order.id)] || []
    }));
}

export async function getOrderDetails(orderId) {
    if (!isSupabaseConfigured || !orderId) return null;

    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', String(orderId))
      .maybeSingle();

    if (ordErr || !order) {
      console.error('Error fetching order details:', ordErr);
      return null;
    }

    const { data: customer } = await supabase.from('customers').select('*').eq('id', String(order.customer_id)).maybeSingle();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', String(orderId));
    const { data: payments } = await supabase.from('payments').select('*').eq('order_id', String(orderId));

    return {
      ...order,
      customers: customer || null,
      order_items: items || [],
      payments: payments || []
    };
}

export async function createOrder(shopId, orderData, authUserId) {
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

    // 1. Try atomic database RPC transaction first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_complete_order_transaction', {
        p_shop_id: shopId,
        p_auth_user_id: authUserId || null,
        p_customer_id: orderData.customerId || null,
        p_customer_name: orderData.customerName || 'Customer',
        p_customer_phone: orderData.phone || '',
        p_customer_address: orderData.address || null,
        p_customer_notes: orderData.notes || null,
        p_invoice_number: orderData.invoice_number || `INV-${Date.now().toString().slice(-4)}`,
        p_order_date: orderData.date || new Date().toISOString().split('T')[0],
        p_due_date: orderData.dueDate || new Date().toISOString().split('T')[0],
        p_subtotal: subtotal,
        p_discount: discountVal,
        p_discount_type: orderData.discount_type || 'amount',
        p_total_amount: totalAmount,
        p_total_paid: advancePaid,
        p_balance_amount: balanceAmount,
        p_notes: orderData.notes || null,
        p_status: orderData.status || 'PENDING',
        p_payment_mode: orderData.paymentMode || 'CASH',
        p_measurement_snapshot: orderData.measurements || {},
        p_customer_measurements: orderData.measurements || {},
        p_line_items: lineItems
      });

      if (!rpcErr && rpcRes?.success) {
        const targetCustId = rpcRes.customer_id || orderData.customerId;
        if (targetCustId) {
          try {
            const { data: custOrders } = await supabase
              .from('orders')
              .select('total_amount, total_paid, status')
              .eq('customer_id', targetCustId);

            const custOutstanding = (custOrders || []).reduce((sum, o) => {
              if ((o.status || '').toUpperCase() === 'CANCELLED') return sum;
              const tot = parseFloat(o.total_amount) || 0;
              const pd = parseFloat(o.total_paid) || 0;
              return sum + Math.max(0, tot - pd);
            }, 0);

            await supabase
              .from('customers')
              .update({ last_order_date: new Date().toISOString(), outstanding_balance: custOutstanding })
              .eq('id', targetCustId);
          } catch (e) {}
        }

        const { data: createdOrder } = await supabase
          .from('orders')
          .select('*')
          .eq('id', rpcRes.order_id)
          .maybeSingle();

        return { 
          success: true, 
          data: createdOrder || { id: rpcRes.order_id, customer_id: rpcRes.customer_id } 
        };
      }

      if (rpcErr) {
        console.warn('RPC create_complete_order_transaction notice (proceeding to fallback):', rpcErr.message || rpcErr);
      }
    } catch (e) {
      console.warn('RPC execution exception, proceeding to fallback:', e?.message || e);
    }

    // 2. Fallback Flow
    let verifiedProfileId = null;
    if (authUserId) {
      const { data: profileMatch } = await supabase
        .from('profiles')
        .select('id')
        .or(`auth_user_id.eq.${authUserId},id.eq.${authUserId}`)
        .maybeSingle();

      if (profileMatch?.id) {
        verifiedProfileId = profileMatch.id;
      }
    }

    if (!verifiedProfileId) {
      const { data: anyShopProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('shop_id', shopId)
        .limit(1);

      if (anyShopProfile && anyShopProfile.length > 0) {
        verifiedProfileId = anyShopProfile[0].id;
      }
    }

    // Ensure customer exists
    let verifiedCustomerId = orderData.customerId;
    if (!verifiedCustomerId) {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert([{
          shop_id: shopId,
          name: orderData.customerName || 'Customer',
          phone: orderData.phone || '',
          address: orderData.address || null,
          notes: orderData.notes || null
        }])
        .select()
        .maybeSingle();

      if (custErr || !newCust) {
        return { success: false, error: custErr ? `Customer creation failed: ${custErr.message}` : "Failed to insert customer record" };
      }
      verifiedCustomerId = newCust.id;
    }

    let computedPaymentStatus = 'UNPAID';
    if (advancePaid > 0) {
      computedPaymentStatus = balanceAmount === 0 ? 'PAID' : 'PARTIALLY PAID';
    }

    // Insert Master Order Record
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        shop_id: shopId,
        customer_id: verifiedCustomerId,
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
        status: computedPaymentStatus === 'PAID' && (orderData.status || 'PENDING') !== 'DELIVERED' ? 'PAID' : (orderData.status || 'PENDING'),
        payment_status: computedPaymentStatus,
        created_by: verifiedProfileId
      }])
      .select()
      .maybeSingle();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return { success: false, error: `Order creation failed: ${orderError.message}` };
    }

    if (verifiedCustomerId) {
      try {
        const { data: custOrders } = await supabase
          .from('orders')
          .select('total_amount, total_paid, status')
          .eq('customer_id', verifiedCustomerId);

        const custOutstanding = (custOrders || []).reduce((sum, o) => {
          if ((o.status || '').toUpperCase() === 'CANCELLED') return sum;
          const tot = parseFloat(o.total_amount) || 0;
          const pd = parseFloat(o.total_paid) || 0;
          return sum + Math.max(0, tot - pd);
        }, 0);

        await supabase
          .from('customers')
          .update({ last_order_date: new Date().toISOString(), outstanding_balance: custOutstanding })
          .eq('id', verifiedCustomerId);
      } catch (e) {}
    }

    // Insert Line Items
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

    // Record Payment
    if (advancePaid > 0) {
      await supabase.from('payments').insert([{
        shop_id: shopId,
        order_id: newOrder.id,
        amount: advancePaid,
        payment_method: (orderData.paymentMode || 'CASH').toUpperCase(),
        paid_at: new Date().toISOString(),
        created_by: verifiedProfileId
      }]);
    }

    return { success: true, data: newOrder };
}

export async function updateOrder(shopId, orderId, updateData) {
  if (!isSupabaseConfigured) return { success: true };
  if (!orderId) {
    return createOrder(shopId, updateData, updateData?.authUserId);
  }

  const lineItems = updateData.services || [];
  const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || (parseFloat(item.qty || 1) * parseFloat(item.rate || 0))), 0);
  const rawDiscount = parseFloat(updateData.discount) || 0;
  const discountVal = updateData.discount_type === 'percentage' 
    ? Math.round((subtotal * rawDiscount) / 100) 
    : rawDiscount;
  const totalAmount = Math.max(0, subtotal - discountVal);
  const advancePaid = parseFloat(updateData.advancePaid) || 0;
  const balanceAmount = Math.max(0, totalAmount - advancePaid);

  // Check if row exists in DB before attempting PATCH update
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('shop_id', shopId)
    .maybeSingle();

  if (!existingOrder) {
    return createOrder(shopId, { ...updateData, invoice_number: updateData.id || updateData.invoice_number }, updateData?.authUserId);
  }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        due_date: updateData.dueDate || undefined,
        subtotal,
        discount: discountVal,
        discount_type: updateData.discount_type || 'amount',
        total_amount: totalAmount,
        total_paid: advancePaid,
        balance_amount: balanceAmount,
        notes: updateData.notes !== undefined ? updateData.notes : undefined,
        measurement_snapshot: updateData.measurements || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('shop_id', shopId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating order:', error);
      return { success: false, error: error.message };
    }

    // Replace order items
    if (lineItems.length > 0) {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      const itemsToInsert = lineItems.map(item => ({
        shop_id: shopId,
        order_id: orderId,
        service_id: item.serviceId || null,
        service_name_snapshot: item.name || 'Custom Service',
        quantity: item.qty || 1,
        unit_price: item.rate || 0,
        line_total: item.amount || (item.qty * item.rate),
        status: item.status || 'PENDING'
      }));
      await supabase.from('order_items').insert(itemsToInsert);
    }

    return { success: true, data: updatedOrder || existingOrder };
}

export async function updateOrderStatus(orderId, newStatus) {
  if (!isSupabaseConfigured) return { success: true };
  const { data, error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (orderId && isUuid(orderId)) {
    Promise.resolve(
      supabase.from('order_status_history').insert([{
        shop_id: data?.shop_id || undefined,
        order_id: orderId,
        status_name: newStatus,
        changed_at: new Date().toISOString()
      }])
    ).catch((histErr) => {
      console.warn('order_status_history background notice:', histErr?.message || histErr);
    });
  }

  return { success: true, data };
}

export async function settleOrderPayment(shopId, orderId, profileId = null) {
  if (!isSupabaseConfigured || !orderId) return { success: true };

  try {
    const orderUuid = await resolveOrderId(shopId, orderId);
    if (!orderUuid) return { success: false, error: 'Order not found' };

    let orderQuery = supabase.from('orders').select('total_amount, total_paid').eq('id', orderUuid);
    if (shopId) orderQuery = orderQuery.eq('shop_id', shopId);
    const { data: ord } = await orderQuery.maybeSingle();

    if (!ord) return { success: false, error: 'Order not found' };

    const totalAmount = parseFloat(ord.total_amount) || 0;
    const currentPaid = parseFloat(ord.total_paid) || 0;
    const remainingBalance = Math.max(0, totalAmount - currentPaid);

    if (remainingBalance <= 0) return { success: true };

    return await paymentsService.recordPayment(
      shopId,
      orderUuid,
      remainingBalance,
      'CASH',
      null,
      'Settled remaining balance',
      profileId
    );
  } catch (err) {
    console.error('Error settling order payment:', err);
    return { success: false, error: err.message || err };
  }
}

export async function archiveOrderInRegister(shopId, orderId) {
  if (!isSupabaseConfigured || !orderId) return { success: true };
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ archived_in_register: true, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('shop_id', shopId)
      .select();

    if (error) {
      console.warn('Notice archiving order in register (proceeding):', error.message);
      return { success: true };
    }
    return { success: true, data };
  } catch (err) {
    console.warn('Exception archiving order in register:', err);
    return { success: true };
  }
}

export async function deleteOrder(shopId, orderId) {
  if (!isSupabaseConfigured || !orderId) return { success: true };

  try {
    const { data: targetOrd } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .maybeSingle();

    const customerId = targetOrd?.customer_id;

    // Delete child records first
    await Promise.all([
      supabase.from('order_items').delete().eq('order_id', orderId),
      supabase.from('payments').delete().eq('order_id', orderId),
      supabase.from('order_status_history').delete().eq('order_id', orderId)
    ]);

    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('shop_id', shopId)
      .select();

    if (error) {
      console.error('Error deleting order:', error);
      return { success: false, error: error.message };
    }

    // Recalculate customer balance from remaining authoritative orders
    if (customerId) {
      try {
        const { data: custOrders } = await supabase
          .from('orders')
          .select('total_amount, total_paid, status')
          .eq('customer_id', String(customerId));

        const custOutstanding = (custOrders || []).reduce((sum, o) => {
          if ((o.status || '').toUpperCase() === 'CANCELLED') return sum;
          const tot = parseFloat(o.total_amount) || 0;
          const pd = parseFloat(o.total_paid) || 0;
          return sum + Math.max(0, tot - pd);
        }, 0);

        await supabase
          .from('customers')
          .update({ outstanding_balance: custOutstanding, updated_at: new Date().toISOString() })
          .eq('id', String(customerId));
      } catch (e) {}
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception deleting order:', err);
    return { success: false, error: err.message };
  }
}

export const ordersService = {
  fetchAllOrders,
  markOrderDelivered,
  markOrderDeliveredAndPaid,
  removeOrderFromRegister,
  deliverOrder,
  getOrders: fetchAllOrders,
  getOrdersByCustomer,
  getOrderDetails,
  createOrder,
  updateOrder,
  updateOrderStatus,
  settleOrderPayment,
  archiveOrderInRegister,
  deleteOrder
};
