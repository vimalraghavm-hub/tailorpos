import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export async function fetchNotificationHistory(shopId) {
  try {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn("Notification fetch warning:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Failed to load notifications:", err);
    return [];
  }
}

export const messagingService = {
  async sendNotification({ shopId, customerId, orderId, type = 'INVOICE', recipient, message, templateName = null }) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true, mode: 'demo', message: 'Manual wa.me demo fallback active (offline mode).' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          shopId,
          customerId,
          orderId,
          type,
          recipient,
          message,
          templateName
        }
      });

      if (error) {
        console.error('Error invoking send-whatsapp function:', error);
        return { success: false, error: error.message || 'Edge Function execution failed.' };
      }

      return data;
    } catch (err) {
      console.error('Messaging Service Exception:', err);
      return { success: false, error: err.message || 'Failed to dispatch notification.' };
    }
  },

  async getNotificationHistory(shopId) {
    return fetchNotificationHistory(shopId);
  },

  async retryNotification(notificationRecord) {
    if (!notificationRecord) return { success: false, error: 'Invalid notification record.' };
    return this.sendNotification({
      shopId: notificationRecord.shop_id,
      customerId: notificationRecord.customer_id,
      orderId: notificationRecord.order_id,
      type: notificationRecord.type,
      recipient: notificationRecord.recipient,
      message: notificationRecord.message,
      templateName: notificationRecord.template_name
    });
  }
};
