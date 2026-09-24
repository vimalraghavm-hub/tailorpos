import React, { useState } from 'react';
import { X, Printer, Scissors, Receipt } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';

export const PrintInvoiceModal = ({ invoice, onClose }) => {
  const { settings, showToast } = useShop();
  const [printFormat, setPrintFormat] = useState('thermal'); // thermal | a4 | payment_slip

  useModalDismiss(onClose, Boolean(invoice));

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
    showToast("Print Job Sent", "Sending document to printer...", "success");
  };

  // Helper to extract non-empty, non-zero measurements for this invoice
  const getRelevantMeasurements = (measurementsObj) => {
    if (!measurementsObj || typeof measurementsObj !== 'object') return {};
    const result = {};

    Object.entries(measurementsObj).forEach(([garment, fields]) => {
      if (!fields || typeof fields !== 'object') return;
      const validFields = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '0' && String(v).trim() !== '-') {
          validFields[k] = v;
        }
      });
      if (Object.keys(validFields).length > 0) {
        result[garment] = validFields;
      }
    });

    return result;
  };

  const relevantMeasurements = getRelevantMeasurements(invoice.measurements);

  return (
    <Modal
      isOpen={Boolean(invoice)}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      zIndex={9990}
    >
        
        {/* Header (hidden in print) */}
        <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Print Receipt / Invoice</h3>
              <p className="text-xs text-[#777777] dark:text-[#9E9E9E]">Invoice {invoice.id}</p>
            </div>
          </div>

          {/* Format selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333]">
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-smooth cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                  : 'text-[#777777] hover:text-[#202020]'
              }`}
            >
              Thermal 3"
            </button>
            <button
              onClick={() => setPrintFormat('payment_slip')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-smooth cursor-pointer ${
                printFormat === 'payment_slip'
                  ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                  : 'text-[#777777] hover:text-[#202020]'
              }`}
            >
              Payment Slip
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-smooth cursor-pointer ${
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
            className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#F5F5F5] dark:bg-[#141414] flex justify-center">
          <div 
            id="printable-invoice"
            className={`bg-white text-black p-6 font-mono border border-dashed border-gray-300 shadow-md transition-all ${
              printFormat === 'thermal' ? 'w-[320px] text-xs' : (printFormat === 'payment_slip' ? 'w-[360px] text-xs' : 'w-full max-w-lg text-sm')
            }`}
          >
            {/* Payment Slip Specific View */}
            {printFormat === 'payment_slip' ? (
              <div className="space-y-3">
                <div className="text-center pb-3 border-b border-dashed border-gray-400">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-base mb-1">
                    <Receipt className="w-4 h-4 text-emerald-600 inline" />
                    <span>PAYMENT ACKNOWLEDGEMENT</span>
                  </div>
                  <p className="text-xs font-bold text-gray-800">{settings.shopName.toUpperCase()}</p>
                  <p className="text-[10px] text-gray-600">{settings.address} | Ph: {settings.phone}</p>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>RECEIPT FOR ORDER:</span>
                    <span className="font-bold">{invoice.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{new Date().toISOString().split('T')[0]}</span>
                  </div>
                  <div className="flex justify-between border-t border-dotted border-gray-300 pt-1">
                    <span>CUSTOMER:</span>
                    <span className="font-bold">{invoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PHONE:</span>
                    <span>{invoice.phone}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-300 rounded space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>TOTAL ORDER VALUE:</span>
                    <span>₹{invoice.total}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>AMOUNT RECEIVED ({invoice.paymentMode || 'Cash'}):</span>
                    <span>₹{invoice.advancePaid}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-300 pt-1 text-red-700">
                    <span>BALANCE REMAINING:</span>
                    <span>₹{invoice.balance}</span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[10px] text-gray-600">
                  <p>Expected Delivery Date: <strong>{invoice.dueDate}</strong></p>
                  <p className="pt-1">Thank you for your payment!</p>
                </div>
              </div>
            ) : (
              /* Thermal / A4 Standard Receipt View */
              <>
                {/* Shop Details */}
                <div className="text-center pb-3 border-b border-dashed border-gray-400">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-base mb-1">
                    <Scissors className="w-4 h-4 text-emerald-600 inline" />
                    <span>{settings.shopName.toUpperCase()}</span>
                  </div>
                  <p className="text-[10px] leading-tight text-gray-600">{settings.address}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Ph: {settings.phone}</p>
                  {settings.gstNumber && <p className="text-[10px] text-gray-600">GST: {settings.gstNumber}</p>}
                </div>

                {/* Invoice Info */}
                <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>INVOICE NO:</span>
                    <span className="font-bold">{invoice.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ORDER DATE:</span>
                    <span>{invoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DELIVERY DATE:</span>
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
                  {invoice.address && (
                    <div className="flex justify-between">
                      <span>ADDRESS:</span>
                      <span className="text-[10px] text-right truncate max-w-[180px]">{invoice.address}</span>
                    </div>
                  )}
                </div>

                {/* Particulars Services Table */}
                <div className="py-2.5 border-b border-dashed border-gray-400 text-[11px]">
                  <div className="flex justify-between font-bold pb-1 border-b border-gray-300 uppercase text-[10px]">
                    <span className="w-1/2">SERVICE</span>
                    <span className="w-1/4 text-center">QTY x RATE</span>
                    <span className="w-1/4 text-right">AMOUNT</span>
                  </div>
                  {(invoice.services || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-dotted border-gray-200">
                      <span className="w-1/2 font-semibold truncate pr-1">{item.name}</span>
                      <span className="w-1/4 text-center">{item.qty} x ₹{item.rate}</span>
                      <span className="w-1/4 text-right font-bold">₹{item.amount}</span>
                    </div>
                  ))}
                </div>

                {/* Relevant Order Measurements ONLY */}
                {Object.keys(relevantMeasurements).length > 0 && (
                  <div className="py-2.5 border-b border-dashed border-gray-400 text-[10px] space-y-1">
                    <span className="font-bold block uppercase border-b border-gray-300 pb-0.5">Order Measurements:</span>
                    {Object.entries(relevantMeasurements).map(([garment, fields]) => (
                      <div key={garment} className="pt-0.5">
                        <span className="font-bold capitalize text-gray-700 block">
                          {garment} {fields.suppliedGarment ? '(Sample Garment Provided)' : ''}:
                        </span>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-2 text-[10px] text-gray-900">
                          {Object.entries(fields).map(([k, v]) => {
                            if (k === 'suppliedGarment') return null;
                            return (
                              <span key={k}>
                                <strong className="capitalize font-normal text-gray-600">{k}:</strong> {v}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes if applicable */}
                {invoice.notes && (
                  <div className="py-2 border-b border-dashed border-gray-400 text-[10px]">
                    <span className="font-bold block text-gray-700">NOTES / INSTRUCTIONS:</span>
                    <p className="text-gray-800">{invoice.notes}</p>
                  </div>
                )}

                {/* Payment Calculations */}
                <div className="py-2.5 space-y-1 text-[11px]">
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
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-400">
                    <span>TOTAL AMOUNT:</span>
                    <span>₹{invoice.total}</span>
                  </div>
                  <div className="flex justify-between text-gray-800">
                    <span>PAID ({invoice.paymentMode || 'Cash'}):</span>
                    <span>₹{invoice.advancePaid}</span>
                  </div>
                  {invoice.extraPaid > 0 ? (
                    <div className="flex justify-between font-bold text-xs text-emerald-700 pt-0.5">
                      <span>EXTRA PAID / CREDIT:</span>
                      <span>₹{invoice.extraPaid}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-bold text-xs pt-0.5">
                      <span>BALANCE DUE:</span>
                      <span className={invoice.balance > 0 ? "text-red-700 font-bold" : "text-emerald-700"}>
                        ₹{invoice.balance}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] pt-1">
                    <span>PAYMENT STATUS:</span>
                    <span className="font-bold uppercase">
                      {invoice.paymentStatus || (invoice.extraPaid > 0 ? 'OVERPAID / CREDIT' : (invoice.balance === 0 ? 'PAID' : (invoice.advancePaid > 0 ? 'PARTIALLY PAID' : 'UNPAID')))}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[9px] text-gray-600 space-y-0.5">
                  <p>Thank you for choosing {settings.shopName}!</p>
                  <p>Please present this receipt at the time of delivery.</p>
                  <div className="pt-1.5 text-[8px] text-gray-400">*** Mohit Tailoring POS ***</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions (hidden in print) */}
        <div className="p-4 border-t border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-sm text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-sm hover:opacity-90 transition-smooth shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Document
          </button>
        </div>

    </Modal>
  );
};
