import React, { useState } from 'react';
import { X, Printer, Scissors, Check, Copy } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const PrintInvoiceModal = ({ invoice, onClose }) => {
  const { settings, showToast } = useShop();
  const [printFormat, setPrintFormat] = useState('thermal'); // thermal or a4

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
    showToast("Print Job Sent", "Sending receipt to thermal printer...", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Print Receipt</h3>
              <p className="text-xs text-[#777777] dark:text-[#9E9E9E]">Invoice {invoice.id}</p>
            </div>
          </div>

          {/* Format selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333]">
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-smooth ${
                printFormat === 'thermal'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                  : 'text-[#777777] hover:text-[#202020]'
              }`}
            >
              Thermal 3-inch
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-smooth ${
                printFormat === 'a4'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                  : 'text-[#777777] hover:text-[#202020]'
              }`}
            >
              Standard A4
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#F5F5F5] dark:bg-[#141414] flex justify-center">
          <div 
            id="printable-invoice"
            className={`bg-white text-black p-6 font-mono border border-dashed border-gray-300 shadow-md transition-all ${
              printFormat === 'thermal' ? 'w-[320px] text-xs' : 'w-full max-w-lg text-sm'
            }`}
          >
            {/* Shop Details */}
            <div className="text-center pb-4 border-b border-dashed border-gray-400">
              <div className="flex items-center justify-center gap-1.5 font-bold text-base mb-1">
                <Scissors className="w-4 h-4 text-emerald-600 inline" />
                <span>{settings.shopName.toUpperCase()}</span>
              </div>
              <p className="text-[10px] leading-tight text-gray-600">{settings.address}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Ph: {settings.phone}</p>
              {settings.gstNumber && <p className="text-[10px] text-gray-600">GST: {settings.gstNumber}</p>}
            </div>

            {/* Invoice Info */}
            <div className="py-3 border-b border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>INVOICE NO:</span>
                <span className="font-bold">{invoice.id}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{invoice.date}</span>
              </div>
              <div className="flex justify-between">
                <span>DUE DATE:</span>
                <span className="font-bold">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dotted border-gray-300">
                <span>CUSTOMER:</span>
                <span className="font-bold">{invoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>PHONE:</span>
                <span>{invoice.phone}</span>
              </div>
            </div>

            {/* Particulars Table */}
            <div className="py-3 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold pb-1 border-b border-gray-300">
                <span>ITEM / SERVICE</span>
                <span>QTY x RATE</span>
                <span>AMT</span>
              </div>
              {invoice.services.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-dotted border-gray-200">
                  <div className="pr-2">
                    <span>{item.name}</span>
                  </div>
                  <span>{item.qty} x ₹{item.rate}</span>
                  <span className="font-bold">₹{item.amount}</span>
                </div>
              ))}
            </div>

            {/* Payment Calculations */}
            <div className="py-3 space-y-1.5">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>₹{invoice.subtotal}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>DISCOUNT:</span>
                  <span>-₹{invoice.discount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-400">
                <span>TOTAL AMOUNT:</span>
                <span>₹{invoice.total}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>ADVANCE PAID ({invoice.paymentMode}):</span>
                <span>₹{invoice.advancePaid}</span>
              </div>
              <div className="flex justify-between font-bold text-red-700 text-sm">
                <span>BALANCE DUE:</span>
                <span>₹{invoice.balance}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-dashed border-gray-400 text-[10px] text-gray-600 space-y-1">
              <p>Thank you for choosing {settings.shopName}!</p>
              <p>Please present this slip at the time of delivery.</p>
              <div className="pt-2 text-[9px] text-gray-400">*** Powered by TailorPOS ***</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-sm text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828]"
          >
            Cancel
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-sm hover:opacity-90 transition-smooth shadow-md"
          >
            <Printer className="w-4 h-4" />
            Print Invoice Now
          </button>
        </div>

      </div>
    </div>
  );
};
