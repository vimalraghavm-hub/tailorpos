/**
 * Date and Financial Calculation Utilities for Mohit Tailoring POS
 * Standardized on Asia/Kolkata timezone
 */

/**
 * Convert any date (Date object, ISO string, timestamp, YYYY-MM-DD)
 * to 'YYYY-MM-DD' formatted string in Asia/Kolkata timezone.
 *
 * @param {Date|string|number} dateVal
 * @returns {string|null} 'YYYY-MM-DD' or null if invalid
 */
export function getKolkataDateStr(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    return dateVal.trim();
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch (e) {
    return null;
  }
}

/**
 * Get the date range for a specified period (TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR)
 * in Asia/Kolkata timezone.
 *
 * @param {string} period 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'Day' | 'Week' | 'Month' | 'Year'
 * @param {Date|string} refDate Reference date, defaults to current time
 * @returns {{ startDate: string, endDate: string, todayStr: string }}
 */
export function getPeriodDateRange(period = 'TODAY', refDate = new Date()) {
  const todayStr = getKolkataDateStr(refDate);
  if (!todayStr) return { startDate: null, endDate: null, todayStr: null };

  const parts = todayStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const normalized = (period || 'TODAY').toUpperCase();

  if (normalized === 'TODAY' || normalized === 'DAY') {
    return { startDate: todayStr, endDate: todayStr, todayStr };
  }

  if (normalized === 'THIS_WEEK' || normalized === 'WEEK') {
    const ref = new Date(year, month - 1, day);
    const dayOfWeek = ref.getDay(); // 0 is Sunday
    const sun = new Date(year, month - 1, day - dayOfWeek);
    const sat = new Date(year, month - 1, day - dayOfWeek + 6);
    return {
      startDate: getKolkataDateStr(sun),
      endDate: getKolkataDateStr(sat),
      todayStr
    };
  }

  if (normalized === 'THIS_MONTH' || normalized === 'MONTH') {
    const lastDay = new Date(year, month, 0).getDate();
    const mm = String(month).padStart(2, '0');
    return {
      startDate: `${year}-${mm}-01`,
      endDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
      todayStr
    };
  }

  if (normalized === 'THIS_YEAR' || normalized === 'YEAR') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      todayStr
    };
  }

  return { startDate: todayStr, endDate: todayStr, todayStr };
}

/**
 * Check if a date falls within a given period in Asia/Kolkata timezone.
 *
 * @param {Date|string|number} dateVal
 * @param {string} period
 * @param {Date|string} refDate
 * @returns {boolean}
 */
export function isDateInPeriod(dateVal, period = 'TODAY', refDate = new Date()) {
  if (!dateVal) return false;
  const dStr = getKolkataDateStr(dateVal);
  if (!dStr) return false;

  const range = getPeriodDateRange(period, refDate);
  if (!range.startDate || !range.endDate) return false;

  return dStr >= range.startDate && dStr <= range.endDate;
}

/**
 * Unified calculation of revenue, expenses, and net profit for a given period.
 *
 * Formula:
 * Net Profit = Revenue - Expenses
 *
 * @param {Array} payments List of payment records from Supabase
 * @param {Array} expenses List of expense records from Supabase
 * @param {string} period 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR'
 * @param {Date|string} refDate Reference date (defaults to current time)
 * @returns {{
 *   periodPayments: Array,
 *   periodExpenses: Array,
 *   totalRevenue: number,
 *   totalExpenses: number,
 *   netProfit: number
 * }}
 */
export function calculatePeriodFinancials(payments = [], expenses = [], period = 'TODAY', refDate = new Date()) {
  const periodPayments = (payments || []).filter(p => {
    const pDate = p.paid_at || p.created_at;
    return isDateInPeriod(pDate, period, refDate);
  });

  const periodExpenses = (expenses || []).filter(e => {
    const eDate = e.expense_date ? e.expense_date.split('T')[0] : getKolkataDateStr(e.created_at);
    return isDateInPeriod(eDate || e.created_at, period, refDate);
  });

  const totalRevenue = periodPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  return {
    periodPayments,
    periodExpenses,
    totalRevenue,
    totalExpenses,
    netProfit
  };
}
