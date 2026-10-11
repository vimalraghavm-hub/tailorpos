import React, { useState, useMemo } from 'react';
import { 
  X, 
  IndianRupee, 
  Calendar, 
  TrendingUp, 
  Receipt, 
  PiggyBank, 
  AlertTriangle,
  Search,
  Eye,
  CreditCard
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { calculatePeriodFinancials } from '../../utils/dateUtils';
import { Modal } from '../common/Modal';

export const RevenueOverviewModal = ({ isOpen = true, onClose }) => {
  const { payments = [], expenses = [], invoices = [], navigateTo } = useShop();
  useModalDismiss(onClose, isOpen);

  const [period, setPeriod] = useState('TODAY'); // 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR'
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Unified financial calculations for the selected period
  const { periodPayments, periodExpenses, totalRevenue, totalExpenses, netProfit: netResult } = useMemo(() => {
    return calculatePeriodFinancials(payments, expenses, period);
  }, [payments, expenses, period]);

  // Total Outstanding Balance across valid non-cancelled orders
  const totalOutstanding = useMemo(() => {
    return (invoices || []).reduce((sum, inv) => {
      if ((inv.status || '').toUpperCase() === 'CANCELLED') return sum;
      return sum + (parseFloat(inv.balance) || 0);
    }, 0);
  }, [invoices]);

  // Map payments with order / customer metadata for display
  const paymentRecords = useMemo(() => {
    const invMapByDbId = (invoices || []).reduce((acc, inv) => {
      if (inv.dbId) acc[String(inv.dbId)] = inv;
      if (inv.id) acc[String(inv.id)] = inv;
      return acc;
    }, {});

    return periodPayments.map(p => {
      const matchedInv = invMapByDbId[String(p.order_id)] || null;
      const invNumber = matchedInv?.id || p.reference_number || (p.order_id ? `ORD-${String(p.order_id).substring(0, 8)}` : 'N/A');
      const customerName = matchedInv?.customerName || matchedInv?.customers?.name || 'Customer';
      const phone = matchedInv?.phone || matchedInv?.customers?.phone || '';
      const remainingBalance = matchedInv ? (parseFloat(matchedInv.balance) || 0) : 0;
      const pDate = p.paid_at || p.created_at;
      const formattedDate = pDate ? new Date(pDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today';

      return {
        id: p.id,
        invoiceNumber: invNumber,
        orderDbId: matchedInv?.id || p.order_id,
        customerName,
        phone,
        amount: parseFloat(p.amount) || 0,
        paymentDate: formattedDate,
        paymentMethod: p.payment_method || 'CASH',
        remainingBalance,
        isPaid: remainingBalance === 0
      };
    }).filter(record => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return record.invoiceNumber.toLowerCase().includes(term) ||
             record.customerName.toLowerCase().includes(term) ||
             record.phone.includes(term) ||
             record.paymentMethod.toLowerCase().includes(term);
    });
  }, [periodPayments, invoices, searchTerm]);

  const handleSelectInvoice = (invId) => {
    if (!invId) return;
    onClose();
    navigateTo('invoice-detail', { invoiceId: invId });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      maxWidthClass="max-w-4xl"
      zIndex={10020}
    >
      {/* Modal Header */}
      <div className="p-3.5 sm:p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#202020] dark:text-white leading-tight">
              Revenue Overview
            </h3>
            <p className="text-[11px] sm:text-xs text-[#777777]">
              Financial collection metrics & payment transactions breakdown
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">

        {/* Period Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#777777]">
            Select Calculation Period:
          </span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] shrink-0">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'THIS_YEAR', label: 'This Year' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-smooth cursor-pointer ${
                  period === p.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Revenue Card */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Collected Revenue
            </span>
            <h4 className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-emerald-600/80 mt-1">
              Payments in period
            </span>
          </div>

          {/* Expenses Card */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              Expenses
            </span>
            <h4 className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-2">
              ₹{totalExpenses.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-amber-600/80 mt-1">
              Expenses in period
            </span>
          </div>

          {/* Outstanding Card */}
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">
              Outstanding Balance
            </span>
            <h4 className="text-xl font-bold text-red-700 dark:text-red-300 mt-2">
              ₹{totalOutstanding.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-red-600/80 mt-1">
              Unpaid order dues
            </span>
          </div>

          {/* Net Result Card */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
            netResult < 0 
              ? 'bg-rose-500/10 border-rose-500/20' 
              : 'bg-indigo-500/10 border-indigo-500/20'
          }`}>
            <span className={`text-[11px] font-semibold ${
              netResult < 0 
                ? 'text-rose-700 dark:text-rose-400' 
                : 'text-indigo-700 dark:text-indigo-400'
            }`}>
              {netResult < 0 ? 'Net Loss' : 'Estimated Profit'}
            </span>
            <h4 className={`text-xl font-bold mt-2 ${
              netResult < 0 
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-indigo-700 dark:text-indigo-300'
            }`}>
              {netResult < 0 
                ? `-₹${Math.abs(netResult).toLocaleString('en-IN')}` 
                : `₹${netResult.toLocaleString('en-IN')}`}
            </h4>
            <span className={`text-[10px] mt-1 ${
              netResult < 0 
                ? 'text-rose-600/80' 
                : 'text-indigo-600/80'
            }`}>
              Revenue - Expenses
            </span>
          </div>

        </div>

        {/* Contributing Payments / Orders Header & Search */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-[#202020] dark:text-white">
                Payments Received ({paymentRecords.length})
              </h4>
              <p className="text-xs text-[#777777]">
                Transaction logs contributing to revenue for {period.toLowerCase().replace('_', ' ')}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Payments Table */}
          <div className="overflow-x-auto border border-[#E3E3E3] dark:border-[#333333] rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Payment Amount</th>
                  <th className="py-3 px-3">Payment Date</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Remaining Balance</th>
                  <th className="py-3 px-3">Payment Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                {paymentRecords.length > 0 ? (
                  paymentRecords.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectInvoice(p.orderDbId)}
                      className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth group"
                    >
                      <td className="py-3 px-3 font-bold text-[#202020] dark:text-white">
                        {p.invoiceNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#202020] dark:text-white block">{p.customerName}</span>
                        {p.phone && <span className="text-[10px] text-[#777777]">{p.phone}</span>}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-600">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-[#777777] font-mono">
                        {p.paymentDate}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F5F5] dark:bg-[#282828] text-[10px] font-bold text-[#202020] dark:text-white uppercase">
                          <CreditCard className="w-3 h-3 text-emerald-600" />
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-bold ${p.remainingBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        ₹{p.remainingBalance.toLocaleString('en-IN')} balance
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isPaid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {p.isPaid ? 'PAID' : 'PARTIAL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#777777] group-hover:text-[#202020] dark:group-hover:text-white">
                          <Eye className="w-3.5 h-3.5" /> View
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[#777777]">
                      No payment transactions recorded for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </Modal>
  );
};
