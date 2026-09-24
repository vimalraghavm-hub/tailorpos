import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Scissors, 
  ArrowUpRight,
  TrendingUp,
  Eye,
  PlusCircle,
  Receipt,
  PiggyBank,
  RefreshCw
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../common/StatusBadge';

export const DashboardView = () => {
  const { stats, invoices, analyticsData, loadAnalytics, userRole, navigateTo } = useShop();
  const [chartPeriod, setChartPeriod] = useState('Week'); // Day, Week, Month, Year

  useEffect(() => {
    if (loadAnalytics) {
      loadAnalytics(chartPeriod);
    }
  }, [chartPeriod]);

  // Fallback demo chart dataset if offline / no Supabase
  const fallbackChartDataMap = {
    Day: [
      { label: '8 AM', value: 1200 },
      { label: '10 AM', value: 3400 },
      { label: '12 PM', value: 5800 },
      { label: '2 PM', value: 2100 },
      { label: '4 PM', value: 4500 },
      { label: '6 PM', value: 6800 },
      { label: '8 PM', value: 3200 }
    ],
    Week: [
      { label: 'Mon', value: 12400 },
      { label: 'Tue', value: 18450 },
      { label: 'Wed', value: 15200 },
      { label: 'Thu', value: 21000 },
      { label: 'Fri', value: 19800 },
      { label: 'Sat', value: 26500 },
      { label: 'Sun', value: 14000 }
    ],
    Month: [
      { label: 'W1', value: 78000 },
      { label: 'W2', value: 92400 },
      { label: 'W3', value: 85000 },
      { label: 'W4', value: 112000 }
    ],
    Year: [
      { label: 'Q1', value: 245000 },
      { label: 'Q2', value: 310000 },
      { label: 'Q3', value: 289000 },
      { label: 'Q4', value: 380000 }
    ]
  };

  const currentChartData = (analyticsData?.revenueTrend && analyticsData.revenueTrend.length > 0)
    ? analyticsData.revenueTrend.map(d => ({ label: d.label, value: parseFloat(d.value) || 0 }))
    : fallbackChartDataMap[chartPeriod];

  const maxValue = Math.max(1, ...currentChartData.map(d => d.value));

  // 5 Recent orders
  const recentOrders = (invoices || []).slice(0, 5);

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

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        
        {/* Today's Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-[#202020]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E]">Today's Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#202020] dark:text-white">
              {isWorker ? '—' : `₹${(stats.todayRevenue || 0).toLocaleString('en-IN')}`}
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5F8F68] mt-1">
              <TrendingUp className="w-3 h-3" /> Collected today
            </span>
          </div>
        </div>

        {/* Invoices */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-[#202020]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E]">Total Invoices</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#202020] dark:text-white">
              {stats.totalInvoices || 0}
            </h3>
            <span className="text-[11px] text-[#777777] mt-1 block">Active order count</span>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-[#202020]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E]">Pending Orders</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#C89B3C] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#202020] dark:text-white">
              {stats.pendingOrders || 0}
            </h3>
            <span className="text-[11px] text-[#C89B3C] font-semibold mt-1 block">In production stage</span>
          </div>
        </div>

        {/* Ready for Delivery */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-[#202020]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E]">Ready Delivery</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#202020] dark:text-white">
              {stats.readyForDelivery || 0}
            </h3>
            <span className="text-[11px] text-purple-600 font-semibold mt-1 block">Packed & ready</span>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col justify-between transition-smooth hover:border-[#202020]/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E]">Outstanding</span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-[#B85C5C] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-[#B85C5C]">
              {isWorker ? '—' : `₹${(stats.totalOutstanding || 0).toLocaleString('en-IN')}`}
            </h3>
            <span className="text-[11px] text-[#777777] mt-1 block">To be collected</span>
          </div>
        </div>

      </div>

      {/* Owner Financial Bar Summary (Expenses & Estimated Net) */}
      {!isWorker && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#777777]">Today's Expenses</span>
                <h4 className="text-lg font-bold text-[#202020] dark:text-white">₹{(stats.todayExpenses || 0).toLocaleString('en-IN')}</h4>
              </div>
            </div>
            <span className="text-xs text-[#777777]">Shop operating costs</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#777777]">Estimated Net</span>
                <h4 className="text-lg font-bold text-emerald-600">₹{(stats.estimatedNet || 0).toLocaleString('en-IN')}</h4>
              </div>
            </div>
            <span className="text-xs text-[#777777]">Sales - Expenses</span>
          </div>
        </div>
      )}

      {/* Revenue Chart & Stage Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Chart (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Revenue Overview</h3>
              <p className="text-xs text-[#777777]">Sales & collection trends across periods</p>
            </div>

            {/* Timeframe Filter Buttons */}
            {!isWorker && (
              <div className="flex items-center p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333]">
                {['Day', 'Week', 'Month', 'Year'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-smooth cursor-pointer ${
                      chartPeriod === period
                        ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                        : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bar / SVG Visual Chart */}
          <div className="pt-4 pb-2">
            {isWorker ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-[#777777]">
                Financial chart metrics restricted for Worker accounts.
              </div>
            ) : (
              <div className="h-[220px] flex items-end justify-between gap-3 md:gap-6 px-2">
                {currentChartData.map((item, index) => {
                  const heightPercent = Math.max(12, Math.round((item.value / maxValue) * 100));
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 absolute -top-8 px-2 py-1 rounded-lg bg-[#202020] text-white text-[10px] font-bold pointer-events-none whitespace-nowrap shadow-md z-10">
                        ₹{item.value.toLocaleString('en-IN')}
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-[#EEEEEE] dark:bg-[#282828] rounded-xl h-full flex items-end p-1 overflow-hidden">
                        <div 
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-lg bg-[#202020] dark:bg-emerald-500 transition-all duration-500 group-hover:bg-emerald-600"
                        />
                      </div>

                      <span className="text-xs font-semibold text-[#777777] dark:text-[#9E9E9E]">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Order Status Workflow Breakdown (1 Column) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-[#202020] dark:text-white">Order Status Pipeline</h3>
            <p className="text-xs text-[#777777]">Live tracking of active orders</p>
          </div>

          <div className="space-y-3 py-2">
            {(analyticsData?.orderStatusSummary && analyticsData.orderStatusSummary.length > 0) ? (
              analyticsData.orderStatusSummary.map((stage, idx) => {
                const totalOrdersCount = analyticsData.orderStatusSummary.reduce((acc, c) => acc + (c.count || 0), 0) || 1;
                const styleClass = statusColors[stage.label?.toUpperCase()] || 'bg-gray-400 text-gray-500';
                const [bgColor, textColor] = styleClass.split(' ');
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#202020] dark:text-white flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${bgColor}`} />
                        {stage.label}
                      </span>
                      <span className={textColor}>{stage.count} orders</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#EEEEEE] dark:bg-[#282828] overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, Math.round((stage.count / totalOrdersCount) * 100))}%` }}
                        className={`h-full rounded-full ${bgColor}`}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              [
                { label: 'Cutting', count: stats.statusCounts.cutting, total: stats.totalInvoices || 1, color: 'bg-amber-500', text: 'text-amber-600' },
                { label: 'Stitching', count: stats.statusCounts.stitching, total: stats.totalInvoices || 1, color: 'bg-blue-500', text: 'text-blue-600' },
                { label: 'Packing', count: stats.statusCounts.packing, total: stats.totalInvoices || 1, color: 'bg-purple-500', text: 'text-purple-600' },
                { label: 'Ready', count: stats.statusCounts.ready, total: stats.totalInvoices || 1, color: 'bg-[#5F8F68]', text: 'text-[#5F8F68]' },
                { label: 'Delivered', count: stats.statusCounts.delivered, total: stats.totalInvoices || 1, color: 'bg-gray-400', text: 'text-gray-500' },
              ].map((stage, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#202020] dark:text-white flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                      {stage.label}
                    </span>
                    <span className={stage.text}>{stage.count} orders</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#EEEEEE] dark:bg-[#282828] overflow-hidden">
                    <div 
                      style={{ width: `${Math.min(100, Math.round((stage.count / stage.total) * 100))}%` }}
                      className={`h-full rounded-full ${stage.color}`}
                    />
                  </div>
                </div>
              ))
            )}
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

    </div>
  );
};
