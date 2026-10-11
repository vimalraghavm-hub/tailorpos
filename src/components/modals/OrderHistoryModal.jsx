import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  Search, 
  ArrowUpRight, 
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

export const OrderHistoryModal = ({ isOpen = true, onClose }) => {
  const { invoices = [], allInvoices = [], navigateTo, deleteOrder, userRole = 'OWNER' } = useShop();
  useModalDismiss(onClose, isOpen);

  if (!isOpen) return null;

  const [filterPeriod, setFilterPeriod] = useState('ALL'); // 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL'
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const ledgerInvoices = allInvoices.length > 0 ? allInvoices : invoices;

  // Helper to parse invoice order date
  const parseOrderDate = (inv) => {
    if (!inv) return null;
    const dStr = inv.date || inv.created_at;
    if (!dStr) return null;
    const t = new Date(dStr).getTime();
    if (!isNaN(t) && t > 0) return new Date(dStr);
    return null;
  };

  // Filter orders by creation period
  const filteredInvoices = (ledgerInvoices || []).filter(inv => {
    // Search matching
    const matchSearch = (inv.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (inv.phone || '').includes(searchTerm);
    if (!matchSearch) return false;

    if (filterPeriod === 'ALL') return true;

    const ordDate = parseOrderDate(inv);
    if (!ordDate) return filterPeriod === 'ALL';

    const diffDays = (now.getTime() - ordDate.getTime()) / (1000 * 3600 * 24);

    if (filterPeriod === 'TODAY') {
      return ordDate.toISOString().split('T')[0] === todayStr || diffDays < 1;
    }
    if (filterPeriod === 'THIS_WEEK') {
      return diffDays <= 7;
    }
    if (filterPeriod === 'THIS_MONTH') {
      return ordDate.getMonth() === now.getMonth() && ordDate.getFullYear() === now.getFullYear();
    }

    return true;
  });

  const handleSelectInvoice = (invId) => {
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
      {/* Header */}
      <div className="p-3.5 sm:p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#202020] dark:text-white leading-tight">
              Historical Orders & Invoices Ledger
            </h3>
            <p className="text-[11px] sm:text-xs text-[#777777]">
              Complete record of created orders across all time
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

      {/* Body Content */}
      <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
        
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] shrink-0">
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilterPeriod(p.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-smooth cursor-pointer ${
                  filterPeriod === p.id
                    ? 'bg-[#202020] text-white dark:bg-white dark:text-[#202020]'
                    : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto border border-[#E3E3E3] dark:border-[#333333] rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Order Date</th>
                <th className="py-3 px-3">Total Amount</th>
                <th className="py-3 px-3">Paid Amount</th>
                <th className="py-3 px-3">Balance</th>
                <th className="py-3 px-3">Payment Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const balanceVal = Math.max(0, parseFloat(inv.balance !== undefined ? inv.balance : (inv.balance_amount !== undefined ? inv.balance_amount : 0)) || 0);
                  const isPaid = balanceVal === 0 || Math.abs(balanceVal) < 0.01;
                  const displayStatus = isPaid ? 'DELIVERED' : (inv.status || 'PENDING');

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv.id)}
                      className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth group"
                    >
                      <td className="py-3.5 px-3 font-bold text-[#202020] dark:text-white">{inv.id}</td>
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-[#202020] dark:text-white block">{inv.customerName}</span>
                        <span className="text-[10px] text-[#777777]">{inv.phone}</span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[#777777]">{inv.date}</td>
                      <td className="py-3.5 px-3 font-bold text-[#202020] dark:text-white">₹{inv.total}</td>
                      <td className="py-3.5 px-3 text-emerald-600 font-semibold">₹{inv.advancePaid}</td>
                      <td className={`py-3.5 px-3 font-bold ${balanceVal > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        ₹{balanceVal}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid 
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : (inv.advancePaid > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-500')
                          }`}>
                            {isPaid ? 'PAID' : (inv.advancePaid > 0 ? 'PARTIAL' : 'UNPAID')}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            displayStatus.toUpperCase() === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {displayStatus}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectInvoice(inv.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          {userRole === 'OWNER' && (
                            <button
                              type="button"
                              onClick={() => setInvoiceToDelete(inv)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                              title="Permanently delete this invoice/order"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#777777]">
                    No historical orders match the selected search or date filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setInvoiceToDelete(null)}
          size="sm"
          maxWidthClass="max-w-md"
          zIndex={10040}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#202020] dark:text-white">Delete Invoice?</h3>
                <p className="text-xs text-[#777777]">Permanent Database Action</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-1 text-xs font-medium text-[#202020] dark:text-white">
              <div><strong className="text-[#777777]">Invoice:</strong> {invoiceToDelete.id}</div>
              <div><strong className="text-[#777777]">Customer:</strong> {invoiceToDelete.customerName}</div>
              <div><strong className="text-[#777777]">Amount:</strong> ₹{invoiceToDelete.total}</div>
            </div>

            <p className="text-xs text-[#202020] dark:text-gray-300 leading-relaxed">
              This permanently deletes this invoice/order and its associated order data. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3E3E3] dark:border-[#333333]">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#777777] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = invoiceToDelete.id;
                  setInvoiceToDelete(null);
                  await deleteOrder(targetId);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md cursor-pointer transition-smooth"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </Modal>
      )}

    </Modal>
  );
};
