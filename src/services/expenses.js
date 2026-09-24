import { supabase, isSupabaseConfigured } from '../lib/supabase/client';

export const expensesService = {
  async getExpenses(shopId, startDate = null, endDate = null) {
    if (!isSupabaseConfigured) return [];
    let query = supabase
      .from('expenses')
      .select('*, expense_categories(id, name)')
      .eq('shop_id', shopId);

    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);

    const { data, error } = await query.order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
    return data;
  },

  async getExpenseCategories(shopId) {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching expense categories:', error);
      return [];
    }
    return data;
  },

  async createExpense(shopId, expenseData, profileId = null) {
    if (!isSupabaseConfigured) return { success: true };
    const amountVal = parseFloat(expenseData.amount) || 0;
    if (amountVal <= 0) {
      return { success: false, error: 'Expense amount must be greater than zero.' };
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        shop_id: shopId,
        category_id: expenseData.categoryId || null,
        amount: amountVal,
        expense_date: expenseData.expenseDate || new Date().toISOString().split('T')[0],
        description: expenseData.description || null,
        payment_method: (expenseData.paymentMethod || 'CASH').toUpperCase(),
        created_by: profileId || null
      }])
      .select('*, expense_categories(id, name)')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async updateExpense(expenseId, expenseData) {
    if (!isSupabaseConfigured) return { success: true };
    const amountVal = parseFloat(expenseData.amount) || 0;
    if (amountVal <= 0) {
      return { success: false, error: 'Expense amount must be greater than zero.' };
    }

    const { data, error } = await supabase
      .from('expenses')
      .update({
        category_id: expenseData.categoryId || undefined,
        amount: amountVal,
        expense_date: expenseData.expenseDate || undefined,
        description: expenseData.description !== undefined ? expenseData.description : undefined,
        payment_method: expenseData.paymentMethod ? expenseData.paymentMethod.toUpperCase() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select('*, expense_categories(id, name)')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async deleteExpense(expenseId) {
    if (!isSupabaseConfigured) return { success: true };
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async addExpenseCategory(shopId, name) {
    if (!isSupabaseConfigured) return { success: true };
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Category name is required.' };

    const { data, error } = await supabase
      .from('expense_categories')
      .insert([{
        shop_id: shopId,
        name: cleanName,
        is_active: true
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async updateExpenseCategory(categoryId, name) {
    if (!isSupabaseConfigured) return { success: true };
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Category name is required.' };

    const { data, error } = await supabase
      .from('expense_categories')
      .update({ name: cleanName })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async deactivateExpenseCategory(categoryId) {
    if (!isSupabaseConfigured) return { success: true };
    const { data, error } = await supabase
      .from('expense_categories')
      .update({ is_active: false })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }
};
