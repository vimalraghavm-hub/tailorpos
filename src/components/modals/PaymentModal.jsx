import React, { useState } from 'react';
import { X, CreditCard, Banknote, QrCode, CheckCircle2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';

export const PaymentModal = ({ invoice, onClose }) => {
  const { recordPayment } = useShop();
  const [amount, setAmount] = useState(invoice ? invoice.balance : 0);
  const [paymentMode, setPaymentMode] = useState('UPI');

  useModalDismiss(onClose, Boolean(invoice));

  if (!invoice) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payVal = parseFloat(amount);
    if (payVal > 0) {
      recordPayment(invoice.id, payVal, paymentMode);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={Boolean(invoice)}
      onClose={onClose}
      size="sm"
      maxWidthClass="max-w-md"
      zIndex={9990}
    >
        
        {/* Header */}
        <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Record Payment</h3>
              <p className="text-xs text-[#777777]">{invoice.id} - {invoice.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#EEEEEE] text-[#777777]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] space-y-1">
            <div className="flex justify-between text-xs text-[#777777]">
              <span>Total Invoice Amount</span>
              <span className="font-semibold text-[#202020] dark:text-white">₹{invoice.total}</span>
            </div>
            <div className="flex justify-between text-xs text-[#777777]">
              <span>Already Paid</span>
              <span className="font-semibold text-emerald-600">₹{invoice.advancePaid}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#E3E3E3] dark:border-[#333333]">
              <span className="text-[#202020] dark:text-white">Current Balance Due</span>
              <span className="text-red-500">₹{invoice.balance}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-2">
              Payment Amount Received (₹)
            </label>
            <input
              type="number"
              min="1"
              max={invoice.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-lg font-bold text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-2">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'Cash', label: 'Cash', icon: Banknote },
                { id: 'Card', label: 'Card', icon: CreditCard },
              ].map((mode) => {
                const Icon = mode.icon;
                const selected = paymentMode === mode.id;
                return (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => setPaymentMode(mode.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-smooth ${
                      selected
                        ? 'bg-[#202020] text-white border-[#202020] dark:bg-white dark:text-[#202020]'
                        : 'border-[#E3E3E3] dark:border-[#333333] text-[#777777] hover:bg-[#F5F5F5]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#777777]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Payment
            </button>
          </div>

        </form>
    </Modal>
  );
};
