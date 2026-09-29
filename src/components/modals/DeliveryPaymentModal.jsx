import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, Banknote, X, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';

export const DeliveryPaymentModal = ({
  isOpen,
  order: orderProp,
  invoice: invoiceProp,
  onClose,
  onConfirmDelivery
}) => {
  useModalDismiss(onClose, isOpen);
  const { deliverOrder } = useShop();

  const order = orderProp || invoiceProp;

  const [amountPaidNow, setAmountPaidNow] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setAmountPaidNow(order.balance !== undefined ? order.balance : 0);
      setPaymentMode(order.paymentMode || 'Cash');
      setIsSubmitting(false);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const total = order.total || 0;
  const alreadyPaid = order.advancePaid || 0;
  const currentBalance = order.balance !== undefined ? order.balance : Math.max(0, total - alreadyPaid);
  
  const parsedPaidNow = Math.max(0, parseFloat(amountPaidNow) || 0);
  const newTotalPaid = Math.min(total, alreadyPaid + parsedPaidNow);
  const newBalance = Math.max(0, currentBalance - parsedPaidNow);
  const isFullyPaid = newBalance === 0;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (onConfirmDelivery) {
        await onConfirmDelivery({
          orderId: order.id,
          dbId: order.dbId,
          amountPaidNow: parsedPaidNow,
          paymentMode
        });
      } else {
        await deliverOrder(order.id || order.dbId, parsedPaidNow, paymentMode);
      }
      onClose();
    } catch (err) {
      console.error('Error in delivery payment confirmation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      maxWidthClass="max-w-md"
      zIndex={10020}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">
                Order Delivery & Payment Settlement
              </h3>
              <p className="text-[11px] text-[#777777]">
                Order #{order.id} • {order.customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#252525] text-[#777777] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Financial Summary Card */}
        <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-2">
          <div className="flex justify-between text-[#777777]">
            <span>Total Order Amount:</span>
            <span className="font-bold text-[#202020] dark:text-white">₹{total}</span>
          </div>
          <div className="flex justify-between text-[#777777]">
            <span>Previously Paid:</span>
            <span className="font-semibold text-emerald-600">₹{alreadyPaid}</span>
          </div>
          <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-[#E3E3E3] dark:border-[#333333] text-[#B85C5C]">
            <span>Current Balance Due:</span>
            <span>₹{currentBalance}</span>
          </div>
        </div>

        {/* Amount Paid Now Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#202020] dark:text-white">
            Amount Paid Now (₹)
          </label>
          <div className="relative flex items-center">
            <Banknote className="w-4 h-4 text-[#777777] absolute left-3.5" />
            <input
              type="number"
              min="0"
              max={currentBalance}
              value={amountPaidNow}
              onChange={(e) => setAmountPaidNow(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] font-bold text-sm text-[#202020] dark:text-white focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#777777] pt-0.5">
            <button
              type="button"
              onClick={() => setAmountPaidNow(currentBalance)}
              className="text-emerald-600 font-bold hover:underline cursor-pointer"
            >
              Full Payment (₹{currentBalance})
            </button>
            <button
              type="button"
              onClick={() => setAmountPaidNow(0)}
              className="text-[#777777] hover:underline cursor-pointer"
            >
              Zero Payment (₹0)
            </button>
          </div>
        </div>

        {/* Payment Method Selector */}
        {parsedPaidNow > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#777777]">Payment Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['Cash', 'UPI', 'Card', 'Net Banking'].map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 px-1 text-[11px] font-bold rounded-xl border transition-smooth truncate cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-[#202020] text-white border-[#202020] dark:bg-white dark:text-[#202020]'
                      : 'bg-[#F5F5F5] dark:bg-[#252525] border-[#E3E3E3] dark:border-[#333333] text-[#777777]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calculation Result Preview */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
          isFullyPaid 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
        }`}>
          <div>
            <span className="font-bold block">New Balance: ₹{newBalance}</span>
            <span className="text-[10px] opacity-80">
              Total Settled: ₹{newTotalPaid} of ₹{total}
            </span>
          </div>

          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
            isFullyPaid
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 text-white'
          }`}>
            {isFullyPaid ? 'PAID' : 'PARTIAL'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E3E3E3] dark:border-[#333333]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#777777] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer transition-smooth flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Updating...' : 'Confirm & Mark Delivered'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
