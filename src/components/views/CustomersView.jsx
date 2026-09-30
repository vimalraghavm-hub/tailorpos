import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  UserPlus, 
  ChevronRight,
  Star,
  Users,
  Check,
  X
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CustomerModal } from '../modals/CustomerModal';
import { fetchAllOrders } from '../../services/orders';

export const CustomersView = () => {
  const { 
    customers = [], 
    invoices = [],
    refetchOrders,
    openCustomerProfile, 
    toggleCustomerFavourite,
    userRole = 'OWNER',
    userProfile,
    user,
    workersList = [],
    customerAssignmentsMap = {},
    orderAssignmentsMap = {},
    assignCustomerToWorker,
    hasWorkerPermission
  } = useShop();

  const shopId = 'a1000000-0000-0000-0000-000000000001';
  const currentUser = userProfile || user;
  const currentUserId = currentUser?.id || currentUser?.auth_user_id || currentUser?.worker_id;
  const [allOrdersList, setAllOrdersList] = useState([]);

  const loadData = useCallback(async () => {
    const freshOrders = await fetchAllOrders(shopId, currentUser);
    if (freshOrders) {
      setAllOrdersList(freshOrders);
    }
  }, [shopId, currentUser]);

  useEffect(() => {
    loadData();

    const handleGlobalUpdate = () => {
      loadData();
    };

    window.addEventListener('shop-data-updated', handleGlobalUpdate);
    return () => window.removeEventListener('shop-data-updated', handleGlobalUpdate);
  }, [loadData]);

  const computeCustomerLedger = (customer) => {
    const ordersToUse = (allOrdersList && allOrdersList.length > 0) ? allOrdersList : invoices;
    const userOrders = (ordersToUse || []).filter(o => 
      String(o.customer_id || o.customerId) === String(customer.id) ||
      (o.phone && customer.phone && o.phone === customer.phone)
    );

    const totalSpent = userOrders.reduce((sum, order) => {
      return sum + Number(order.total_amount || order.grand_total || order.total || order.amount || 0);
    }, 0);

    const outstandingBalance = userOrders.reduce((sum, order) => {
      const isCancelled = (order.status || order.overall_status || '').toUpperCase() === 'CANCELLED';
      if (isCancelled) return sum;

      const total = Number(order.total_amount || order.grand_total || order.total || order.amount || 0);
      const paid = Number(order.advance_paid || order.total_paid || order.paid_amount || order.advancePaid || 0);
      const pending = Number(order.balance_amount !== undefined ? order.balance_amount : (order.balance !== undefined ? order.balance : Math.max(0, total - paid)));

      return sum + (pending > 0 ? pending : 0);
    }, 0);

    const finalBalance = (customer.outstanding !== undefined && customer.outstanding === 0)
      ? 0
      : (outstandingBalance !== undefined ? outstandingBalance : (customer.outstanding || 0));

    return {
      ...customer,
      totalOrdersCount: userOrders.length || customer.totalOrders || 0,
      totalSpent: totalSpent || customer.totalSpent || 0,
      outstandingBalance: finalBalance
    };
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'favourites'
  const [showAddCustModal, setShowAddCustModal] = useState(false);

  // Active Multi-Worker Assignment Popover State
  const [activeAssignPopoverCustId, setActiveAssignPopoverCustId] = useState(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);

  const isWorker = userRole === 'WORKER';
  const workerTabs = userProfile?.permissions?.tabs || [];
  const hasCustomerPermission = 
    userRole === 'OWNER' ||
    workerTabs.includes('customers') ||
    workerTabs.includes('Customer Profiles') ||
    workerTabs.includes('Customer Directory & Ledger') ||
    userProfile?.permissions?.features?.view_customers === true ||
    (hasWorkerPermission && (hasWorkerPermission('VIEW_CUSTOMER_PROFILE') || hasWorkerPermission('VIEW_CUSTOMER_CONTACT')));

  if (!hasCustomerPermission) {
    return (
      <div className="p-8 text-center space-y-3 bg-white dark:bg-[#1E1E1E] rounded-3xl border border-[#E3E3E3] dark:border-[#333333]">
        <Users className="w-12 h-12 text-red-500 mx-auto opacity-70" />
        <h3 className="text-xl font-bold text-[#202020] dark:text-white">Access Restricted</h3>
        <p className="text-xs text-[#777777]">You do not have permission to view Customer Profiles. Contact your shop owner.</p>
      </div>
    );
  }

  const canViewContact = !isWorker || (hasWorkerPermission && hasWorkerPermission('VIEW_CUSTOMER_CONTACT'));

  // Compute counts
  const totalCount = customers.length;
  const favouriteCount = customers.filter(c => c.is_favourite).length;

  const handleToggleFav = async (e, customerId) => {
    e.stopPropagation();
    const targetCust = customers.find(c => c.id === customerId);
    const currentStatus = Boolean(targetCust?.is_favourite);
    try {
      if (toggleCustomerFavourite) {
        await toggleCustomerFavourite(customerId, currentStatus);
      }
    } catch (err) {
      console.warn('Notice: Could not sync favourite status:', err?.message || err);
    }
  };

  const handleOpenAssignPopover = (e, cust) => {
    e.stopPropagation();
    if (userRole !== 'OWNER') return;
    const currentAssignments = customerAssignmentsMap[cust.id] || customerAssignmentsMap[cust.dbId] || [];
    const currentArray = Array.isArray(currentAssignments) ? currentAssignments : [currentAssignments];
    const initialIds = currentArray.map(a => a?.workerId).filter(Boolean);
    
    setSelectedWorkerIds(initialIds);
    setActiveAssignPopoverCustId(cust.id);
  };

  const toggleSelectWorkerId = (wId) => {
    setSelectedWorkerIds(prev => 
      prev.includes(wId) ? prev.filter(id => id !== wId) : [...prev, wId]
    );
  };

  const handleSaveCustomerAssignment = async (cust) => {
    await assignCustomerToWorker(cust.id, selectedWorkerIds);
    setActiveAssignPopoverCustId(null);
  };

  // Filter & Sort Customers
  const filteredCustomers = customers
    .filter(c => {
      const displayPhone = canViewContact ? (c.phone || '') : '';
      const matchSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          displayPhone.includes(searchTerm);
      if (!matchSearch) return false;
      if (filterTab === 'favourites') return Boolean(c.is_favourite);

      // Worker Customer Filtering (Requirement 5): Show ONLY customers assigned to worker
      if (isWorker && !hasWorkerPermission('VIEW_ALL_ORDERS') && !hasWorkerPermission('view_all_orders')) {
        const currentWorkerId = userProfile?.id || userProfile?.auth_user_id;

        const custAssignedList = customerAssignmentsMap[c.id] || customerAssignmentsMap[c.dbId] || [];
        const custAssignedArray = Array.isArray(custAssignedList) ? custAssignedList : [custAssignedList];
        const isAssignedToCust = custAssignedArray.some(a => a?.workerId === currentWorkerId || a?.workerId === userProfile?.id);

        if (!isAssignedToCust) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const favA = a.is_favourite ? 1 : 0;
      const favB = b.is_favourite ? 1 : 0;
      if (favA !== favB) return favB - favA;

      const parseDateVal = (item) => {
        const dStr = item.last_order_date || item.lastOrder;
        if (dStr && dStr !== 'N/A' && dStr !== 'null') {
          const t = new Date(dStr).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.created_at) {
          const t = new Date(item.created_at).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        return 0;
      };

      const dateA = parseDateVal(a);
      const dateB = parseDateVal(b);
      return dateB - dateA;
    });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
            Customer Directory & Ledger
          </h2>
          <p className="text-xs text-[#777777] mt-1">
            Manage shop clients, assign customer profiles to staff workers, view lifetime spend, outstanding dues, and order histories.
          </p>
        </div>

        {!isWorker && (
          <button
            onClick={() => setShowAddCustModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Add New Customer
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] shrink-0">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-smooth cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
            }`}
          >
            All Customers ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('favourites')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-smooth cursor-pointer ${
              filterTab === 'favourites'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 shadow-xs'
                : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterTab === 'favourites' ? 'fill-amber-400 text-amber-500' : ''}`} />
            Favourites Only ({favouriteCount})
          </button>
        </div>
      </div>

      {/* Customers Ledger Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 w-10 text-center">⭐</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Assigned Worker(s)</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Total Orders</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-4">Last Order Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-xs text-[#777777]">
                    {filterTab === 'favourites' 
                      ? 'No favourite customers found. Click the star icon (⭐) on any customer row to mark as favourite.' 
                      : 'No customer profiles match your search query.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const displayPhone = canViewContact ? (cust.phone || 'N/A') : '••• Restricted •••';
                  const displayAddress = canViewContact ? (cust.address || 'Local Customer') : '••• Restricted •••';

                  const rawAssignments = customerAssignmentsMap[cust.id] || customerAssignmentsMap[cust.dbId] || [];
                  const assignedArray = Array.isArray(rawAssignments) ? rawAssignments : [rawAssignments];
                  const assignedWorkerNames = assignedArray.map(a => a?.workerName).filter(Boolean);

                  const isAssignPopoverOpen = activeAssignPopoverCustId === cust.id;

                  return (
                    <tr 
                      key={cust.id}
                      onClick={() => openCustomerProfile(cust.id)}
                      className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth group"
                    >
                      {/* Star Toggle Button Column */}
                      <td 
                        className="py-3.5 px-3 text-center"
                        onClick={(e) => handleToggleFav(e, cust.id)}
                      >
                        <button
                          type="button"
                          className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-smooth cursor-pointer"
                          title={cust.is_favourite ? "Remove from Favourites" : "Mark as Favourite Customer"}
                        >
                          <Star className={`w-4 h-4 ${cust.is_favourite ? 'fill-amber-400 text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`} />
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#EEEEEE] dark:bg-[#282828] text-[#202020] dark:text-white flex items-center justify-center text-xs font-bold relative">
                            {(cust?.name || 'Customer').trim().slice(0, 2).toUpperCase()}
                            {cust.is_favourite && (
                              <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>
                            )}
                          </div>
                          <div>
                            <span className="flex items-center gap-1.5 font-bold">
                              {cust?.name || 'Customer'}
                              {cust.is_favourite && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                                  ⭐ FAVOURITE
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-[#777777] font-normal block">{displayAddress}</span>
                          </div>
                        </div>
                      </td>

                      {/* Multi-Worker Customer Assignment Column */}
                      <td className="py-3.5 px-4 align-top relative" onClick={(e) => e.stopPropagation()}>
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
                              onClick={(e) => handleOpenAssignPopover(e, cust)}
                              className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer mt-1"
                            >
                              <Users className="w-3 h-3" /> Assign Worker(s)
                            </button>
                          )}
                        </div>

                        {/* POPOVER FOR ASSIGNING CUSTOMER PROFILE TO WORKERS */}
                        {isAssignPopoverOpen && (
                          <div className="absolute left-0 top-full mt-1 w-60 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] p-3.5 z-50 animate-fade-in space-y-3">
                            <div className="flex items-center justify-between border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
                              <span className="font-bold text-xs text-[#202020] dark:text-white">Assign Customer Profile</span>
                              <button onClick={() => setActiveAssignPopoverCustId(null)} className="text-[#777777] p-1">
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

                            <button
                              type="button"
                              onClick={() => handleSaveCustomerAssignment(cust)}
                              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                            >
                              Save Assignment
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#777777] dark:text-[#9E9E9E]">{displayPhone}</td>
                      {(() => {
                        const ledger = computeCustomerLedger(cust);
                        return (
                          <>
                            <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">{ledger.totalOrdersCount} orders</td>
                            <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">₹{ledger.totalSpent.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 font-bold">
                              {ledger.outstandingBalance > 0 ? (
                                <span className="text-[#B85C5C]">₹{ledger.outstandingBalance.toLocaleString('en-IN')}</span>
                              ) : (
                                <span className="text-emerald-600">₹0 (Cleared)</span>
                              )}
                            </td>
                          </>
                        );
                      })()}
                      <td className="py-3.5 px-4 text-[#777777] font-medium">{cust.lastOrder || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerProfile(cust.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#777777] group-hover:text-[#202020] dark:group-hover:text-white hover:underline cursor-pointer"
                        >
                          View Profile <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddCustModal && (
        <CustomerModal 
          onClose={() => setShowAddCustModal(false)}
          onCustomerCreated={(newCust) => openCustomerProfile(newCust.id)}
        />
      )}

    </div>
  );
};
