import React, { useState } from 'react';
import { 
  Search, 
  Check, 
  Calendar, 
  ChevronRight,
  ChevronDown,
  User,
  Layers,
  Plus,
  Trash2,
  X,
  Truck,
  Users,
  ShieldAlert
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../common/StatusBadge';
import { WorkflowEditorModal } from '../modals/WorkflowEditorModal';
import { DeliveryPaymentModal } from '../modals/DeliveryPaymentModal';
import { useModalDismiss } from '../../utils/modalUtils';
import { useRealtimeRegisters } from '../../hooks/useRealtimeRegisters';

import { fetchAllOrders, removeOrderFromRegister } from '../../services/orders';
import { supabase, isUuid } from '../../lib/supabase/client';

export const RegistersView = () => {
  const { 
    invoices, 
    customers, 
    productionStatuses, 
    updateServiceStatus, 
    deliverOrder,
    deleteOrder,
    archiveOrderInRegister,
    refetchOrders,
    openCustomerProfile, 
    navigateTo,
    userRole,
    userProfile,
    user,
    workersList,
    orderAssignmentsMap,
    customerAssignmentsMap,
    assignOrderToWorker,
    hasWorkerPermission,
    showToast
  } = useShop();

  const shopId = 'a1000000-0000-0000-0000-000000000001';
  const currentUser = userProfile || user;
  const currentUserId = currentUser?.id || currentUser?.auth_user_id || currentUser?.worker_id;
  const currentUserRole = currentUser?.role || userRole;
  const [orders, setOrders] = useState([]);

  React.useEffect(() => {
    async function loadOrders() {
      const data = await fetchAllOrders(shopId, currentUser);
      if (data) {
        setOrders(data);
      }
    }
    loadOrders();
  }, [currentUserId, currentUserRole]);

  // Connect Realtime WebSocket Subscription with OCC & LWW conflict resolution
  useRealtimeRegisters(orders, setOrders, showToast, currentUserId);

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All'); 
  const [timeFilter, setTimeFilter] = useState('All'); 
  const [selectedSingleDate, setSelectedSingleDate] = useState('');

  const [hoveredInvoiceId, setHoveredInvoiceId] = useState(null);
  
  // Interactive per-service status dropdown state
  const [activePopoverKey, setActivePopoverKey] = useState(null); // `${invoiceId}_${serviceId}`
  
  // Multi-Worker Assignment Popover State
  const [activeAssignPopoverOrderId, setActiveAssignPopoverOrderId] = useState(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [alsoAssignCustCheck, setAlsoAssignCustCheck] = useState(false);

  // Custom status & production workflow management modal state
  const [showStatusManagerModal, setShowStatusManagerModal] = useState(false);
  const [pendingServiceTarget, setPendingServiceTarget] = useState(null);

  // Delivery + Payment Settlement confirmation modal state
  const [deliverySettlementInvoice, setDeliverySettlementInvoice] = useState(null);
  const [settlementPaymentMode, setSettlementPaymentMode] = useState('Cash');

  // Order Deletion Confirmation Modal state
  const [orderToDelete, setOrderToDelete] = useState(null);

  useModalDismiss(() => setDeliverySettlementInvoice(null), Boolean(deliverySettlementInvoice));
  useModalDismiss(() => setOrderToDelete(null), Boolean(orderToDelete));

  const isWorker = userRole === 'WORKER';
  const canViewContact = !isWorker || (hasWorkerPermission && hasWorkerPermission('VIEW_CUSTOMER_CONTACT'));

  const handleClearFilters = () => {
    setSearchTerm('');
    setStageFilter('All');
    setTimeFilter('All');
    setSelectedSingleDate('');
  };

  const handleUpdateOrderStatus = async (e, order, newStatus, serviceIndex = null) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }

    if (!order || !newStatus) return;

    // Resolve order object and target invoice number
    const targetOrder = typeof order === 'object' && order !== null
      ? order
      : (orders.find(o => String(o.id) === String(order) || String(o.invoice_number) === String(order) || String(o.dbId) === String(order)) || { id: order, invoice_number: order });

    const invoiceNum = targetOrder.invoice_number || targetOrder.id || targetOrder.invoiceNumber;
    if (!invoiceNum) return;

    // Close popover menu
    setActivePopoverKey(null);

    // If newStatus is DELIVERED, delegate directly to canonical DeliveryPaymentModal / deliverOrder flow
    if (newStatus.toUpperCase() === 'DELIVERED') {
      setDeliverySettlementInvoice(targetOrder);
      return;
    }

    // Save previous state snapshot for automatic rollback on error
    const previousOrdersSnapshot = orders;

    // A. INSTANT OPTIMISTIC UI UPDATE (0ms delay)
    setOrders((prevOrders) =>
      prevOrders.map((o) => {
        const isMatch = (o.invoice_number && String(o.invoice_number) === String(invoiceNum)) ||
                        (o.id && String(o.id) === String(invoiceNum)) ||
                        (targetOrder.id && String(o.id) === String(targetOrder.id));

        if (isMatch) {
          // Deep clone to guarantee React state re-render
          const updated = JSON.parse(JSON.stringify(o));

          const updateItemArray = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) return arr;
            if (serviceIndex !== null && serviceIndex !== undefined && arr[serviceIndex]) {
              arr[serviceIndex].status = newStatus;
              arr[serviceIndex].task_status = newStatus;
            } else {
              arr.forEach((s) => {
                s.status = newStatus;
                s.task_status = newStatus;
              });
            }
            return arr;
          };

          if (updated.services) updateItemArray(updated.services);
          if (updated.items) updateItemArray(updated.items);
          if (updated.order_items) updateItemArray(updated.order_items);

          const allItems = updated.order_items || updated.services || updated.items || [];
          if (allItems.length > 0) {
            const statuses = allItems.map(s => (s.status || s.task_status || "PENDING").toUpperCase());
            if (statuses.every(st => st === "DELIVERED")) {
              updated.status = "DELIVERED";
              updated.overall_status = "DELIVERED";
            } else if (statuses.every(st => st === "READY")) {
              updated.status = "READY";
              updated.overall_status = "READY";
            } else if (statuses.every(st => st === "PENDING")) {
              updated.status = "PENDING";
              updated.overall_status = "PENDING";
            } else if (statuses.every(st => st === statuses[0])) {
              updated.status = statuses[0];
              updated.overall_status = statuses[0];
            } else {
              updated.status = "IN PROGRESS";
              updated.overall_status = "IN PROGRESS";
            }
          } else {
            updated.status = newStatus;
            updated.overall_status = newStatus;
          }

          return updated;
        }
        return o;
      })
    );

    if (updateServiceStatus) {
      const arr = targetOrder?.services || targetOrder?.order_items || targetOrder?.items || [];
      const targetItem = serviceIndex !== null && serviceIndex !== undefined ? arr[serviceIndex] : null;
      if (targetItem?.id) {
        updateServiceStatus(targetOrder.id || invoiceNum, targetItem.id, newStatus);
      }
    }

    // B. SUPABASE PERSISTENCE FOR NON-DELIVERY PRODUCTION STATUSES
    try {
      let updatedServices = Array.isArray(targetOrder.services) ? [...targetOrder.services] : [];
      if (updatedServices.length > 0) {
        updatedServices = updatedServices.map((s, idx) =>
          serviceIndex === null || serviceIndex === undefined || idx === serviceIndex
            ? { ...s, status: newStatus, task_status: newStatus }
            : s
        );
      }

      const patchPayload = {
        status: newStatus,
        overall_status: newStatus,
        services: updatedServices,
        updated_at: new Date().toISOString()
      };

      const targetSearchKey = String(invoiceNum);
      let query = supabase.from('orders').update(patchPayload);

      if (isUuid(targetOrder.id)) {
        query = query.eq('id', String(targetOrder.id));
      } else {
        query = query.eq('invoice_number', targetSearchKey);
      }

      const { error } = await query;

      if (error) {
        console.error("Database update failed, rolling back local state:", error);
        setOrders(previousOrdersSnapshot);
        if (typeof showToast === 'function') {
          showToast("Sync Warning", `Unable to sync status update to ${newStatus}. Reverted local change.`, "error");
        }
      }
    } catch (err) {
      console.error("Failed to persist status change, rolling back local state:", err);
      setOrders(previousOrdersSnapshot);
      if (typeof showToast === 'function') {
        showToast("Sync Error", `Failed to persist status change. Reverted local change.`, "error");
      }
    }
  };

  const handleStatusChange = handleUpdateOrderStatus;
  const handleSelectProductionStatus = handleUpdateOrderStatus;
  const handleProductionStatusChange = handleUpdateOrderStatus;

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
    if (isWorker && hasWorkerPermission && !hasWorkerPermission('DELIVER_ORDERS')) {
      showToast("Access Denied", "Worker account is not authorized to deliver orders.", "error");
      return;
    }
    setDeliverySettlementInvoice(invoiceObj);
    setSettlementPaymentMode(invoiceObj.paymentMode || 'Cash');
  };

  // Open Multi-Worker assignment popover
  const handleOpenAssignPopover = (inv) => {
    if (userRole !== 'OWNER') return;
    const currentAssignments = orderAssignmentsMap[inv.id] || orderAssignmentsMap[inv.dbId] || [];
    const currentArray = Array.isArray(currentAssignments) ? currentAssignments : [currentAssignments];
    const initialIds = currentArray.map(a => a?.workerId).filter(Boolean);
    
    setSelectedWorkerIds(initialIds);
    setAlsoAssignCustCheck(false);
    setActiveAssignPopoverOrderId(inv.id);
  };

  const toggleSelectWorkerId = (wId) => {
    setSelectedWorkerIds(prev => 
      prev.includes(wId) ? prev.filter(id => id !== wId) : [...prev, wId]
    );
  };

  const handleSaveMultiAssignment = async (inv) => {
    const targetCustId = inv.customerId || inv.customer_id;
    await assignOrderToWorker(inv.id, selectedWorkerIds, alsoAssignCustCheck, targetCustId);
    setActiveAssignPopoverOrderId(null);
  };

  // Filter logic - Unique stage names without duplication
  const rawStageNames = (productionStatuses || []).map(s => {
    const name = (typeof s === 'string' ? s : (s && s.name ? s.name : '')).trim();
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }).filter(Boolean);
  const availableStageNames = ['All', ...Array.from(new Set(rawStageNames))];

  // Source invoices: use fetched orders array if present, fallback to context invoices
  const sourceInvoices = React.useMemo(() => {
    if (orders && orders.length > 0) {
      return orders.map(ord => {
        if (ord.dbId || (ord.services && ord.customerName)) {
          return ord;
        }
        const lineItems = (ord.order_items || []).map(item => ({
          id: item.id,
          serviceId: item.service_id,
          name: item.service_name_snapshot || item.name || 'Service',
          rate: parseFloat(item.unit_price) || 0,
          qty: item.quantity || 1,
          amount: parseFloat(item.line_total) || 0,
          status: item.status || 'PENDING'
        }));

        return {
          id: ord.invoice_number || ord.id,
          dbId: ord.id,
          customerId: ord.customer_id,
          customerName: ord.customers?.name || ord.customer_name || 'Customer',
          phone: ord.customers?.phone || ord.customer_phone || '',
          customers: ord.customers,
          date: ord.order_date || ord.created_at?.split('T')[0],
          dueDate: ord.due_date || ord.order_date,
          subtotal: parseFloat(ord.subtotal) || 0,
          discount: parseFloat(ord.discount) || 0,
          discount_type: ord.discount_type || 'amount',
          total: parseFloat(ord.total_amount || ord.total) || 0,
          advancePaid: parseFloat(ord.total_paid || ord.advancePaid) || 0,
          balance: parseFloat(ord.balance_amount || ord.balance) || 0,
          status: ord.status || 'PENDING',
          notes: ord.notes || '',
          measurements: ord.measurement_snapshot || {},
          services: lineItems,
          created_at: ord.created_at,
          archived_in_register: Boolean(ord.archived_in_register)
        };
      });
    }
    return invoices || [];
  }, [orders, invoices]);

  const filteredInvoices = (sourceInvoices || []).filter(inv => {
    if (!inv || inv.archived_in_register) return false;
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
          const targetDateStr = selectedSingleDate;
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

    // Worker Order Filtering (Requirement 5): Show ONLY orders assigned to worker ID or worker's customer profile
    if (isWorker && !hasWorkerPermission('VIEW_ALL_ORDERS') && !hasWorkerPermission('view_all_orders')) {
      const currentWorkerId = userProfile?.id || userProfile?.auth_user_id;
      const orderAssignedList = orderAssignmentsMap[inv.id] || orderAssignmentsMap[inv.dbId] || [];
      const orderAssignedArray = Array.isArray(orderAssignedList) ? orderAssignedList : [orderAssignedList];
      const isAssignedToOrder = orderAssignedArray.some(a => a?.workerId === currentWorkerId || a?.workerId === userProfile?.id);

      const custAssignedList = customerAssignmentsMap[inv.customerId] || customerAssignmentsMap[inv.customer_id] || [];
      const custAssignedArray = Array.isArray(custAssignedList) ? custAssignedList : [custAssignedList];
      const isAssignedToCust = custAssignedArray.some(a => a?.workerId === currentWorkerId || a?.workerId === userProfile?.id);

      if (!isAssignedToOrder && !isAssignedToCust) return false;
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
            Shopfloor task pipeline. Track & update per-service production status (reversible to any stage), manage multi-worker assignments, or settle deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isWorker && (
            <button
              onClick={() => setShowStatusManagerModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-smooth shadow-xs cursor-pointer"
            >
              <Layers className="w-4 h-4" /> Manage Production Workflow
            </button>
          )}
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
                <th className="py-3 px-4 font-bold w-[18%]">Customer Name</th>
                <th className="py-3 px-4 font-bold w-[15%]">Assigned Worker(s)</th>
                <th className="py-3 px-4 font-bold w-[12%]">Delivery Date</th>
                <th className="py-3 px-4 font-bold w-[28%]">Services & Per-Task Production Status</th>
                <th className="py-3 px-4 font-bold w-[10%]">Overall Status</th>
                <th className="py-3 px-4 text-right font-bold w-[5%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {filteredInvoices.map((inv) => {
                const targetCustomer = (customers || []).find(c => c && (c.id === inv.customerId || (inv.phone && c.phone && c.phone === inv.phone)));
                const customerName = inv.customerName || inv.customers?.name || inv.customer_name || targetCustomer?.name || 'Unassigned Customer';
                const rawPhone = inv.phone || inv.customers?.phone || inv.customer_phone || targetCustomer?.phone || '';
                const displayPhone = canViewContact ? (rawPhone || 'N/A') : '••• Restricted •••';

                // Multi-worker assignment list
                const rawAssignments = orderAssignmentsMap[inv.id] || orderAssignmentsMap[inv.dbId] || [];
                const assignedArray = Array.isArray(rawAssignments) ? rawAssignments : [rawAssignments];
                const assignedWorkerNames = assignedArray.map(a => a?.workerName).filter(Boolean);

                const isAssignPopoverOpen = activeAssignPopoverOrderId === inv.id;

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
                          {customerName}
                        </span>
                        <span className="text-[11px] text-[#777777] font-mono block">
                          {displayPhone}
                        </span>
                      </div>

                      {/* COMPACT CUSTOMER HOVER PREVIEW POPOVER */}
                      {hoveredInvoiceId === inv.id && (
                        <div className="absolute left-4 top-full mt-1 w-72 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] p-3.5 z-40 animate-fade-in pointer-events-none">
                          <div className="flex items-center gap-2.5 pb-2 border-b border-[#E3E3E3] dark:border-[#333333]">
                            <div className="w-7 h-7 rounded-lg bg-[#202020] text-white flex items-center justify-center font-bold text-xs">
                              {(customerName || 'CU').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#202020] dark:text-white leading-tight">{customerName}</h4>
                              <span className="text-[10px] text-[#777777] font-mono">{displayPhone}</span>
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

                    {/* Multi-Worker Assignment Column */}
                    <td className="py-4 px-4 align-top relative">
                      <div className="space-y-1">
                        {assignedWorkerNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedWorkerNames.map((wName, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 text-[10px] font-bold">
                                {wName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#777777] italic block">Unassigned</span>
                        )}

                        {!isWorker && (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignPopover(inv)}
                            className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer mt-1"
                          >
                            <Users className="w-3 h-3" /> Assign Worker(s)
                          </button>
                        )}
                      </div>

                      {/* MULTI-WORKER ASSIGNMENT POPOVER */}
                      {isAssignPopoverOpen && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] p-4 z-50 animate-fade-in space-y-3">
                          <div className="flex items-center justify-between border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
                            <span className="font-bold text-xs text-[#202020] dark:text-white">Assign Workers</span>
                            <button onClick={() => setActiveAssignPopoverOrderId(null)} className="text-[#777777] p-1">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="max-h-36 overflow-y-auto space-y-1">
                            {workersList.map((w) => {
                              const isChecked = selectedWorkerIds.includes(w.id) || selectedWorkerIds.includes(w.auth_user_id);
                              return (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => toggleSelectWorkerId(w.id)}
                                  className={`w-full text-left p-2 rounded-xl border flex items-center justify-between text-xs transition-smooth cursor-pointer ${
                                    isChecked ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 text-purple-900 dark:text-purple-200' : 'border-gray-200 dark:border-[#333333] text-[#777777]'
                                  }`}
                                >
                                  <span className="font-semibold text-[11px]">{w.full_name}</span>
                                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-400'}`}>
                                    {isChecked && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Requirement 3: Add option "Also Assign Customer Profile to Worker" */}
                          <label className="flex items-center gap-2 pt-1 border-t border-[#E3E3E3] dark:border-[#333333] text-[11px] text-[#777777] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={alsoAssignCustCheck}
                              onChange={(e) => setAlsoAssignCustCheck(e.target.checked)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-semibold text-[#202020] dark:text-white">Also Assign Customer Profile to Worker</span>
                          </label>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveMultiAssignment(inv)}
                              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                            >
                              Save Worker Assignment
                            </button>
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
                          const currentSvcStatus = (svc?.status || svc?.task_status || inv?.overall_status || inv?.status || 'PENDING').toUpperCase();
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
                                  onClick={(e) => { e.stopPropagation(); setActivePopoverKey(isOpen ? null : popoverKey); }}
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
                                            type="button"
                                            onClick={(e) => handleUpdateOrderStatus(e, inv, stName, sIdx)}
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

                                    {!isWorker && (
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
                                    )}
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
                      <StatusBadge status={inv.overall_status || inv.status || 'PENDING'} size="sm" />
                      {((inv.status || inv.overall_status || '').toUpperCase() !== 'DELIVERED' || (inv.services && inv.services.some(s => (s.status || '').toUpperCase() !== 'DELIVERED'))) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            if (e) e.stopPropagation();
                            setDeliverySettlementInvoice(inv);
                          }}
                          className="w-full mt-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-smooth"
                        >
                          <Truck className="w-3 h-3" /> Mark Delivered
                        </button>
                      )}
                    </td>

                    {/* Action link */}
                    <td className="py-4 px-4 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        {!isWorker && (
                          <button
                            onClick={() => setOrderToDelete(inv)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-smooth cursor-pointer"
                            title="Remove Order from Register"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigateTo('invoice-detail', { invoiceId: inv.id })}
                          className="p-1.5 rounded-lg text-[#777777] hover:text-[#202020] dark:hover:text-white hover:bg-white dark:hover:bg-[#1E1E1E] transition-smooth cursor-pointer"
                          title="View order receipt detail"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Workflow Manager Modal */}
      {showStatusManagerModal && (
        <WorkflowEditorModal
          isOpen={showStatusManagerModal}
          onClose={() => {
            setShowStatusManagerModal(false);
            setPendingServiceTarget(null);
          }}
          onStatusCreated={(newStatusName) => {
            if (pendingServiceTarget && newStatusName) {
              updateServiceStatus(pendingServiceTarget.invoiceId, pendingServiceTarget.serviceId, newStatusName);
              setPendingServiceTarget(null);
            }
          }}
        />
      )}

      {/* Delivery + Payment Settlement Modal */}
      {deliverySettlementInvoice && (
        <DeliveryPaymentModal
          isOpen={Boolean(deliverySettlementInvoice)}
          onClose={() => setDeliverySettlementInvoice(null)}
          order={deliverySettlementInvoice}
          onConfirmDelivery={async ({ orderId, amountPaidNow, paymentMode }) => {
            const selectedOrder = deliverySettlementInvoice;
            const targetId = selectedOrder?.id || selectedOrder?.dbId || orderId;

            if (deliverOrder) {
              await deliverOrder(targetId || orderId, amountPaidNow, paymentMode);
            }

            setDeliverySettlementInvoice(null);
            const freshOrders = await fetchAllOrders(shopId, currentUser);
            if (freshOrders) {
              setOrders(freshOrders);
            }
            if (refetchOrders) {
              await refetchOrders();
            }
          }}
        />
      )}

      {/* Order Deletion / Removal Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4 transition-all duration-200 animate-in fade-in">
          <div className="relative bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 max-w-sm w-full shadow-xl border border-gray-100 dark:border-[#333333] transform transition-all duration-200 animate-in fade-in zoom-in-95">
            <button 
              type="button"
              onClick={() => setOrderToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#282828] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3.5 pr-6">
              <div className="w-9 h-9 rounded-xl bg-orange-100/70 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Remove Order from Register</h3>
                <p className="text-[11px] font-medium text-gray-400 dark:text-[#777777]">Order #{orderToDelete?.invoice_number || orderToDelete?.id}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#252525] rounded-xl p-3 border border-gray-100 dark:border-[#333333] mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-[#777777]">Invoice:</span>
                <span className="text-gray-900 dark:text-white font-semibold">{orderToDelete?.invoice_number || orderToDelete?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-[#777777]">Customer:</span>
                <span className="text-gray-900 dark:text-white font-medium">{orderToDelete?.customerName || orderToDelete?.customer_name || orderToDelete?.customer?.name || 'Local Customer'}</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-normal pt-1.5 border-t border-gray-200/50 dark:border-[#333333] leading-tight">
                This will hide the order from active register view. It remains saved in customer history.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button 
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-[#A0A0A0] bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#333333] active:scale-95 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const targetId = orderToDelete.dbId || orderToDelete.id;
                  if (archiveOrderInRegister) {
                    archiveOrderInRegister(targetId);
                  }
                  await removeOrderFromRegister(targetId);
                  setOrderToDelete(null);
                  const freshOrders = await fetchAllOrders(shopId, currentUser);
                  if (freshOrders) {
                    setOrders(freshOrders);
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirm & Remove
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
