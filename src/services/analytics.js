import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const analyticsService = {
  async getDashboardSummary() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_dashboard_summary');
    if (error) {
      console.error('Error fetching dashboard summary:', error);
      return null;
    }
    return data;
  },

  async getRevenueTrend(period = 'Week') {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_revenue_trend', { p_period: period });
    if (error) {
      console.error('Error fetching revenue trend:', error);
      return null;
    }
    return data;
  },

  async getOrderStatusSummary() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_order_status_summary');
    if (error) {
      console.error('Error fetching order status summary:', error);
      return null;
    }
    return data;
  },

  async getExpenseSummary(startDate = null, endDate = null) {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_expense_summary', { 
      p_start_date: startDate, 
      p_end_date: endDate 
    });
    if (error) {
      console.error('Error fetching expense summary:', error);
      return null;
    }
    return data;
  },

  async getServiceAnalytics() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_service_analytics');
    if (error) {
      console.error('Error fetching service analytics:', error);
      return null;
    }
    return data;
  },

  async getOverdueOrders() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('get_overdue_orders');
    if (error) {
      console.error('Error fetching overdue orders:', error);
      return null;
    }
    return data;
  }
};
