import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  PlusCircle, 
  Ruler, 
  Calendar, 
  FileText, 
  Check, 
  Edit3, 
  Save, 
  IndianRupee, 
  ChevronRight, 
  ArrowLeft,
  ExternalLink,
  Receipt,
  Scissors,
  Layers,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { GARMENT_MEASUREMENT_TYPES, GARMENT_MEASUREMENT_FIELDS } from '../../data/measurementDefinitions';
import { CustomerModal } from './CustomerModal';
import { WorkflowEditorModal } from './WorkflowEditorModal';
import { Modal } from '../common/Modal';
import { useModalDismiss } from '../../utils/modalUtils';

export const CustomerProfileModal = () => {
  const { 
    customers, 
    invoices, 
    activeProfileCustomerId, 
    closeCustomerProfile, 
    navigateTo, 
    saveCustomerMeasurements, 
    addCustomer,
    deleteCustomer,
    getCustomerStats,
    showToast
  } = useShop();

  // Active popup state inside profile hub: null | 'measurements' | 'orders' | 'order-detail'
  const [activePopup, setActivePopup] = useState(null);
  const [selectedOrderDetailId, setSelectedOrderDetailId] = useState(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editing state for measurements popup
  const [isEditingMeasurements, setIsEditingMeasurements] = useState(false);
  const [activeGarmentTab, setActiveGarmentTab] = useState('gown');
  
  // Local state for measurements edit mode
  const [tempMeasurements, setTempMeasurements] = useState({});
  const [tempNotes, setTempNotes] = useState('');

  // ESC key dismiss for main modal
  useModalDismiss(closeCustomerProfile, Boolean(activeProfileCustomerId) && !activePopup && !showEditCustomerModal);

  // ESC key dismiss for sub-popups
  useModalDismiss(() => setActivePopup(null), Boolean(activePopup));

  if (!activeProfileCustomerId) return null;

  const customer = (customers || []).find(c => c && c.id === activeProfileCustomerId);
  if (!customer) return null;

  const { customerOrders, totalOrders, totalSpent, balance, measurementsCount } = getCustomerStats(customer);

  const handleStartNewOrder = () => {
    closeCustomerProfile();
    navigateTo('new-invoice', { customerId: customer.id });
  };

  const handleOpenMeasurements = () => {
    setTempMeasurements(JSON.parse(JSON.stringify(customer.measurements || {})));
    setTempNotes(customer.notes || '');
    setIsEditingMeasurements(false);
    setActiveGarmentTab('gown');
    setActivePopup('measurements');
  };

  const handleSaveMeasurements = () => {
    GARMENT_MEASUREMENT_TYPES.forEach(type => {
      const typeData = tempMeasurements[type.id] || {};
      saveCustomerMeasurements(customer.id, type.id, typeData, tempNotes);
    });
    setIsEditingMeasurements(false);
    showToast("Measurements Updated", `Saved latest reusable measurements for ${customer.name}`, "success");
  };

  const handleMeasurementFieldChange = (garmentId, key, val) => {
    setTempMeasurements(prev => ({
      ...prev,
      [garmentId]: {
        ...(prev[garmentId] || {}),
        [key]: val
      }
    }));
  };

  const handleOpenOrders = () => {
    setActivePopup('orders');
  };

  const handleOpenOrderDetail = (orderId) => {
    setSelectedOrderDetailId(orderId);
    setActivePopup('order-detail');
  };

  const selectedOrderDetail = (invoices || []).find(inv => inv && inv.id === selectedOrderDetailId);

  // Status badge styling helper (information only)
  const getStatusBadgeClass = (st) => {
    const status = (st || 'PENDING').toUpperCase();
    switch (status) {
      case 'DELIVERED':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300';
      case 'READY':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-300';
      case 'PACKING':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-300';
      case 'STITCHING':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-300';
      case 'CUTTING':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-300';
      default:
        return 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400 border-gray-200';
    }
  };

  // Helper to filter relevant non-empty measurements for display
  const getFilledMeasurements = (measurementsObj) => {
    if (!measurementsObj || typeof measurementsObj !== 'object') return {};
    const result = {};

    Object.entries(measurementsObj).forEach(([garment, fields]) => {
      if (!fields || typeof fields !== 'object') return;
      if (fields.suppliedGarment) {
        result[garment] = { _supplied: true };
        return;
      }
      const filledFields = {};
      Object.entries(fields).forEach(([key, val]) => {
        if (key !== 'suppliedGarment' && val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0' && String(val).trim() !== '-') {
          filledFields[key] = val;
        }
      });
      if (Object.keys(filledFields).length > 0) {
        result[garment] = filledFields;
      }
    });

    return result;
  };

  const filledCustomerMeasurements = getFilledMeasurements(customer.measurements);

  return (
    <>
      <Modal
        isOpen={Boolean(activeProfileCustomerId)}
        onClose={closeCustomerProfile}
        size="lg"
        zIndex={9990}
      >
        
        {/* Header */}
        <div className="p-6 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#202020] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#202020] dark:text-white leading-tight">
                {customer.name.toUpperCase()}
              </h2>
              <p className="text-xs text-[#777777] font-mono mt-0.5">
                {customer.phone} • {customer.address || 'Local Customer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer transition-smooth"
              title="Delete Customer Profile"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <button
              onClick={() => setShowEditCustomerModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
              Edit Customer
            </button>
            <button
              onClick={handleStartNewOrder}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              + New Order
            </button>
            <button
              onClick={closeCustomerProfile}
              className="p-2 rounded-xl text-[#777777] hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Hub Main Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* Customer Notes */}
          {customer.notes && (
            <div className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs">
              <span className="font-bold text-[#777777] uppercase text-[10px] block mb-1">Customer Notes:</span>
              <p className="text-[#202020] dark:text-white">{customer.notes}</p>
            </div>
          )}

          {/* Three Summary Areas Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* 1. Orders Summary Card */}
            <button
              onClick={handleOpenOrders}
              className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] hover:border-blue-500/50 transition-smooth text-center group cursor-pointer"
            >
              <span className="text-[11px] font-bold text-[#777777] uppercase tracking-wider block mb-1">
                Orders
              </span>
              <span className="text-2xl font-bold text-[#202020] dark:text-white block group-hover:text-blue-600 transition-smooth">
                {totalOrders}
              </span>
              <span className="text-[10px] text-blue-600 font-bold underline block mt-1">
                View History
              </span>
            </button>

            {/* 2. Total Spent Summary Card */}
            <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-center">
              <span className="text-[11px] font-bold text-[#777777] uppercase tracking-wider block mb-1">
                Total Spent
              </span>
              <span className="text-xl font-bold text-[#202020] dark:text-white block">
                ₹{totalSpent.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#777777] block mt-1">
                Lifetime Value
              </span>
            </div>

            {/* 3. Balance Summary Card */}
            <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-center">
              <span className="text-[11px] font-bold text-[#777777] uppercase tracking-wider block mb-1">
                Balance
              </span>
              <span className={`text-xl font-bold block ${balance > 0 ? 'text-[#B85C5C]' : 'text-emerald-600'}`}>
                ₹{balance.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#777777] block mt-1">
                {balance > 0 ? 'Outstanding Due' : 'Fully Cleared'}
              </span>
            </div>

          </div>

          {/* Customer Profile Quick Overview List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#777777] flex items-center justify-between">
              <span>Saved Measurements Summary</span>
              <button onClick={handleOpenMeasurements} className="text-emerald-600 hover:underline text-xs capitalize">
                View Full Popup →
              </button>
            </h3>

            {Object.keys(filledCustomerMeasurements).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                {Object.entries(filledCustomerMeasurements).map(([garment, fields]) => (
                  <div key={garment} className="p-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] space-y-1">
                    <span className="font-bold text-[11px] text-[#202020] dark:text-white capitalize block border-b border-[#E3E3E3] dark:border-[#333333] pb-1">
                      {garment}
                    </span>
                    {fields._supplied ? (
                      <div className="text-[11px] font-bold text-emerald-600 py-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Follow customer measurements
                      </div>
                    ) : (
                      <div className="space-y-0.5 text-[11px] text-[#777777]">
                        {Object.entries(fields).slice(0, 4).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="capitalize">{k}:</span>
                            <span className="font-semibold text-[#202020] dark:text-white">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#777777]">No body measurements recorded yet. Click 'Measurements' to add.</p>
            )}
          </div>

          {/* Recent Orders Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#777777]">
                Recent Orders ({customerOrders.length})
              </h3>
              {customerOrders.length > 0 && (
                <button onClick={handleOpenOrders} className="text-xs font-bold text-blue-600 hover:underline">
                  View All Orders →
                </button>
              )}
            </div>

            {customerOrders.length > 0 ? (
              <div className="space-y-2">
                {customerOrders.slice(0, 3).map(order => (
                  <div
                    key={order.id}
                    onClick={() => handleOpenOrderDetail(order.id)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] hover:border-[#202020]/30 transition-smooth cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-[#202020] dark:text-white">
                        <span>{order.id}</span>
                        <span className="text-[#777777] font-normal">• {order.date}</span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getStatusBadgeClass(order.status)}`}>
                          {order.status || 'PENDING'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#777777] mt-0.5">
                        {(order.services || []).map(s => s.name).join(', ')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm text-[#202020] dark:text-white block">₹{order.total}</span>
                      <span className={`text-[10px] font-bold ${order.balance > 0 ? 'text-[#B85C5C]' : 'text-emerald-600'}`}>
                        {order.balance > 0 ? `Due: ₹${order.balance}` : 'Paid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#777777] p-4 text-center rounded-xl bg-[#F5F5F5] dark:bg-[#252525]">
                No orders found for this customer.
              </p>
            )}
          </div>

        </div>

      </Modal>

      {/* ================================================== */}
      {/* 3. MEASUREMENTS POPUP MODAL */}
      {/* ================================================== */}
      <Modal 
        isOpen={activePopup === 'measurements'}
        onClose={() => setActivePopup(null)}
        size="md"
        zIndex={10010}
      >
            
            {/* Popup Header */}
            <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020]">
                  <Ruler className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#202020] dark:text-white">Customer Measurements</h3>
                  <p className="text-xs text-[#777777]">{customer.name} ({customer.phone})</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isEditingMeasurements ? (
                  <button
                    onClick={handleSaveMeasurements}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingMeasurements(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Measurements
                  </button>
                )}
                <button
                  onClick={() => setActivePopup(null)}
                  className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Popup Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Category tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] overflow-x-auto">
                {GARMENT_MEASUREMENT_TYPES.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveGarmentTab(tab.id)}
                    className={`flex-1 min-w-[70px] py-2 px-3 text-xs font-bold rounded-xl transition-smooth whitespace-nowrap cursor-pointer ${
                      activeGarmentTab === tab.id
                        ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                        : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View or Edit mode */}
              {isEditingMeasurements ? (
                /* EDIT MODE */
                <div className="space-y-4">
                  {activeGarmentTab === 'custom' ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#777777] uppercase">Custom Fitting Remarks</label>
                      <textarea
                        rows="3"
                        value={(tempMeasurements.custom && tempMeasurements.custom.notes) || ''}
                        onChange={(e) => handleMeasurementFieldChange('custom', 'notes', e.target.value)}
                        className="w-full p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                        placeholder="Enter fitting instructions..."
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Supplied Garment Toggle */}
                      <div className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
                        <label className="flex items-center gap-2 font-bold text-xs text-[#202020] dark:text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(tempMeasurements[activeGarmentTab]?.suppliedGarment)}
                            onChange={(e) => handleMeasurementFieldChange(activeGarmentTab, 'suppliedGarment', e.target.checked)}
                            className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                          />
                          <span>Follow customer measurements</span>
                        </label>
                      </div>

                      {Boolean(tempMeasurements[activeGarmentTab]?.suppliedGarment) ? (
                        <div className="p-5 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2 animate-fade-in">
                          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>Follow customer measurements</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(GARMENT_MEASUREMENT_FIELDS[activeGarmentTab] || []).map(f => (
                            <div key={f.key} className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-1">
                              <span className="text-[10px] font-bold text-[#777777] uppercase block">{f.label}</span>
                              <input
                                type="text"
                                placeholder="0"
                                value={(tempMeasurements[activeGarmentTab] && tempMeasurements[activeGarmentTab][f.key]) || ''}
                                onChange={(e) => handleMeasurementFieldChange(activeGarmentTab, f.key, e.target.value)}
                                className="w-full px-2 py-1 rounded-lg text-xs font-bold bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white border border-[#E3E3E3] dark:border-[#333333] focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-[#777777] uppercase mb-1">Customer General Notes</label>
                    <textarea
                      rows="2"
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
                      placeholder="Special instructions or preferences..."
                    />
                  </div>
                </div>
              ) : (
                /* VIEW MODE - ONLY SHOW MEASUREMENTS WITH ACTUAL VALUES OR FOLLOW CUSTOMER MEASUREMENTS */
                <div className="space-y-4">
                  {activeGarmentTab === 'custom' ? (
                    <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] text-xs">
                      <span className="font-bold text-[#777777] block mb-1">Fitting Remarks:</span>
                      <p className="text-[#202020] dark:text-white">
                        {(customer.measurements && customer.measurements.custom && customer.measurements.custom.notes) || "No custom remarks entered."}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const categoryData = (customer.measurements && customer.measurements[activeGarmentTab]) || {};
                      
                      if (categoryData.suppliedGarment) {
                        return (
                          <div className="p-5 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2 animate-fade-in">
                            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>Follow customer measurements</span>
                          </div>
                        );
                      }

                      const fields = GARMENT_MEASUREMENT_FIELDS[activeGarmentTab] || [];
                      const filled = fields.filter(f => {
                        const val = categoryData[f.key];
                        return val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0' && String(val).trim() !== '-';
                      });

                      if (filled.length === 0) {
                        return (
                          <div className="p-8 text-center rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-dashed border-[#E3E3E3] dark:border-[#333333]">
                            <p className="text-xs text-[#777777]">No active measurements recorded for {activeGarmentTab.toUpperCase()}.</p>
                            <button
                              onClick={() => setIsEditingMeasurements(true)}
                              className="mt-3 px-4 py-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020] text-xs font-bold cursor-pointer"
                            >
                              + Enter Measurements
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {filled.map(f => (
                            <div key={f.key} className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-1 shadow-xs">
                              <span className="text-[10px] font-bold text-[#777777] uppercase block">{f.label}</span>
                              <span className="text-lg font-bold text-[#202020] dark:text-white block">
                                {categoryData[f.key]}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

            </div>

      </Modal>

      {/* ================================================== */}
      {/* 7. ORDERS POPUP MODAL */}
      {/* ================================================== */}
      <Modal 
        isOpen={activePopup === 'orders'}
        onClose={() => setActivePopup(null)}
        size="md"
        zIndex={10010}
      >
            
            {/* Header */}
            <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020]">
                  <FileText className="w-5 h-5 text-blue-400 dark:text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#202020] dark:text-white">Customer Orders</h3>
                  <p className="text-xs text-[#777777]">{customer.name} ({customerOrders.length} total orders)</p>
                </div>
              </div>

              <button
                onClick={() => setActivePopup(null)}
                className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Orders List Body */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {customerOrders.length > 0 ? (
                customerOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => handleOpenOrderDetail(order.id)}
                    className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] hover:border-[#202020] transition-smooth cursor-pointer space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#202020] dark:text-white">{order.id}</span>
                        <span className="text-xs text-[#777777]">• Date: {order.date}</span>
                        {order.dueDate && <span className="text-xs text-[#777777]">• Delivery: {order.dueDate}</span>}
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] border self-start sm:self-auto ${getStatusBadgeClass(order.status)}`}>
                        {order.status || 'PENDING'}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-[#202020] dark:text-[#F5F5F5]">
                      {(order.services || []).map(s => s.name).join(', ')}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span>Total: <strong className="text-[#202020] dark:text-white">₹{order.total}</strong></span>
                      <span>Paid: <strong className="text-emerald-600">₹{order.advancePaid}</strong></span>
                      <span>Balance: <strong className={order.balance > 0 ? "text-[#B85C5C]" : "text-emerald-600"}>₹{order.balance}</strong></span>
                      <span className="font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                        Details →
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-[#777777]">
                  No orders recorded for this customer.
                </div>
              )}
            </div>

      </Modal>

      {/* ================================================== */}
      {/* 8. ORDER DETAILS POPUP MODAL (FROM CUSTOMER PROFILE) */}
      {/* ================================================== */}
      {activePopup === 'order-detail' && selectedOrderDetail && (
        <Modal 
          isOpen={true}
          onClose={() => setActivePopup(null)}
          size="md"
          zIndex={10030}
        >
              
              {/* Header */}
              <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActivePopup('orders')}
                    className="p-1.5 rounded-lg text-[#777777] hover:bg-[#EEEEEE] dark:hover:bg-[#282828]"
                    title="Back to orders list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-bold text-base text-[#202020] dark:text-white flex items-center gap-2">
                      Order Details #{selectedOrderDetail.id}
                    </h3>
                    <p className="text-xs text-[#777777]">Date: {selectedOrderDetail.date} • Delivery: {selectedOrderDetail.dueDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const orderToEdit = selectedOrderDetail;
                      setActivePopup(null);
                      closeCustomerProfile();
                      navigateTo('new-invoice', { orderToEdit });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 transition-smooth cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> Edit Order
                  </button>
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${getStatusBadgeClass(selectedOrderDetail.status)}`}>
                    Status: {selectedOrderDetail.status || 'PENDING'}
                  </span>
                  <button
                    onClick={() => setActivePopup(null)}
                    className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Order Details Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                
                {/* Customer Info */}
                <div className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-[#777777] uppercase block">Customer Name & Phone</span>
                    <span className="font-bold text-sm text-[#202020] dark:text-white">{selectedOrderDetail.customerName}</span>
                  </div>
                  <span className="font-mono text-xs text-[#777777]">{selectedOrderDetail.phone}</span>
                </div>

                {/* 1. Services Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777]">Services & Items Ordered</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px]">
                          <th className="py-2 px-2">Service Name</th>
                          <th className="py-2 px-2">Qty</th>
                          <th className="py-2 px-2">Price</th>
                          <th className="py-2 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                        {(selectedOrderDetail.services || []).map((s, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-2 font-bold text-[#202020] dark:text-white">{s.name}</td>
                            <td className="py-2.5 px-2 text-[#777777]">{s.qty}</td>
                            <td className="py-2.5 px-2 text-[#777777]">₹{s.rate}</td>
                            <td className="py-2.5 px-2 font-bold text-right text-[#202020] dark:text-white">₹{s.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Associated Measurements (ONLY NON-EMPTY MEASUREMENTS FOR THIS ORDER) */}
                {selectedOrderDetail.measurements && (
                  (() => {
                    const filledOrderMeasurements = getFilledMeasurements(selectedOrderDetail.measurements);
                    if (Object.keys(filledOrderMeasurements).length === 0) return null;

                    return (
                      <div className="space-y-2">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777]">
                          Order Associated Measurements
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {Object.entries(filledOrderMeasurements).map(([garment, fields]) => (
                            <div key={garment} className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333]">
                              <span className="font-bold text-[10px] uppercase text-[#777777] block pb-1 border-b border-[#E3E3E3] dark:border-[#333333] capitalize">
                                {garment}
                              </span>
                              {fields._supplied ? (
                                <div className="text-[11px] font-bold text-emerald-600 py-1">
                                  Customer mentioned measurements
                                </div>
                              ) : (
                                <div className="space-y-0.5 pt-1">
                                  {Object.entries(fields).map(([k, v]) => {
                                    if (k === 'suppliedGarment' || k === '_supplied') return null;
                                    return (
                                      <div key={k} className="flex justify-between text-[11px]">
                                        <span className="capitalize text-[#777777]">{k}:</span>
                                        <span className="font-bold text-[#202020] dark:text-white">{v}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 3. Fitting Notes / Special Instructions */}
                {selectedOrderDetail.notes && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777]">Order Notes & Instructions</h4>
                    <p className="p-3.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] text-xs text-[#202020] dark:text-white">
                      {selectedOrderDetail.notes}
                    </p>
                  </div>
                )}

                {/* 4. Billing & Payment Summary */}
                <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] space-y-2 text-xs">
                  <div className="flex justify-between text-[#777777]">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-[#202020] dark:text-white">₹{selectedOrderDetail.subtotal}</span>
                  </div>
                  {selectedOrderDetail.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{selectedOrderDetail.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-[#E3E3E3] dark:border-[#333333] text-[#202020] dark:text-white">
                    <span>Total:</span>
                    <span>₹{selectedOrderDetail.total}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold pt-1">
                    <span>Paid ({selectedOrderDetail.paymentMode || 'Cash'}):</span>
                    <span>₹{selectedOrderDetail.advancePaid}</span>
                  </div>
                  {selectedOrderDetail.extraPaid > 0 ? (
                    <div className="flex justify-between font-bold text-xs text-emerald-600 pt-1 border-t border-dashed border-[#E3E3E3] dark:border-[#333333]">
                      <span>Extra Paid / Credit:</span>
                      <span>₹{selectedOrderDetail.extraPaid}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-bold text-xs text-[#B85C5C] pt-1 border-t border-dashed border-[#E3E3E3] dark:border-[#333333]">
                      <span>Balance:</span>
                      <span>₹{selectedOrderDetail.balance}</span>
                    </div>
                  )}
                </div>

              </div>

        </Modal>
      )}

      {/* EDIT CUSTOMER PROFILE MODAL */}
      {showEditCustomerModal && (
        <CustomerModal
          customerToEdit={customer}
          onClose={() => setShowEditCustomerModal(false)}
        />
      )}

      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(false)}
          size="sm"
          maxWidthClass="max-w-md"
          zIndex={10040}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#202020] dark:text-white">Delete Customer?</h3>
                <p className="text-xs text-[#777777]">Permanent Action</p>
              </div>
            </div>

            <p className="text-xs text-[#202020] dark:text-gray-300 leading-relaxed">
              This will permanently delete this customer profile (<strong className="font-bold text-[#202020] dark:text-white">{customer.name}</strong>) and all their saved measurements. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3E3E3] dark:border-[#333333]">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#777777] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCustomer(customer.id);
                  setShowDeleteConfirm(false);
                  closeCustomerProfile();
                  showToast("Customer Deleted", `${customer.name} profile deleted`, "info");
                }}
                className="px-5 py-2.5 rounded-xl bg-[#B85C5C] hover:bg-red-700 text-white font-bold text-xs shadow-md cursor-pointer transition-smooth"
              >
                Delete Customer
              </button>
            </div>
          </div>
        </Modal>
      )}

    </>
  );
};
