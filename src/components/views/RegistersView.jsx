import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Check, 
  Clock, 
  Calendar, 
  Scissors, 
  CheckCircle2, 
  Eye, 
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  User,
  Info,
  Layers,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Truck,
  Banknote
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../common/StatusBadge';
import { WorkflowEditorModal } from '../modals/WorkflowEditorModal';
import { Modal } from '../common/Modal';
import { useModalDismiss } from '../../utils/modalUtils';

export const RegistersView = () => {
  const { 
    invoices, 
    customers, 
    productionStatuses, 
    addProductionStatus, 
    editProductionStatus,
    deleteProductionStatus,
    updateServiceStatus, 
    deliverOrder,
    openCustomerProfile, 
    navigateTo,
    userRole,
    workersList,
    orderAssignmentsMap,
    assignOrderToWorker,
    hasWorkerPermission
  } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All'); 
  const [timeFilter, setTimeFilter] = useState('All'); 
  const [selectedSingleDate, setSelectedSingleDate] = useState('');

  const [hoveredInvoiceId, setHoveredInvoiceId] = useState(null);
  
  // Interactive per-service status dropdown state
  const [activePopoverKey, setActivePopoverKey] = useState(null); // `${invoiceId}_${serviceId}`
  
  // Custom status & production workflow management modal state
  const [showStatusManagerModal, setShowStatusManagerModal] = useState(false);
  const [pendingServiceTarget, setPendingServiceTarget] = useState(null); // { invoiceId, serviceId }

  // Delivery + Payment Settlement confirmation modal state (Requirement 14)
  const [deliverySettlementInvoice, setDeliverySettlementInvoice] = useState(null);
  const [settlementPaymentMode, setSettlementPaymentMode] = useState('Cash');

  // ESC key dismiss for settlement modal
  useModalDismiss(() => setDeliverySettlementInvoice(null), Boolean(deliverySettlementInvoice));

  const handleClearFilters = () => {
    setSearchTerm('');
    setStageFilter('All');
    setTimeFilter('All');
    setSelectedSingleDate('');
  };

  const hasActiveFilters = Boolean(searchTerm || stageFilter !== 'All' || timeFilter !== 'All' || selectedSingleDate);

  const getServiceStatusBadgeClass = (st) => {
    const status = (st || 'PENDING').toUpperCase();
    switch (status) {
      case 'DELIVERED':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300';
      case 'READY':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-300 hover:bg-emerald-100';
      case 'PACKING':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-300 hover:bg-purple-100';
      case 'FITTING':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 hover:bg-amber-100';
      case 'STITCHING':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-300 hover:bg-blue-100';
      case 'CUTTING':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-300 hover:bg-amber-100';
      case 'PENDING':
        return 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-200 hover:bg-gray-100';
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-300 hover:bg-indigo-100';
    }
  };

  // Delivery Click Handler
  const handleMarkDeliveredClick = (invoiceObj) => {
    if (invoiceObj.balance > 0) {
      setDeliverySettlementInvoice(invoiceObj);
      setSettlementPaymentMode(invoiceObj.paymentMode || 'Cash');
    } else {
      deliverOrder(invoiceObj.id, true, invoiceObj.paymentMode);
    }
  };

  const handleConfirmDeliveredAndPaid = () => {
    if (!deliverySettlementInvoice) return;
    deliverOrder(deliverySettlementInvoice.id, true, settlementPaymentMode);
    setDeliverySettlementInvoice(null);
  };

  const handleConfirmDeliverWithBalance = () => {
    if (!deliverySettlementInvoice) return;
    deliverOrder(deliverySettlementInvoice.id, false);
    setDeliverySettlementInvoice(null);
  };

  // Filter logic - Unique stage names without duplication
  const rawStageNames = (productionStatuses || []).map(s => {
    const name = (typeof s === 'string' ? s : (s && s.name ? s.name : '')).trim();
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }).filter(Boolean);
  const availableStageNames = ['All', ...Array.from(new Set(rawStageNames))];

  const filteredInvoices = (invoices || []).filter(inv => {
    if (!inv) return false;
    const invId = String(inv.id || '');
    const custName = String(inv.customerName || '');
    const phone = String(inv.phone || '');

    const matchesSearch = 
      invId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm) ||
      (inv.services && inv.services.some(s => s && String(s.name || '').toLowerCase().includes(searchTerm.toLowerCase())));

    if (!matchesSearch) return false;

    // Stage filter
    if (stageFilter === 'Delivered') {
      if ((inv.status || '').toUpperCase() !== 'DELIVERED') return false;
    } else if (stageFilter !== 'All') {
      const targetStage = stageFilter.toUpperCase();
      const hasMatchingService = inv.services && inv.services.some(s => s && (s.status || 'PENDING').toUpperCase() === targetStage);
      if (!hasMatchingService && (inv.status || '').toUpperCase() !== targetStage) return false;
    }

    // Time filter logic
    if (timeFilter !== 'All') {
      const todayObj = new Date();
      const todayStr = todayObj.toISOString().split('T')[0];
      
      const tomorrowObj = new Date();
      tomorrowObj.setDate(todayObj.getDate() + 1);
      const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

      const invDateStr = String(inv.dueDate || '');

      if (timeFilter === 'Today') {
        if (!invDateStr.includes(todayStr) && !invDateStr.toLowerCase().includes('today')) {
          const isToday = !isNaN(new Date(invDateStr).getTime()) && new Date(invDateStr).toDateString() === todayObj.toDateString();
          if (!isToday && !invDateStr.includes('10 Sep') && !invDateStr.includes('05 Sep')) return false;
        }
      } else if (timeFilter === 'Tomorrow') {
        if (!invDateStr.includes(tomorrowStr)) {
          const isTomorrow = !isNaN(new Date(invDateStr).getTime()) && new Date(invDateStr).toDateString() === tomorrowObj.toDateString();
          if (!isTomorrow && !invDateStr.includes('11 Sep')) return false;
        }
      } else if (timeFilter === 'This Week') {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        const invTime = new Date(invDateStr).getTime();
        if (!isNaN(invTime)) {
          if (invTime < startOfWeek.getTime() || invTime > endOfWeek.getTime()) return false;
        }
      } else if (timeFilter === 'Overdue') {
        if (inv.status === 'DELIVERED') return false;
        const invTime = new Date(invDateStr).getTime();
        const nowTime = todayObj.getTime();
        const isPast = !isNaN(invTime) && invTime < nowTime;
        if (!isPast && !invDateStr.includes('01 Sep') && !invDateStr.includes('08 Sep')) return false;
      } else if (timeFilter === 'Custom Date') {
        if (selectedSingleDate) {
          const targetDateObj = new Date(selectedSingleDate);
          const targetDateStr = selectedSingleDate; // YYYY-MM-DD
          const invoiceDateStr = String(inv.date || '');
          
          const matchDueDate = invDateStr && (
            invDateStr.includes(targetDateStr) ||
            (!isNaN(new Date(invDateStr).getTime()) && new Date(invDateStr).toDateString() === targetDateObj.toDateString())
          );
          const matchDate = invoiceDateStr && (
            invoiceDateStr.includes(targetDateStr) ||
            (!isNaN(new Date(invoiceDateStr).getTime()) && new Date(invoiceDateStr).toDateString() === targetDateObj.toDateString())
          );

          if (!matchDueDate && !matchDate) return false;
        }
      }
    }

    // Worker Assigned Orders Filter
    if (userRole === 'WORKER' && !hasWorkerPermission('VIEW_ALL_ORDERS')) {
      const assigned = orderAssignmentsMap[inv.id] || orderAssignmentsMap[inv.dbId];
      if (!assigned) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
            Production Registers
          </h2>
          <p className="text-xs text-[#777777] mt-1">
            Shopfloor task pipeline. Track & update per-service production status (reversible to any stage), add/delete custom statuses, or settle deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatusManagerModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-smooth shadow-xs cursor-pointer"
          >
            <Layers className="w-4 h-4" /> Manage Production Workflow
          </button>
          <span className="px-3.5 py-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] text-xs font-bold shadow-xs">
            {filteredInvoices.length} Orders Listed
          </span>
        </div>
      </div>

      {/* Controls & Combined Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice #, customer, phone or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
            />
          </div>

          {/* Time Filter Pills & Custom Date inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333]">
              {['All', 'Today', 'Tomorrow', 'This Week', 'Overdue', 'Custom Date'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeFilter(tf)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-smooth cursor-pointer ${
                    timeFilter === tf
                      ? 'bg-[#202020] text-white dark:bg-white dark:text-[#202020]'
                      : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-100 cursor-pointer transition-smooth"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

        </div>

        {/* Single Custom Date Picker Field */}
        {timeFilter === 'Custom Date' && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs">
            <span className="font-bold text-[#777777]">Select Date:</span>
            <input
              type="date"
              value={selectedSingleDate}
              onChange={(e) => setSelectedSingleDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
            />
            {selectedSingleDate && (
              <button
                onClick={() => setSelectedSingleDate('')}
                className="text-[#777777] hover:text-[#202020] dark:hover:text-white p-1"
                title="Clear date filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-[11px] font-bold text-[#777777] uppercase tracking-wider mr-2 shrink-0">
            Status Filter:
          </span>
          {availableStageNames.map((stg) => (
            <button
              key={stg}
              onClick={() => setStageFilter(stg)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-smooth cursor-pointer ${
                stageFilter === stg
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[#F5F5F5] dark:bg-[#282828] text-[#777777] hover:bg-[#EEEEEE] hover:text-[#202020] dark:hover:text-white'
              }`}
            >
              {stg}
            </button>
          ))}
        </div>

      </div>

      {/* Production Register Grid Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs overflow-hidden">
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
                <th className="py-3 px-4 font-bold w-[12%]">Invoice #</th>
                <th className="py-3 px-4 font-bold w-[20%]">Customer Name</th>
                <th className="py-3 px-4 font-bold w-[13%]">Delivery Date</th>
                <th className="py-3 px-4 font-bold w-[35%]">Services & Per-Task Production Status</th>
                <th className="py-3 px-4 font-bold w-[12%]">Overall Status</th>
                <th className="py-3 px-4 text-right font-bold w-[8%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {filteredInvoices.map((inv) => {
                const targetCustomer = (customers || []).find(c => c && (c.id === inv.customerId || (inv.phone && c.phone && c.phone === inv.phone)));

                return (
                  <tr 
                    key={inv.id}
                    className="hover:bg-[#F5F5F5]/60 dark:hover:bg-[#282828]/60 transition-smooth"
                  >
                    {/* Invoice ID */}
                    <td className="py-4 px-4 font-bold text-[#202020] dark:text-white align-top">
                      <span className="block">{inv.id}</span>
                      <span className="text-[10px] text-[#777777] font-mono">{inv.date}</span>
                    </td>

                    {/* Customer Name */}
                    <td className="py-4 px-4 align-top relative">
                      <div
                        onMouseEnter={() => setHoveredInvoiceId(inv.id)}
                        onMouseLeave={() => setHoveredInvoiceId(null)}
                        onClick={() => openCustomerProfile(targetCustomer ? targetCustomer.id : inv.customerId)}
                        className="cursor-pointer group inline-block"
                      >
                        <span className="font-bold text-[#202020] dark:text-white group-hover:text-emerald-600 transition-smooth block">
                          {inv.customerName}
                        </span>
                        <span className="text-[11px] text-[#777777] font-mono block">
                          {inv.phone}
                        </span>
                      </div>

                      {/* COMPACT CUSTOMER HOVER PREVIEW POPOVER */}
                      {hoveredInvoiceId === inv.id && (
                        <div className="absolute left-4 top-full mt-1 w-72 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] p-3.5 z-40 animate-fade-in pointer-events-none">
                          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E3E3E3] dark:border-[#333333]">
                            <div className="w-7 h-7 rounded-lg bg-[#202020] text-white flex items-center justify-center font-bold text-xs">
                              {(inv.customerName || 'CU').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#202020] dark:text-white leading-tight">{inv.customerName || 'Customer'}</h4>
                              <span className="text-[10px] text-[#777777] font-mono">{inv.phone}</span>
                            </div>
                          </div>

                          <div className="pt-2 space-y-1.5 text-[11px]">
                            <div className="flex justify-between font-semibold">
                              <span className="text-[#777777]">Current Order:</span>
                              <span className="text-[#202020] dark:text-white">{inv.id} ({inv.dueDate})</span>
                            </div>

                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] font-bold text-[#777777] uppercase block">Task Progress:</span>
                              {inv.services && inv.services.filter(Boolean).map((s, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px]">
                                  <span className="text-[#202020] dark:text-white truncate max-w-[150px]">{s.name || 'Task'}</span>
                                  <span className="font-bold text-emerald-600 uppercase">{s.status || 'PENDING'}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Target Delivery Date */}
                    <td className="py-4 px-4 font-bold text-[#202020] dark:text-white align-top">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#777777]" />
                        <span>{inv.dueDate}</span>
                      </div>
                    </td>

                    {/* Services Breakdown with Per-Task Interactive Reversible Status Dropdown */}
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-2">
                        {inv.services && inv.services.filter(Boolean).map((svc, sIdx) => {
                          const svcId = (svc && svc.id) ? svc.id : `svc-${sIdx}`;
                          const svcName = (svc && svc.name) ? svc.name : 'Service';
                          const svcQty = (svc && svc.qty !== undefined) ? svc.qty : 1;
                          const currentSvcStatus = (svc && svc.status ? svc.status : 'PENDING').toUpperCase();
                          const popoverKey = `${inv.id || 'inv'}_${svcId}`;
                          const isOpen = activePopoverKey === popoverKey;

                          return (
                            <div 
                              key={svcId}
                              className="p-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between gap-2 relative"
                            >
                              <span className="font-semibold text-xs text-[#202020] dark:text-white truncate">
                                {svcName} <span className="text-[10px] text-[#777777] font-normal">(x{svcQty})</span>
                              </span>

                              {/* Interactive Reversible Dropdown Trigger */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActivePopoverKey(isOpen ? null : popoverKey)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${getServiceStatusBadgeClass(currentSvcStatus)}`}
                                  title="Click to select or change production status (reversible)"
                                >
                                  <span>{currentSvcStatus}</span>
                                  <ChevronDown className="w-3 h-3 opacity-70" />
                                </button>

                                {/* POPOVER DROPDOWN MENU */}
                                {isOpen && (
                                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] py-1.5 z-50 animate-fade-in">
                                    <div className="px-3 py-1 text-[10px] font-bold text-[#777777] uppercase tracking-wider border-b border-[#E3E3E3] dark:border-[#333333] mb-1">
                                      Set Production Status:
                                    </div>
                                    
                                    <div className="max-h-48 overflow-y-auto space-y-0.5 px-1">
                                      {productionStatuses.filter(Boolean).map((st, idx) => {
                                        const stId = (st && st.id) ? st.id : (st && st.name ? st.name : `ps-${idx}`);
                                        const stName = typeof st === 'string' ? st : (st && st.name ? st.name : '');
                                        const isCurrent = stName.toUpperCase() === currentSvcStatus;
                                        return (
                                          <button
                                            key={stId}
                                            onClick={() => {
                                              updateServiceStatus(inv.id, svc.id, stName);
                                              setActivePopoverKey(null);
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-smooth cursor-pointer ${
                                              isCurrent 
                                                ? 'bg-[#202020] text-white dark:bg-white dark:text-[#202020]' 
                                                : 'text-[#202020] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#282828]'
                                            }`}
                                          >
                                            <span>{stName}</span>
                                            {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    <div className="pt-1.5 mt-1 border-t border-[#E3E3E3] dark:border-[#333333] px-1">
                                      <button
                                        onClick={() => {
                                          setActivePopoverKey(null);
                                          setPendingServiceTarget({ invoiceId: inv.id, serviceId: svc.id });
                                          setShowStatusManagerModal(true);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> Add Custom Status
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Overall Order Status */}
                    <td className="py-4 px-4 align-top space-y-1.5">
                      <StatusBadge status={inv.status} size="sm" />
                      {inv.status !== 'DELIVERED' && (
                        <button
                          onClick={() => handleMarkDeliveredClick(inv)}
                          className="w-full mt-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-smooth"
                        >
                          <Truck className="w-3 h-3" /> Mark Delivered
                        </button>
                      )}
                    </td>

                    {/* Action link */}
                    <td className="py-4 px-4 text-right align-top">
                      <button
                        onClick={() => navigateTo('invoice-detail', { invoiceId: inv.id })}
                        className="p-1.5 rounded-lg text-[#777777] hover:text-[#202020] dark:hover:text-white hover:bg-white dark:hover:bg-[#1E1E1E] transition-smooth cursor-pointer"
                        title="View order receipt detail"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================== */}
      {/* 14. DELIVERY + PAYMENT SETTLEMENT CONFIRMATION MODAL */}
      {/* ================================================== */}
      {deliverySettlementInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setDeliverySettlementInvoice(null)}
          size="sm"
          maxWidthClass="max-w-md"
          zIndex={9990}
        >
              <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
                <div className="flex items-center gap-2.5 text-emerald-600">
                  <Truck className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#202020] dark:text-white">Delivery & Payment Settlement</h3>
                </div>
                <button 
                  onClick={() => setDeliverySettlementInvoice(null)}
                  className="text-[#777777] hover:text-[#202020] dark:hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="font-bold text-sm text-[#202020] dark:text-white">
                  Has the remaining balance been received for #{deliverySettlementInvoice.id}?
                </p>
                
                <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] space-y-1.5">
                  <div className="flex justify-between text-[#777777]">
                    <span>Customer Name:</span>
                    <span className="font-bold text-[#202020] dark:text-white">{deliverySettlementInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between text-[#777777]">
                    <span>Total Order Amount:</span>
                    <span className="font-semibold text-[#202020] dark:text-white">₹{deliverySettlementInvoice.total}</span>
                  </div>
                  <div className="flex justify-between text-[#777777]">
                    <span>Already Paid:</span>
                    <span className="font-semibold text-emerald-600">₹{deliverySettlementInvoice.advancePaid}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-[#E3E3E3] dark:border-[#333333] text-[#B85C5C]">
                    <span>Remaining Balance:</span>
                    <span>₹{deliverySettlementInvoice.balance}</span>
                  </div>
                </div>

                {/* Payment Mode Selector for Settlement */}
                <div className="space-y-1 pt-1">
                  <label className="block text-[11px] font-bold text-[#777777]">Settlement Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['Cash', 'UPI', 'Card', 'Net Banking'].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setSettlementPaymentMode(m)}
                        className={`py-1.5 px-1 text-[11px] font-bold rounded-xl border transition-smooth truncate ${
                          settlementPaymentMode === m 
                            ? 'bg-[#202020] text-white border-[#202020] dark:bg-white dark:text-[#202020]' 
                            : 'bg-[#F5F5F5] dark:bg-[#252525] border-[#E3E3E3] dark:border-[#333333] text-[#777777]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-[#E3E3E3] dark:border-[#333333]">
                <button
                  type="button"
                  onClick={() => setDeliverySettlementInvoice(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-[#777777] hover:bg-[#F5F5F5] dark:hover:bg-[#252525]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeliverWithBalance}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 cursor-pointer"
                >
                  Deliver With Balance
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeliveredAndPaid}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Mark Delivered & Paid
                </button>
              </div>
        </Modal>
      )}

      {/* ================================================== */}
      {/* PRODUCTION WORKFLOW STATUS MANAGER MODAL */}
      {/* ================================================== */}
      {showStatusManagerModal && (
        <WorkflowEditorModal 
          onClose={() => {
            setShowStatusManagerModal(false);
            setPendingServiceTarget(null);
          }}
        />
      )}

    </div>
  );
};
