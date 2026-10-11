import React, { useState, useEffect, useMemo } from 'react';
import { 
  IndianRupee, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  PlusCircle, 
  Receipt, 
  PiggyBank, 
  RefreshCw,
  ArrowUpRight,
  Eye,
  BarChart2,
  PieChart,
  Calendar,
  Activity
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../common/StatusBadge';
import { ExpenseModal } from '../modals/ExpenseModal';
import { OrderHistoryModal } from '../modals/OrderHistoryModal';
import { RevenueOverviewModal } from '../modals/RevenueOverviewModal';
import { getKolkataDateStr } from '../../utils/dateUtils';

export const DashboardView = () => {
  const { stats, invoices, productionStatuses = [], expenses = [], payments = [], analyticsData, loadAnalytics, userRole, navigateTo } = useShop();
  
  const [chartPeriod, setChartPeriod] = useState('Week'); // Day, Week, Month, Year
  const [chartView, setChartView] = useState('trend'); // 'trend' | 'vsExpenses'
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);

  useEffect(() => {
    if (loadAnalytics) {
      loadAnalytics(chartPeriod);
    }
  }, [chartPeriod]);

  useEffect(() => {
    const handleSync = () => {
      if (loadAnalytics) loadAnalytics(chartPeriod);
    };
    window.addEventListener('shop-data-updated', handleSync);
    return () => window.removeEventListener('shop-data-updated', handleSync);
  }, [chartPeriod, loadAnalytics]);

  // Generate period-based dataset from actual Supabase payments and expenses
  const periodData = useMemo(() => {
    const now = new Date();
    const todayKolkataStr = getKolkataDateStr(now);

    // DAY view (Hourly buckets for today)
    if (chartPeriod === 'Day') {
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      return hours.map(h => {
        const label = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
        const fullLabel = `Today ${label}`;

        const rev = (payments || []).filter(p => {
          const pDate = getKolkataDateStr(p.paid_at || p.created_at);
          if (pDate !== todayKolkataStr) return false;
          const pHour = new Date(p.paid_at || p.created_at).getHours();
          return pHour >= h - 2 && pHour < h;
        }).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        const exp = (expenses || []).filter(e => {
          const eDate = e.expense_date ? e.expense_date.split('T')[0] : getKolkataDateStr(e.created_at);
          if (eDate !== todayKolkataStr) return false;
          const eHour = new Date(e.created_at || Date.now()).getHours();
          return eHour >= h - 2 && eHour < h;
        }).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

        return { label, fullLabel, revenue: rev, expense: exp, net: rev - exp };
      });
    }

    // WEEK view (Daily buckets for current Sunday-Saturday week)
    if (chartPeriod === 'Week') {
      const currentDayOfWeek = now.getDay(); // 0 = Sun
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - currentDayOfWeek);

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return dayNames.map((name, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        const dateStr = getKolkataDateStr(d);

        const rev = (payments || []).filter(p => {
          return getKolkataDateStr(p.paid_at || p.created_at) === dateStr;
        }).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        const exp = (expenses || []).filter(e => {
          const eDate = e.expense_date ? e.expense_date.split('T')[0] : getKolkataDateStr(e.created_at);
          return eDate === dateStr;
        }).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

        return { 
          label: name, 
          fullLabel: `${name}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          revenue: rev, 
          expense: exp, 
          net: rev - exp 
        };
      });
    }

    // MONTH view (Weekly buckets for current month)
    if (chartPeriod === 'Month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const buckets = [
        { label: 'W1 (1-7)', start: 1, end: 7 },
        { label: 'W2 (8-14)', start: 8, end: 14 },
        { label: 'W3 (15-21)', start: 15, end: 21 },
        { label: 'W4 (22-28)', start: 22, end: 28 },
        { label: 'W5 (29+)', start: 29, end: 31 }
      ];

      return buckets.map(b => {
        const rev = (payments || []).filter(p => {
          const d = new Date(p.paid_at || p.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() >= b.start && d.getDate() <= b.end;
        }).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        const exp = (expenses || []).filter(e => {
          const d = new Date(e.expense_date || e.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() >= b.start && d.getDate() <= b.end;
        }).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

        return {
          label: b.label,
          fullLabel: `Current Month ${b.label}`,
          revenue: rev,
          expense: exp,
          net: rev - exp
        };
      });
    }

    // YEAR view (Monthly buckets for current year)
    if (chartPeriod === 'Year') {
      const currentYear = now.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      return monthNames.map((name, mIdx) => {
        const rev = (payments || []).filter(p => {
          const d = new Date(p.paid_at || p.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === mIdx;
        }).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

        const exp = (expenses || []).filter(e => {
          const d = new Date(e.expense_date || e.created_at);
          return d.getFullYear() === currentYear && d.getMonth() === mIdx;
        }).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

        return {
          label: name,
          fullLabel: `${name} ${currentYear}`,
          revenue: rev,
          expense: exp,
          net: rev - exp
        };
      });
    }

    return [];
  }, [chartPeriod, payments, expenses]);

  // Check if dataset has any financial activity
  const hasActivity = useMemo(() => {
    return periodData.some(d => d.revenue > 0 || d.expense > 0 || d.net > 0);
  }, [periodData]);

  const maxVal = useMemo(() => {
    return Math.max(1, ...periodData.map(d => Math.max(d.revenue, d.expense, Math.abs(d.net))));
  }, [periodData]);

  // 5 Recent orders prioritizing today's business activity first
  const recentOrders = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const getKolkataStr = (dateVal) => {
      if (!dateVal) return '';
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      } catch (e) {
        return '';
      }
    };

    const sorted = [...invoices].sort((a, b) => {
      const aDateStr = getKolkataStr(a.date || a.created_at);
      const bDateStr = getKolkataStr(b.date || b.created_at);

      const aIsToday = aDateStr === todayStr;
      const bIsToday = bDateStr === todayStr;

      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      const aTime = new Date(a.date || a.created_at || 0).getTime();
      const bTime = new Date(b.date || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return sorted.slice(0, 5);
  }, [invoices]);

  // Pipeline status colors lookup
  const statusColors = {
    PENDING: 'bg-amber-500 text-amber-600',
    CUTTING: 'bg-amber-500 text-amber-600',
    STITCHING: 'bg-blue-500 text-blue-600',
    FITTING: 'bg-indigo-500 text-indigo-600',
    PACKING: 'bg-purple-500 text-purple-600',
    READY: 'bg-[#5F8F68] text-[#5F8F68]',
    DELIVERED: 'bg-gray-400 text-gray-500'
  };

  // Order status pipeline strictly synced with active invoices in Registers
  const orderStatusPipeline = useMemo(() => {
    const rawStatuses = (productionStatuses && productionStatuses.length > 0)
      ? productionStatuses
      : [
          { name: 'PENDING' },
          { name: 'CUTTING' },
          { name: 'STITCHING' },
          { name: 'FITTING' },
          { name: 'PACKING' },
          { name: 'READY' },
          { name: 'DELIVERED' }
        ];

    const activeInvoices = invoices || [];
    const totalCount = activeInvoices.length || 1;

    return rawStatuses.map((st) => {
      const nameStr = (typeof st === 'string' ? st : (st?.name || '')).trim();
      const upperName = nameStr.toUpperCase();
      const formattedLabel = nameStr ? (nameStr.charAt(0).toUpperCase() + nameStr.slice(1).toLowerCase()) : 'Pending';

      const count = activeInvoices.filter(inv => {
        if (!inv || (inv.status || '').toUpperCase() === 'CANCELLED') return false;
        const invStatusUpper = (inv.status || '').toUpperCase();
        if (upperName === 'DELIVERED') {
          return invStatusUpper === 'DELIVERED';
        }
        if (invStatusUpper === 'DELIVERED') return false;
        if (invStatusUpper === upperName) return true;
        if (inv.services && Array.isArray(inv.services)) {
          return inv.services.some(s => s && (s.status || 'PENDING').toUpperCase() === upperName);
        }
        return false;
      }).length;

      const styleClass = statusColors[upperName] || 'bg-gray-400 text-gray-500';
      const [bgColor, textColor] = styleClass.split(' ');

      return {
        label: formattedLabel,
        rawName: upperName,
        count,
        bgColor,
        textColor,
        percentage: Math.min(100, Math.round((count / totalCount) * 100))
      };
    });
  }, [invoices, productionStatuses]);

  const isWorker = userRole === 'WORKER';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#202020] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            POS Control Center ({userRole})
          </span>
          <h2 className="text-2xl font-bold tracking-tight">
            Mohit Tailoring Daily Shop Summary
          </h2>
          <p className="text-xs text-gray-300 max-w-md">
            Manage stitching workflow, payments, customer measurements, and deliveries in seconds.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => loadAnalytics(chartPeriod)}
            className="p-3 rounded-2xl bg-[#282828] text-gray-200 hover:text-white hover:bg-[#333333] transition-smooth cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${analyticsData?.loading ? 'animate-spin' : ''}`} />
          </button>
          {!isWorker && (
            <button
              onClick={() => navigateTo('new-invoice')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#202020] font-bold text-sm hover:bg-gray-100 shadow-md transition-smooth cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              + New Invoice
            </button>
          )}
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Top 3 Interactive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Today's Revenue */}
        <div 
          onClick={() => setIsRevenueModalOpen(true)}
          className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-emerald-500 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E] group-hover:text-emerald-600 transition-colors">
              Today's Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#202020] dark:text-white">
              {isWorker ? '—' : `₹${(stats.todayRevenue || 0).toLocaleString('en-IN')}`}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5F8F68]">
                <TrendingUp className="w-3 h-3" /> Collected today
              </span>
              <span className="text-[10px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                Revenue Overview →
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Invoices */}
        <div 
          onClick={() => setIsOrderHistoryOpen(true)}
          className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-blue-500 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E] group-hover:text-blue-600 transition-colors">
              Total Invoices
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#202020] dark:text-white">
              {stats.totalInvoices || 0}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-[#777777]">
                Historical order records
              </span>
              <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                Open Ledger →
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div 
          onClick={() => navigateTo('customers', { paymentFilter: 'BALANCE_DUE' })}
          className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-red-500 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E] group-hover:text-[#B85C5C] transition-colors">
              Outstanding Balance
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-[#B85C5C] flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#B85C5C]">
              {isWorker ? '—' : `₹${(stats.totalOutstanding || 0).toLocaleString('en-IN')}`}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-[#777777]">
                To be collected
              </span>
              <span className="text-[10px] text-[#B85C5C] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                View Due →
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Owner Financial Bar Summary (Interactive Expenses & Estimated Net) */}
      {!isWorker && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Today's Expenses Card (Clickable to open ExpenseModal) */}
          <div 
            onClick={() => setIsExpenseModalOpen(true)}
            className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between hover:border-amber-500 cursor-pointer transition-smooth group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#777777] group-hover:text-amber-600 transition-colors">
                  Today's Expenses
                </span>
                <h4 className="text-lg font-bold text-[#202020] dark:text-white">
                  ₹{(stats.todayExpenses || 0).toLocaleString('en-IN')}
                </h4>
              </div>
            </div>
            <span className="text-xs text-amber-600 font-semibold opacity-80 group-hover:opacity-100 flex items-center gap-1">
              Manage Expenses →
            </span>
          </div>

          {/* Estimated Net Card */}
          {(() => {
            const isLoss = (stats.estimatedNet || 0) < 0;
            const formattedVal = isLoss
              ? `-₹${Math.abs(stats.estimatedNet || 0).toLocaleString('en-IN')}`
              : `₹${(stats.estimatedNet || 0).toLocaleString('en-IN')}`;

            return (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isLoss ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#777777]">
                      {isLoss ? 'Estimated Net (Loss)' : 'Estimated Net'}
                    </span>
                    <h4 className={`text-lg font-bold ${isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                      {formattedVal}
                    </h4>
                  </div>
                </div>
                <span className="text-xs text-[#777777]">Today's Revenue - Expenses</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Revenue Chart & Stage Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-6 flex flex-col justify-between min-h-[360px]">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white flex items-center gap-2">
                Revenue Overview
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 uppercase tracking-wider">
                  Live DB
                </span>
              </h3>
              <p className="text-xs text-[#777777]">Actual sales & collection trends backed by Supabase</p>
            </div>

            {/* Timeframe Filter Controls */}
            {!isWorker && (
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333]">
                  {['Day', 'Week', 'Month', 'Year'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setChartPeriod(period)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-smooth cursor-pointer ${
                        chartPeriod === period
                          ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                          : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart Display Area */}
          <div className="relative pt-4 pb-2 flex-1 min-h-[220px] flex items-center justify-center">
            
            {isWorker ? (
              <div className="text-xs text-[#777777]">
                Financial chart metrics restricted for Worker accounts.
              </div>
            ) : analyticsData?.loading ? (
              // Skeleton Loading State
              <div className="w-full h-[220px] flex items-end justify-between gap-3 animate-pulse px-2">
                {[40, 70, 30, 90, 50, 65, 80].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div style={{ height: `${h}%` }} className="w-full bg-gray-200 dark:bg-[#282828] rounded-xl" />
                    <div className="w-8 h-3 bg-gray-200 dark:bg-[#282828] rounded-md" />
                  </div>
                ))}
              </div>
            ) : !hasActivity ? (
              // Empty State
              <div className="w-full h-[220px] flex flex-col items-center justify-center gap-2 border border-dashed border-[#E3E3E3] dark:border-[#333333] rounded-2xl bg-[#F5F5F5]/50 dark:bg-[#252525]/50">
                <Activity className="w-8 h-8 text-[#777777]/50" />
                <span className="text-xs font-semibold text-[#777777]">
                  No financial activity recorded for {chartPeriod.toLowerCase()} view.
                </span>
                <span className="text-[11px] text-[#777777]/80">
                  Payments and expenses logged for this timeframe will automatically appear here.
                </span>
              </div>
            ) : (
              // REVENUE VS EXPENSES MODE — Grouped Comparative Bar Chart
              <div className="w-full h-[220px] flex flex-col justify-between">
                
                {/* Bar Columns Container */}
                <div className="h-[185px] flex items-end justify-between gap-2 md:gap-4 px-2">
                  {periodData.map((d, idx) => {
                    const revHeight = Math.max(6, Math.round((d.revenue / maxVal) * 100));
                    const expHeight = Math.max(6, Math.round((d.expense / maxVal) * 100));
                    const netHeight = Math.max(6, Math.round((Math.max(0, d.net) / maxVal) * 100));

                    return (
                      <div 
                        key={idx} 
                        className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Tooltip */}
                        {hoveredIndex === idx && (
                          <div className="absolute bottom-full mb-3 p-3 rounded-xl bg-[#202020] text-white text-xs font-bold shadow-xl border border-[#333333] pointer-events-none whitespace-nowrap z-30 space-y-1 animate-fade-in">
                            <div className="text-[11px] text-gray-300 border-b border-[#333333] pb-1">
                              {d.fullLabel}
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-400 font-normal">Revenue:</span>
                              <span className="text-emerald-400 font-bold">₹{d.revenue.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-gray-400 font-normal">Expenses:</span>
                              <span className="text-amber-400 font-bold">₹{d.expense.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-t border-[#333333] pt-1">
                              <span className="text-gray-400 font-normal">{d.net < 0 ? 'Net Loss:' : 'Net Profit:'}</span>
                              <span className={d.net < 0 ? "text-rose-400 font-bold" : "text-indigo-400 font-bold"}>
                                {d.net < 0 ? `-₹${Math.abs(d.net).toLocaleString('en-IN')}` : `₹${d.net.toLocaleString('en-IN')}`}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Grouped Bars */}
                        <div className="w-full bg-[#EEEEEE] dark:bg-[#282828] rounded-xl h-full flex items-end p-1 overflow-hidden gap-1 justify-center group-hover:bg-[#E0E0E0] dark:group-hover:bg-[#333333] transition-colors">
                          
                          {/* Revenue Bar */}
                          <div 
                            style={{ height: `${revHeight}%` }}
                            className="flex-1 rounded-md bg-[#202020] dark:bg-emerald-500 transition-all duration-300 group-hover:bg-emerald-600"
                            title={`Revenue: ₹${d.revenue}`}
                          />

                          {/* Expense Bar */}
                          <div 
                            style={{ height: `${expHeight}%` }}
                            className="flex-1 rounded-md bg-amber-500 transition-all duration-300 group-hover:bg-amber-400"
                            title={`Expense: ₹${d.expense}`}
                          />

                          {/* Net Bar */}
                          <div 
                            style={{ height: `${netHeight}%` }}
                            className="flex-1 rounded-md bg-indigo-500 transition-all duration-300 group-hover:bg-indigo-400"
                            title={`Net: ₹${d.net}`}
                          />

                        </div>

                        <span className="text-[11px] font-semibold text-[#777777] dark:text-[#9E9E9E]">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>

          {/* Chart Legend */}
          {!isWorker && hasActivity && (
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-[#E3E3E3] dark:border-[#333333] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#202020] dark:bg-emerald-500 inline-block" />
                <span className="font-semibold text-[#202020] dark:text-white">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
                <span className="font-semibold text-[#202020] dark:text-white">Expenses</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-indigo-500 inline-block" />
                <span className="font-semibold text-[#202020] dark:text-white">Net</span>
              </div>
            </div>
          )}

        </div>

        {/* Order Status Workflow Breakdown (1 Column) - Clickable Rows */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-[#202020] dark:text-white">Order Status Pipeline</h3>
            <p className="text-xs text-[#777777]">Click any stage to filter Production Registers</p>
          </div>

          <div className="space-y-2 py-1">
            {orderStatusPipeline.map((stage, idx) => (
              <div 
                key={idx} 
                onClick={() => navigateTo('registers', { stageFilter: stage.label })}
                className="p-2 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth group space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#202020] dark:text-white flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.bgColor}`} />
                    {stage.label}
                  </span>
                  <span className={`${stage.textColor} group-hover:underline`}>{stage.count} orders</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EEEEEE] dark:bg-[#282828] overflow-hidden">
                  <div 
                    style={{ width: `${stage.percentage}%` }}
                    className={`h-full rounded-full ${stage.bgColor}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigateTo('registers')}
            className="w-full py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth text-center block cursor-pointer"
          >
            Open Production Registers →
          </button>
        </div>

      </div>

      {/* Recent Orders Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[#202020] dark:text-white">Recent Orders</h3>
            <p className="text-xs text-[#777777]">Latest tailoring shop invoices and progress</p>
          </div>
          <button
            onClick={() => navigateTo('registers')}
            className="flex items-center gap-1 text-xs font-bold text-[#202020] dark:text-white hover:underline cursor-pointer"
          >
            View all orders <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Invoice</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {recentOrders.length > 0 ? (
                recentOrders.map((inv) => (
                  <tr 
                    key={inv.id}
                    onClick={() => navigateTo('invoice-detail', { invoiceId: inv.id })}
                    className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth group"
                  >
                    <td className="py-3.5 px-3 font-bold text-[#202020] dark:text-white">{inv.id}</td>
                    <td className="py-3.5 px-3">
                      <span className="font-medium text-[#202020] dark:text-white block">{inv.customerName}</span>
                      <span className="text-[10px] text-[#777777]">{inv.phone}</span>
                    </td>
                    <td className="py-3.5 px-3 text-[#777777] dark:text-[#9E9E9E]">
                      {(inv.services || []).map(s => s.name).join(', ')}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-[#202020] dark:text-white">{inv.dueDate}</td>
                    <td className="py-3.5 px-3 font-bold text-[#202020] dark:text-white">₹{inv.total}</td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#777777] group-hover:text-[#202020] dark:group-hover:text-white">
                        <Eye className="w-3.5 h-3.5" /> View
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-[#777777]">
                    No orders recorded yet. Click "+ New Invoice" to create an order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Overview Modal */}
      {isRevenueModalOpen && (
        <RevenueOverviewModal 
          isOpen={isRevenueModalOpen} 
          onClose={() => setIsRevenueModalOpen(false)} 
        />
      )}

      {/* Expense Management Modal */}
      {isExpenseModalOpen && (
        <ExpenseModal 
          isOpen={isExpenseModalOpen} 
          onClose={() => setIsExpenseModalOpen(false)} 
        />
      )}

      {/* Historical Order History Modal */}
      {isOrderHistoryOpen && (
        <OrderHistoryModal 
          isOpen={isOrderHistoryOpen} 
          onClose={() => setIsOrderHistoryOpen(false)} 
        />
      )}

    </div>
  );
};
