import React, { useState } from 'react';
import { 
  Search, 
  UserPlus, 
  Plus, 
  Trash2, 
  Printer, 
  Send, 
  CheckCircle2, 
  Ruler, 
  Phone, 
  MapPin, 
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Scissors
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CustomerModal } from '../modals/CustomerModal';
import { PrintInvoiceModal } from '../modals/PrintInvoiceModal';
import { WhatsAppModal } from '../modals/WhatsAppModal';
import confetti from 'canvas-confetti';

export const NewInvoiceView = () => {
  const { customers, services, settings, addInvoice } = useShop();

  // Customer search & selection state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [showNewCustModal, setShowNewCustModal] = useState(false);

  // Line items state
  const [lineItems, setLineItems] = useState([
    { id: 1, name: 'Shirt Stitching', qty: 2, rate: 400, amount: 800 },
    { id: 2, name: 'Pant Stitching', qty: 1, rate: 350, amount: 350 },
    { id: 3, name: 'Cutting Service', qty: 3, rate: 150, amount: 450 }
  ]);

  // Payment calculation state
  const [discount, setDiscount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(500);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [dueDate, setDueDate] = useState('2026-09-08');
  const [notes, setNotes] = useState('Slim fit pattern with stiff collar.');

  // Modal triggers for print & whatsapp preview before/after save
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Auto-search matching customers
  const matchingCustomers = phoneSearch.trim()
    ? customers.filter(c => c.phone.includes(phoneSearch) || c.name.toLowerCase().includes(phoneSearch.toLowerCase()))
    : [];

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setCustName(cust.name);
    setCustPhone(cust.phone);
    setCustAddress(cust.address);
    setPhoneSearch(cust.phone);
  };

  const handleAddLineItem = () => {
    const newItem = {
      id: Date.now(),
      name: services[0].name,
      qty: 1,
      rate: services[0].defaultRate,
      amount: services[0].defaultRate
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleItemChange = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      let updated = { ...item, [field]: value };

      if (field === 'name') {
        const foundSvc = services.find(s => s.name === value);
        if (foundSvc) {
          updated.rate = foundSvc.defaultRate;
          updated.amount = updated.qty * foundSvc.defaultRate;
        }
      } else if (field === 'qty' || field === 'rate') {
        const q = field === 'qty' ? parseFloat(value) || 0 : item.qty;
        const r = field === 'rate' ? parseFloat(value) || 0 : item.rate;
        updated.amount = q * r;
      }

      return updated;
    }));
  };

  const handleRemoveItem = (id) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter(i => i.id !== id));
  };

  // Live calculations
  const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);
  const advanceVal = parseFloat(advancePaid) || 0;
  const balance = Math.max(0, total - advanceVal);

  const currentInvoiceId = `${settings.invoicePrefix}${settings.nextInvoiceNumber}`;

  const handleSaveInvoice = () => {
    if (!custName || !custPhone) {
      alert("Please enter customer name and phone number.");
      return;
    }

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // fallback if canvas confetti disabled
    }

    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dueStr = new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    addInvoice({
      customerName: custName,
      phone: custPhone,
      address: custAddress,
      date: todayStr,
      dueDate: dueStr,
      services: lineItems,
      subtotal,
      discount: discountVal,
      total,
      advancePaid: advanceVal,
      balance,
      paymentMode,
      notes,
      measurements: selectedCustomer ? selectedCustomer.measurements : undefined
    });
  };

  const currentInvoiceObj = {
    id: currentInvoiceId,
    customerName: custName || 'Kumar',
    phone: custPhone || '9876543210',
    date: 'Today',
    dueDate: dueDate,
    services: lineItems,
    subtotal,
    discount: discountVal,
    total,
    advancePaid: advanceVal,
    balance,
    paymentMode,
    notes
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
              New Invoice
            </h2>
            <span className="px-3 py-1 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] font-bold text-sm">
              #{currentInvoiceId}
            </span>
          </div>
          <p className="text-xs text-[#777777] mt-1">
            Create order receipt, attach customer measurements & process initial payment.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth"
          >
            <Printer className="w-4 h-4 text-[#777777]" />
            Print Receipt
          </button>
          
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs transition-smooth"
          >
            <Send className="w-4 h-4" />
            Send WhatsApp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Customer Lookup & Particulars Builder */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CUSTOMER SECTION */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Customer Information</h3>
              <button
                type="button"
                onClick={() => setShowNewCustModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEEEEE] dark:bg-[#282828] text-xs font-bold text-[#202020] dark:text-white hover:bg-[#E3E3E3] transition-smooth"
              >
                <UserPlus className="w-3.5 h-3.5" /> + New Customer
              </button>
            </div>

            {/* Phone search input */}
            <div className="relative">
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
                Search Customer by Phone or Name
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#777777] absolute left-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Enter phone 9876543210 or Kumar"
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                />
              </div>

              {/* Instant Dropdown Suggestions */}
              {matchingCustomers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl border border-[#E3E3E3] dark:border-[#333333] p-2 z-30">
                  <span className="text-[10px] font-semibold text-[#777777] px-3 py-1 block">Matching Records</span>
                  {matchingCustomers.map(cust => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth"
                    >
                      <div>
                        <span className="font-bold text-xs text-[#202020] dark:text-white block">{cust.name}</span>
                        <span className="text-[11px] text-[#777777]">{cust.phone} • {cust.address}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected / Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#777777] mb-1">Customer Name *</label>
                <input
                  type="text"
                  placeholder="Kumar"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#777777] mb-1">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white font-medium"
                />
              </div>
            </div>

            {selectedCustomer && (
              <div className="p-3.5 rounded-2xl bg-[#EEEEEE]/60 dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#202020] text-white flex items-center justify-center text-xs font-bold">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#202020] dark:text-white block">
                      Saved Customer Profile Loaded
                    </span>
                    <span className="text-[11px] text-[#777777]">
                      {selectedCustomer.totalOrders} previous orders • ₹{selectedCustomer.outstanding} balance
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white dark:bg-[#1E1E1E] text-xs font-semibold text-[#202020] dark:text-white shadow-xs">
                  <Ruler className="w-3.5 h-3.5 text-emerald-600" /> Measurements Attached
                </span>
              </div>
            )}
          </div>

          {/* ORDER PARTICULARS & SERVICES BUILDER */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#202020] dark:text-white">Particulars / Services</h3>
                <p className="text-xs text-[#777777]">Add items, quantity and rate for this invoice</p>
              </div>
              
              <button
                type="button"
                onClick={handleAddLineItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] text-xs font-bold hover:opacity-90 transition-smooth shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Service Line
              </button>
            </div>

            {/* Line items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-2 w-[40%]">Service Item</th>
                    <th className="py-2.5 px-2 w-[15%]">Qty</th>
                    <th className="py-2.5 px-2 w-[20%]">Rate (₹)</th>
                    <th className="py-2.5 px-2 w-[20%]">Amount (₹)</th>
                    <th className="py-2.5 px-2 text-right w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-2">
                        <select
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          className="w-full p-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#202020] dark:text-white focus:outline-none"
                        >
                          {services.map(svc => (
                            <option key={svc.id} value={svc.name}>{svc.name}</option>
                          ))}
                          <option value="Custom Service">Custom Service / Fitting</option>
                        </select>
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                          className="w-full p-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-center text-[#202020] dark:text-white"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                          className="w-full p-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
                        />
                      </td>

                      <td className="py-3 px-2 font-bold text-sm text-[#202020] dark:text-white">
                        ₹{item.amount}
                      </td>

                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-[#777777] hover:text-[#B85C5C] transition-smooth"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes Textarea */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
                Stitching Instructions / Notes
              </label>
              <textarea
                rows="2"
                placeholder="Specify special requirements, lining material, collar style, sleeve width..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
              />
            </div>

          </div>

        </div>

        {/* Right Column (1 Col): Payment & Calculations Sidebar */}
        <div className="space-y-6">
          
          <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-lg space-y-6 sticky top-24">
            
            <h3 className="font-bold text-base text-[#202020] dark:text-white pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
              Billing & Payment Summary
            </h3>

            {/* Subtotal, Discount & Total */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-[#777777] font-medium">
                <span>Subtotal ({lineItems.length} items)</span>
                <span className="font-bold text-[#202020] dark:text-white">₹{subtotal}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#777777] font-medium">Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-24 px-3 py-1 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-right font-bold text-xs text-[#202020] dark:text-white"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#E3E3E3] dark:border-[#333333]">
                <span className="font-bold text-base text-[#202020] dark:text-white">Total Invoice Amount</span>
                <span className="font-bold text-2xl text-[#202020] dark:text-white">₹{total}</span>
              </div>
            </div>

            {/* Advance Paid & Balance Due */}
            <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#282828] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Advance Received (₹)</span>
                <input
                  type="number"
                  min="0"
                  max={total}
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="w-28 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E1E1E] border border-emerald-500/30 text-right font-bold text-sm text-emerald-700 dark:text-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#E3E3E3] dark:border-[#333333]">
                <span className="font-bold text-xs uppercase tracking-wider text-[#B85C5C]">Balance Due</span>
                <span className="font-bold text-xl text-[#B85C5C]">₹{balance}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI', icon: QrCode },
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
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-smooth ${
                        selected
                          ? 'bg-[#202020] text-white border-[#202020] dark:bg-white dark:text-[#202020]'
                          : 'border-[#E3E3E3] dark:border-[#333333] text-[#777777] hover:bg-[#F5F5F5] dark:hover:bg-[#282828]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Due Date Picker */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider">
                Target Delivery / Due Date
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-[#777777] absolute left-3.5" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
                />
              </div>
            </div>

            {/* Primary Save Button */}
            <button
              type="button"
              onClick={handleSaveInvoice}
              className="w-full py-4 rounded-2xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-base hover:opacity-90 shadow-xl transition-smooth flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
              Save Invoice #{currentInvoiceId}
            </button>

          </div>

        </div>

      </div>

      {/* MODALS */}
      {showNewCustModal && (
        <CustomerModal
          initialPhone={phoneSearch}
          onClose={() => setShowNewCustModal(false)}
          onCustomerCreated={(cust) => handleSelectCustomer(cust)}
        />
      )}

      {showPrintModal && (
        <PrintInvoiceModal
          invoice={currentInvoiceObj}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {showWhatsAppModal && (
        <WhatsAppModal
          invoice={currentInvoiceObj}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

    </div>
  );
};
