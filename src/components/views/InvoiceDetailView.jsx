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
  ShieldCheck
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../common/StatusBadge';
import { PrintInvoiceModal } from '../modals/PrintInvoiceModal';
import { WhatsAppModal } from '../modals/WhatsAppModal';
import { PaymentModal } from '../modals/PaymentModal';

export const InvoiceDetailView = () => {
  const { invoices, selectedInvoiceId, navigateTo, toggleStage } = useShop();

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const invoice = invoices.find(i => i.id === selectedInvoiceId) || invoices[0];

  const stages = [
    { key: 'created', label: 'Order Created', icon: CheckCircle2, completed: true },
    { key: 'cutting', label: 'Cutting', icon: Scissors, completed: invoice.cutting },
    { key: 'stitching', label: 'Stitching', icon: Scissors, completed: invoice.stitching },
    { key: 'packing', label: 'Packing', icon: Package, completed: invoice.packing },
    { key: 'delivery', label: 'Delivered', icon: Truck, completed: invoice.delivery },
  ];

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
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth"
          >
            <Printer className="w-4 h-4" /> Print Invoice
          </button>

          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition-smooth"
          >
            <Send className="w-4 h-4" /> Send via WhatsApp
          </button>

          {invoice.balance > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth"
            >
              <Banknote className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Record Payment
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

          <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#202020] text-white flex items-center justify-center font-bold text-sm">
              {invoice.customerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#202020] dark:text-white">{invoice.customerName}</h4>
              <span className="text-xs text-[#777777] font-mono">{invoice.phone}</span>
            </div>
          </div>
        </div>

        {/* ORDER PROGRESS WORKFLOW PIPELINE TRACKER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#202020] dark:text-white">Order Progress Tracker</h3>
            <span className="text-xs text-[#777777]">Click any stage step to toggle status</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {stages.map((stage) => {
              const Icon = stage.icon;
              return (
                <button
                  key={stage.key}
                  onClick={() => stage.key !== 'created' && toggleStage(invoice.id, stage.key)}
                  className={`p-3 rounded-2xl border text-left transition-smooth flex flex-col justify-between h-20 ${
                    stage.completed
                      ? 'bg-[#202020] text-white border-[#202020] dark:bg-white dark:text-[#202020] shadow-xs'
                      : 'bg-[#F5F5F5] dark:bg-[#252525] border-[#E3E3E3] dark:border-[#333333] text-[#777777] hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${stage.completed ? 'text-emerald-400 dark:text-emerald-600' : ''}`} />
                    <span className="text-[10px] font-bold uppercase">{stage.completed ? 'Done ✓' : 'Pending'}</span>
                  </div>
                  <span className="font-bold text-xs truncate">{stage.label}</span>
                </button>
              );
            })}
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
                  <th className="py-3 px-3">Quantity</th>
                  <th className="py-3 px-3">Rate</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                {invoice.services.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 px-3 font-semibold text-[#202020] dark:text-white">{item.name}</td>
                    <td className="py-3.5 px-3 text-[#777777]">{item.qty}</td>
                    <td className="py-3.5 px-3 text-[#777777]">₹{item.rate}</td>
                    <td className="py-3.5 px-3 font-bold text-right text-[#202020] dark:text-white">₹{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
            <div className="flex justify-between font-bold text-sm text-[#B85C5C] pt-2 border-t border-dashed border-[#E3E3E3] dark:border-[#333333]">
              <span>Balance Due</span>
              <span>₹{invoice.balance}</span>
            </div>
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
