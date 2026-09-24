import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Send, 
  Banknote, 
  Calendar, 
  User, 
  Phone, 
  Scissors, 
  Package, 
  CheckCircle2, 
  Truck,
  Clock,
  ShieldCheck,
  Ruler,
  Edit3
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../common/StatusBadge';
import { PrintInvoiceModal } from '../modals/PrintInvoiceModal';
import { WhatsAppModal } from '../modals/WhatsAppModal';
import { PaymentModal } from '../modals/PaymentModal';

export const InvoiceDetailView = () => {
  const { invoices, customers, selectedInvoiceId, navigateTo, toggleStage, openCustomerProfile } = useShop();

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const invoice = invoices.find(i => i.id === selectedInvoiceId) || invoices[0];
  const customerObj = customers.find(c => c.id === invoice.customerId || c.phone === invoice.phone);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateTo('registers')}
          className="flex items-center gap-2 text-xs font-bold text-[#777777] hover:text-[#202020] dark:hover:text-white transition-smooth"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Registers
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('new-invoice', { orderToEdit: invoice })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Edit Order
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Invoice
          </button>

          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition-smooth cursor-pointer"
          >
            <Send className="w-4 h-4" /> Send via WhatsApp
          </button>

          {invoice.balance > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-600 text-emerald-600 font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs transition-smooth cursor-pointer"
            >
              <Banknote className="w-4 h-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-8">
        
        {/* Invoice Title & Customer Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E3E3E3] dark:border-[#333333]">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-[#202020] dark:text-white tracking-tight">
                {invoice.id}
              </h2>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-[#777777] mt-1">
              Generated on {invoice.date} • Due for delivery on <span className="font-bold text-[#202020] dark:text-white">{invoice.dueDate}</span>
            </p>
          </div>

          <div 
            onClick={() => openCustomerProfile(customerObj ? customerObj.id : invoice.customerId)}
            className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center gap-4 cursor-pointer hover:border-emerald-500 transition-smooth group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#202020] text-white flex items-center justify-center font-bold text-sm">
              {invoice.customerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#202020] dark:text-white group-hover:text-emerald-600 transition-smooth">
                {invoice.customerName}
              </h4>
              <span className="text-xs text-[#777777] font-mono">{invoice.phone} • Click for Profile</span>
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-[#202020] dark:text-white">Particulars & Services</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Service Name</th>
                  <th className="py-3 px-3">Task Status</th>
                  <th className="py-3 px-3">Quantity</th>
                  <th className="py-3 px-3">Rate</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                {invoice.services.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 px-3 font-semibold text-[#202020] dark:text-white">{item.name}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                        {item.status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#777777]">{item.qty}</td>
                    <td className="py-3.5 px-3 text-[#777777]">₹{item.rate}</td>
                    <td className="py-3.5 px-3 font-bold text-right text-[#202020] dark:text-white">₹{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historical Measurements Snapshot (Only relevant non-empty measurements) */}
        {invoice.measurements && (
          <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#777777] flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-emerald-600" /> Order Measurement Snapshot
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {Object.entries(invoice.measurements).map(([garment, fields]) => {
                if (!fields || typeof fields !== 'object') return null;
                if (fields.suppliedGarment) {
                  return (
                    <div key={garment} className="p-2.5 rounded-xl bg-white dark:bg-[#1E1E1E] space-y-1 border border-[#E3E3E3] dark:border-[#333333]">
                      <span className="font-bold text-[10px] uppercase text-[#777777] block capitalize border-b pb-0.5">
                        {garment}
                      </span>
                      <p className="text-[11px] font-bold text-emerald-600 pt-0.5">
                        Customer mentioned measurements
                      </p>
                    </div>
                  );
                }
                const keys = Object.keys(fields).filter(k => {
                  if (k === 'suppliedGarment') return false;
                  const val = fields[k];
                  return val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0' && String(val).trim() !== '-';
                });
                if (keys.length === 0) return null;
                return (
                  <div key={garment} className="p-2.5 rounded-xl bg-white dark:bg-[#1E1E1E] space-y-1">
                    <span className="font-bold text-[10px] uppercase text-[#777777] block capitalize border-b pb-0.5">
                      {garment}
                    </span>
                    {keys.map(k => (
                      <div key={k} className="flex justify-between text-[11px]">
                        <span className="capitalize text-[#777777]">{k}:</span>
                        <span className="font-bold text-[#202020] dark:text-white">{fields[k]}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Financial Breakdown Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E3E3E3] dark:border-[#333333]">
          
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#777777] uppercase tracking-wider block">Fitting Notes</span>
            <p className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] text-xs text-[#202020] dark:text-white leading-relaxed">
              {invoice.notes || "No special instructions recorded."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] space-y-2 text-xs">
            <div className="flex justify-between text-[#777777]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#202020] dark:text-white">₹{invoice.subtotal}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-[#777777]">
                <span>Discount</span>
                <span className="font-semibold text-emerald-600">-₹{invoice.discount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-[#E3E3E3] dark:border-[#333333] text-[#202020] dark:text-white">
              <span>Total Invoice Amount</span>
              <span>₹{invoice.total}</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
              <span>Advance Paid ({invoice.paymentMode})</span>
              <span>₹{invoice.advancePaid}</span>
            </div>
            {invoice.extraPaid > 0 ? (
              <div className="flex justify-between font-bold text-sm text-emerald-600 pt-2 border-t border-dashed border-[#E3E3E3] dark:border-[#333333]">
                <span>Extra Paid / Credit</span>
                <span>₹{invoice.extraPaid}</span>
              </div>
            ) : (
              <div className="flex justify-between font-bold text-sm text-[#B85C5C] pt-2 border-t border-dashed border-[#E3E3E3] dark:border-[#333333]">
                <span>Balance Due</span>
                <span>₹{invoice.balance}</span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODALS */}
      {showPrintModal && <PrintInvoiceModal invoice={invoice} onClose={() => setShowPrintModal(false)} />}
      {showWhatsAppModal && <WhatsAppModal invoice={invoice} onClose={() => setShowWhatsAppModal(false)} />}
      {showPaymentModal && <PaymentModal invoice={invoice} onClose={() => setShowPaymentModal(false)} />}

    </div>
  );
};
