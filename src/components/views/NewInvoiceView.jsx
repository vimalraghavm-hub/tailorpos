import React, { useState, useEffect } from 'react';
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
  History,
  ChevronRight,
  Info,
  Check,
  User,
  ArrowLeft,
  FileText,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CustomerModal } from '../modals/CustomerModal';
import { PrintInvoiceModal } from '../modals/PrintInvoiceModal';
import { WhatsAppModal } from '../modals/WhatsAppModal';
import { generateUniqueId } from '../../utils/idGenerator';
import { 
  GARMENT_MEASUREMENT_TYPES, 
  GARMENT_MEASUREMENT_FIELDS, 
  getDefaultMeasurements 
} from '../../data/measurementDefinitions';
import confetti from 'canvas-confetti';

export const NewInvoiceView = () => {
  const { 
    customers, 
    invoices, 
    services, 
    settings, 
    saveInvoice, 
    selectedCustomerId, 
    setSelectedCustomerId,
    openCustomerProfile,
    editingOrder,
    clearEditingOrder
  } = useShop();

  // 1. Customer Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isOrderStarted, setIsOrderStarted] = useState(false);
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [prevOrderContext, setPrevOrderContext] = useState(null);

  // 2. Order Creation Workspace State
  const [activeGarmentTab, setActiveGarmentTab] = useState('gown');
  const [orderMeasurements, setOrderMeasurements] = useState(getDefaultMeasurements());

  // Services line items - Zero preloaded services by default
  const [lineItems, setLineItems] = useState([]);

  // Payment, Discount, Dates & Order Notes
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('amount'); // 'amount' | 'percentage'
  const [advancePaid, setAdvancePaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [orderNotes, setOrderNotes] = useState('');

  // Post-Finalization Modals & Finalized Invoice
  const [finalizedInvoice, setFinalizedInvoice] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Load editingOrder if present
  useEffect(() => {
    if (editingOrder) {
      const cust = customers.find(c => c.id === editingOrder.customerId || c.phone === editingOrder.phone) || {
        id: editingOrder.customerId || 'CUST-EDIT',
        name: editingOrder.customerName,
        phone: editingOrder.phone,
        address: editingOrder.address || 'Local Customer'
      };
      setSelectedCustomer(cust);
      setIsOrderStarted(true);
      setLineItems(editingOrder.services ? JSON.parse(JSON.stringify(editingOrder.services)) : []);
      setDiscount(editingOrder.discount || 0);
      setDiscountType(editingOrder.discountType || 'amount');
      setAdvancePaid(editingOrder.advancePaid || 0);
      setPaymentMode(editingOrder.paymentMode || 'Cash');
      setOrderNotes(editingOrder.notes || '');
      setOrderMeasurements(editingOrder.measurements ? JSON.parse(JSON.stringify(editingOrder.measurements)) : getDefaultMeasurements());
    }
  }, [editingOrder, customers]);

  // Auto-search matching customers by phone or name
  const matchingCustomers = searchQuery.trim()
    ? customers.filter(c => 
        (c.phone && c.phone.includes(searchQuery.trim())) || 
        (c.name && c.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      )
    : [];

  // Auto-select customer if navigated from external views (e.g. Customer Profile modal)
  useEffect(() => {
    if (selectedCustomerId && !editingOrder) {
      const match = customers.find(c => c.id === selectedCustomerId);
      if (match) {
        handleSelectCustomer(match);
      }
    }
  }, [selectedCustomerId, editingOrder]);

  // Handle Customer Selection
  const handleSelectCustomer = (cust) => {
    if (!cust) return;
    setSelectedCustomer(cust);
    setIsOrderStarted(false);
    setSearchQuery('');
    setFinalizedInvoice(null);
  };

  // Reset Customer Selection
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setIsOrderStarted(false);
    setSearchQuery('');
    setPrevOrderContext(null);
    setFinalizedInvoice(null);
    if (clearEditingOrder) clearEditingOrder();
    if (setSelectedCustomerId) setSelectedCustomerId(null);
  };

  // Click "+ New Order": Preloads Previous Measurements as Snapshot & Opens Workspace
  const handleStartNewOrder = () => {
    if (!selectedCustomer) return;

    // Find customer's IMMEDIATELY PREVIOUS ORDER
    const customerInvoices = invoices.filter(inv => 
      (inv.customerId && inv.customerId === selectedCustomer.id) || 
      (inv.phone && selectedCustomer.phone && inv.phone.trim() === selectedCustomer.phone.trim())
    );

    const prevOrder = customerInvoices.length > 0 ? customerInvoices[0] : null;

    if (prevOrder && prevOrder.measurements) {
      // Deep copy snapshot
      setOrderMeasurements(JSON.parse(JSON.stringify(prevOrder.measurements)));
      setPrevOrderContext({
        id: prevOrder.id,
        date: prevOrder.date,
        total: prevOrder.total,
        measurements: prevOrder.measurements
      });
    } else if (selectedCustomer.measurements) {
      // Deep copy from profile measurements
      setOrderMeasurements(JSON.parse(JSON.stringify(selectedCustomer.measurements)));
      setPrevOrderContext(null);
    } else {
      setOrderMeasurements(getDefaultMeasurements());
      setPrevOrderContext(null);
    }

    setOrderNotes('');
    setIsOrderStarted(true);
  };

  // Handle Measurement Field Change for Current Order Snapshot Only
  const handleMeasurementChange = (garment, field, value) => {
    setOrderMeasurements(prev => ({
      ...prev,
      [garment]: {
        ...(prev[garment] || {}),
        [field]: value
      }
    }));
  };

  // Line Item Handlers
  const handleAddLineItem = () => {
    const newItem = {
      id: generateUniqueId('item'),
      name: services[0] ? services[0].name : 'Custom Stitching',
      qty: 1,
      rate: services[0] ? services[0].defaultRate : 1000,
      amount: services[0] ? services[0].defaultRate : 1000
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
    setLineItems(lineItems.filter(i => i.id !== id));
  };

  // Billing & Discount Calculations
  const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const rawDiscount = parseFloat(discount) || 0;
  const discountVal = discountType === 'percentage' 
    ? Math.round((subtotal * rawDiscount) / 100) 
    : rawDiscount;

  const total = Math.max(0, subtotal - discountVal);
  const advanceVal = parseFloat(advancePaid) || 0;
  const balance = Math.max(0, total - advanceVal);
  const extraPaid = Math.max(0, advanceVal - total);

  const currentInvoiceId = editingOrder ? editingOrder.id : `${settings.invoicePrefix}${settings.nextInvoiceNumber}`;

  // Save / Finalize Order & Invoice
  const handleSaveInvoice = () => {
    if (!selectedCustomer) {
      alert("Please select a customer first.");
      return;
    }
    if (lineItems.length === 0) {
      alert("Please add at least one service item.");
      return;
    }

    try {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}

    const orderDateStr = orderDate ? new Date(orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dueStr = dueDate ? new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    const newInvoiceData = {
      id: currentInvoiceId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address || 'Local Customer',
      material: "Customer Provided Material",
      garmentType: lineItems[0] ? lineItems[0].name : "Custom Tailoring",
      date: orderDateStr,
      dueDate: dueStr,
      services: lineItems,
      subtotal,
      discount: discountVal,
      discountType,
      rawDiscount,
      total,
      advancePaid: advanceVal,
      balance,
      extraPaid,
      paymentMode,
      notes: orderNotes,
      measurements: orderMeasurements
    };

    saveInvoice(newInvoiceData);
    setFinalizedInvoice(newInvoiceData);
    if (clearEditingOrder) clearEditingOrder();
  };

  const activeFields = GARMENT_MEASUREMENT_FIELDS[activeGarmentTab] || [];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* 1. Page Header */}
      <div className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#202020] dark:text-white tracking-tight">
            New Order / Invoice
          </h2>
          <p className="text-xs text-[#777777] mt-0.5">
            Select or add a customer to start creating a new tailoring order.
          </p>
        </div>

        {isOrderStarted && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#777777] font-medium hidden sm:inline">Next Invoice #:</span>
            <span className="px-3 py-1.5 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] font-bold text-xs tracking-wide">
              #{currentInvoiceId}
            </span>
          </div>
        )}
      </div>

      {/* FINALIZED ORDER SUMMARY BANNER (Shown after saving order) */}
      {finalizedInvoice && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-300">
                Invoice #{finalizedInvoice.id} Generated Successfully!
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-400">
                Order for {finalizedInvoice.customerName} ({finalizedInvoice.phone}) has been saved and sent to Registers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs shadow-md hover:opacity-90 transition-smooth cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </button>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-[#202020] dark:text-white font-bold text-xs shadow-xs hover:bg-[#F5F5F5] transition-smooth cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600" /> Create / Print Receipt
            </button>

            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-smooth cursor-pointer"
            >
              <Send className="w-4 h-4" /> Send Bill via WhatsApp
            </button>

            <button
              type="button"
              onClick={handleClearCustomer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white cursor-pointer ml-auto"
            >
              + Create Another Order
            </button>
          </div>
        </div>
      )}

      {/* STATE 1: INITIAL UNSELECTED CUSTOMER SCREEN */}
      {!selectedCustomer && (
        <div className="p-8 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-[#202020] dark:text-white">
              SEARCH EXISTING CUSTOMER
            </h3>
            <p className="text-xs text-[#777777]">
              Enter customer phone number or name to select profile, or add a new customer.
            </p>
          </div>

          <div className="space-y-4">
            {/* Search Input Box */}
            <div className="relative">
              <Search className="w-5 h-5 text-[#777777] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customer by phone number or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                autoFocus
              />

              {/* Live Search Matching Dropdown */}
              {matchingCustomers.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl border border-[#E3E3E3] dark:border-[#333333] p-2 z-30 max-h-64 overflow-y-auto">
                  <span className="text-[10px] font-semibold text-[#777777] px-3 py-1.5 block uppercase tracking-wider">Matching Existing Profiles</span>
                  {matchingCustomers.map(cust => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth"
                    >
                      <div>
                        <span className="font-bold text-sm text-[#202020] dark:text-white block">{cust.name}</span>
                        <span className="text-xs text-[#777777] font-mono">{cust.phone} • {cust.address || 'Local Customer'}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        Select Customer <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-[#777777] uppercase font-bold tracking-wider">OR</span>
            </div>

            {/* Add New Customer Action Button */}
            <button
              type="button"
              onClick={() => setShowNewCustModal(true)}
              className="w-full py-3.5 rounded-2xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] font-bold text-sm hover:opacity-90 transition-smooth shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> + Add New Customer
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: CUSTOMER SELECTED - COMPACT PROFILE SUMMARY SCREEN */}
      {selectedCustomer && !isOrderStarted && (
        <div className="p-8 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-6 max-w-2xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#E3E3E3] dark:border-[#333333] pb-4">
            <span className="text-xs font-bold text-[#777777] uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" /> Selected Customer Profile
            </span>
            <button
              type="button"
              onClick={handleClearCustomer}
              className="text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white cursor-pointer"
            >
              Search Different Customer
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#202020] text-white flex items-center justify-center text-base font-bold shrink-0">
                {selectedCustomer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#202020] dark:text-white leading-tight">
                  {selectedCustomer.name}
                </h3>
                <p className="text-xs text-[#777777] font-mono mt-1">
                  {selectedCustomer.phone}
                </p>
                <p className="text-xs text-[#777777] mt-0.5">
                  {selectedCustomer.address || 'Local Customer'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => openCustomerProfile(selectedCustomer.id)}
                className="px-4 py-2 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white hover:bg-white dark:hover:bg-[#1E1E1E] flex items-center gap-1 cursor-pointer transition-smooth"
              >
                View Profile <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Primary Action to Begin Order */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartNewOrder}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-smooth flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" /> + New Order
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: ORDER WORKSPACE (Displayed after clicking + New Order) */}
      {selectedCustomer && isOrderStarted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* LEFT COLUMN: Customer Summary Header, Measurements, Services, Order Notes */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. CUSTOMER SUMMARY CARD (At Top of Workspace) */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#202020] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#202020] dark:text-white leading-tight">
                    {selectedCustomer.name}
                  </h4>
                  <p className="text-xs text-[#777777] font-mono mt-0.5">
                    {selectedCustomer.phone} • {selectedCustomer.address || 'Local Customer'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderStarted(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  title="Go back to customer selection without losing entered data"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={() => openCustomerProfile(selectedCustomer.id)}
                  className="px-3 py-1.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#282828] flex items-center gap-1 cursor-pointer"
                >
                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Previous Order Context Notification Tag */}
            {prevOrderContext ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs">
                <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[#202020] dark:text-white">
                  <strong className="font-bold text-amber-800 dark:text-amber-300">Previous Order: #{prevOrderContext.id}</strong> ({prevOrderContext.date} • ₹{prevOrderContext.total}) — Measurements preloaded below as starting preset snapshot for this NEW order.
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Preloaded initial measurements. Editing measurements below only applies to this new order snapshot.</span>
              </div>
            )}

            {/* 1. SERVICES WORKSPACE */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E3E3E3] dark:border-[#333333] pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#777777]">
                  Tailoring Services & Items ({lineItems.length})
                </h3>
                
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] text-xs font-bold hover:opacity-90 transition-smooth shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> Add Service
                </button>
              </div>

              {/* Line items table or empty state */}
              {lineItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-2 w-[45%]">Service Name</th>
                        <th className="py-2.5 px-2 w-[15%]">Qty</th>
                        <th className="py-2.5 px-2 w-[20%]">Rate (₹)</th>
                        <th className="py-2.5 px-2 text-right w-[15%]">Amount</th>
                        <th className="py-2.5 px-2 w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-2">
                            <select
                              value={item.name}
                              onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                            >
                              {services.map(s => (
                                <option key={s.id} value={s.name}>{s.name} (₹{s.defaultRate})</option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-2">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white text-center focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-2">
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                            />
                          </td>

                          <td className="py-3 px-2 font-bold text-right text-[#202020] dark:text-white text-sm">
                            ₹{item.amount}
                          </td>

                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-[#777777] hover:text-[#B85C5C] transition-smooth cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-dashed border-[#E3E3E3] dark:border-[#333333]">
                  <p className="text-xs text-[#777777]">No services added yet to this order.</p>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> + Add Service Item
                  </button>
                </div>
              )}
            </div>

            {/* 2. MEASUREMENTS PRESET (Editable snapshot per order) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E3E3] dark:border-[#333333] pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#777777] flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-emerald-600" />
                  Order Measurements Preset (Editable Snapshot)
                </h3>

                {/* Garment Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] overflow-x-auto">
                  {GARMENT_MEASUREMENT_TYPES.map(tab => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveGarmentTab(tab.id)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-smooth whitespace-nowrap cursor-pointer ${
                        activeGarmentTab === tab.id
                          ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                          : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Measurement Inputs */}
              {activeGarmentTab === 'custom' ? (
                <div className="pt-1 animate-fade-in">
                  <textarea
                    rows="2"
                    placeholder="Record custom measurements or fitting remarks..."
                    value={(orderMeasurements.custom && orderMeasurements.custom.notes) || ''}
                    onChange={(e) => handleMeasurementChange('custom', 'notes', e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-3 pt-1 animate-fade-in">
                  {/* Supplied Garment Checkbox */}
                  <div className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 font-semibold text-[#202020] dark:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(orderMeasurements[activeGarmentTab]?.suppliedGarment)}
                        onChange={(e) => handleMeasurementChange(activeGarmentTab, 'suppliedGarment', e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Follow measurements from customer supplied garment / sample ({GARMENT_MEASUREMENT_TYPES.find(t => t.id === activeGarmentTab)?.label})</span>
                    </label>
                  </div>

                  {Boolean(orderMeasurements[activeGarmentTab]?.suppliedGarment) ? (
                    <div className="p-5 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2 animate-fade-in">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Follow customer measurements</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {activeFields.map(f => (
                        <div key={f.key} className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333]">
                          <span className="text-[10px] font-bold text-[#777777] uppercase block mb-1">{f.label}</span>
                          <input
                            type="text"
                            placeholder="--"
                            value={(orderMeasurements[activeGarmentTab] && orderMeasurements[activeGarmentTab][f.key]) || ''}
                            onChange={(e) => handleMeasurementChange(activeGarmentTab, f.key, e.target.value)}
                            className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] text-xs font-bold text-[#202020] dark:text-white border border-[#E3E3E3] dark:border-[#333333] focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. ORDER NOTES (Specific to THIS order) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#777777]">
                Order Instructions & Fitting Remarks (Specific to this order)
              </h3>
              <textarea
                rows="2"
                placeholder="e.g. Use soft lining, extra side margin, deep back neck..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
              />
            </div>

          </div>

          {/* RIGHT COLUMN: Delivery Date, Financial Billing & Payment Breakdown */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-5 sticky top-24">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#777777] border-b border-[#E3E3E3] dark:border-[#333333] pb-3">
                Billing & Payment Summary
              </h3>

              {/* Order Date & Delivery Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#777777]">Order Date</label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-[#777777] absolute left-3.5" />
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#777777]">Delivery Date *</label>
                  <div className="relative flex items-center">
                    <Calendar className="w-4 h-4 text-[#777777] absolute left-3.5" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Calculation Box */}
              <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] space-y-2.5 text-xs">
                <div className="flex justify-between text-[#777777]">
                  <span>Subtotal ({lineItems.length} items)</span>
                  <span className="font-semibold text-[#202020] dark:text-white">₹{subtotal}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-[#777777]">Discount</span>
                    <div className="flex items-center rounded-lg bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] p-0.5">
                      <button
                        type="button"
                        onClick={() => setDiscountType('amount')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${discountType === 'amount' ? 'bg-[#202020] text-white dark:bg-white dark:text-[#202020]' : 'text-[#777777]'}`}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${discountType === 'percentage' ? 'bg-[#202020] text-white dark:bg-white dark:text-[#202020]' : 'text-[#777777]'}`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {discountType === 'percentage' && (
                      <span className="text-[10px] text-emerald-600 font-bold">(-₹{discountVal})</span>
                    )}
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-right font-bold text-xs text-[#202020] dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between font-bold text-sm pt-2 border-t border-[#E3E3E3] dark:border-[#333333] text-[#202020] dark:text-white">
                  <span>Total Amount</span>
                  <span>₹{total}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#777777] font-semibold">Advance Payment (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-right font-bold text-xs text-emerald-600 focus:outline-none"
                  />
                </div>

                {extraPaid > 0 ? (
                  <>
                    <div className="flex justify-between font-bold text-xs text-emerald-600 pt-2 border-t border-dashed border-[#E3E3E3] dark:border-[#333333]">
                      <span>Extra Paid / Store Credit</span>
                      <span>₹{extraPaid}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#777777] pt-0.5">
                      <span>Balance Due</span>
                      <span>₹0</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-bold text-xs text-[#B85C5C] pt-2 border-t border-dashed border-[#E3E3E3] dark:border-[#333333]">
                    <span>Balance Due on Delivery</span>
                    <span>₹{balance}</span>
                  </div>
                )}
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#777777]">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'UPI', 'Card'].map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 text-xs font-bold rounded-xl transition-smooth border cursor-pointer ${
                        paymentMode === mode
                          ? 'bg-[#202020] text-white border-[#202020] dark:bg-white dark:text-[#202020] shadow-xs'
                          : 'bg-[#F5F5F5] dark:bg-[#252525] border-[#E3E3E3] dark:border-[#333333] text-[#777777]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Finalize Button */}
              <button
                type="button"
                onClick={handleSaveInvoice}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-smooth cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Generate Invoice
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODALS */}
      {showNewCustModal && (
        <CustomerModal
          initialPhone={searchQuery}
          onClose={() => setShowNewCustModal(false)}
          onCustomerCreated={(cust) => handleSelectCustomer(cust)}
        />
      )}

      {showPrintModal && finalizedInvoice && (
        <PrintInvoiceModal
          invoice={finalizedInvoice}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {showWhatsAppModal && finalizedInvoice && (
        <WhatsAppModal
          invoice={finalizedInvoice}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

    </div>
  );
};
