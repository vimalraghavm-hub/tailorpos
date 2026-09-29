import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-project')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;
export const isUuid = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const mapPaymentMethodToEnum = (input) => {
  if (!input) return 'CASH';
  const s = String(input).trim().toUpperCase();
  if (s === 'CASH') return 'CASH';
  if (s === 'UPI' || s.includes('QR')) return 'UPI';
  if (s === 'CARD') return 'CARD';
  if (s.includes('NET') || s.includes('BANK') || s === 'BANK_TRANSFER') return 'BANK_TRANSFER';
  return 'OTHER';
};

export const resolveOrderId = async (shopId, orderIdOrInvoice) => {
  if (!orderIdOrInvoice) return null;
  const str = String(orderIdOrInvoice).trim();
  if (isUuid(str)) return str;

  if (!isSupabaseConfigured || !supabase) return null;

  let query = supabase.from('orders').select('id').eq('invoice_number', str);
  if (shopId) query = query.eq('shop_id', shopId);
  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    console.warn(`resolveOrderId: Could not resolve invoice '${str}' to UUID:`, error?.message);
    return null;
  }
  return data.id;
};

if (supabase) {
  supabase
    .from('shops')
    .select('id')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('❌ Supabase connection/database test:', error);
      } else {
        console.log('✅ Supabase connected successfully!', data);
      }
    });
}