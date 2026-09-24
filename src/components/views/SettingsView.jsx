import React, { useState, useEffect } from 'react';
import { 
  Store, 
  FileText, 
  Scissors, 
  Palette, 
  Database, 
  Check, 
  Moon, 
  Sun, 
  Save, 
  Info,
  ShieldAlert,
  Layers,
  Plus,
  Edit3,
  Trash2,
  X,
  Receipt,
  Tag,
  MessageSquare,
  RefreshCw,
  Send,
  AlertCircle,
  FileSpreadsheet,
  ExternalLink,
  Unlink,
  CheckCircle2
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { WorkflowEditorModal } from '../modals/WorkflowEditorModal';
import { messagingService } from '../../services/messaging';

export const SettingsView = () => {
  const { 
    settings, 
    setSettings, 
    theme, 
    toggleTheme, 
    setThemeMode, 
    services, 
    addService,
    editService,
    deleteService,
    productionStatuses, 
    addProductionStatus, 
    deleteProductionStatus,
    expenses,
    expenseCategories,
    addExpense,
    deleteExpense,
    addExpenseCategory,
    deactivateExpenseCategory,
    userRole,
    googleIntegration,
    connectGoogleAccount,
    syncGoogleSheetsNow,
    disconnectGoogleAccount,
    showToast 
  } = useShop();

  const [isSyncing, setIsSyncing] = useState(false);

  const [shopName, setShopName] = useState(settings.shopName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [gstNumber, setGstNumber] = useState(settings.gstNumber);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(settings.nextInvoiceNumber);

  // Workflow Modal state
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // New Status State
  const [newStatusName, setNewStatusName] = useState('');

  // Service Catalog Edit State
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editSvcName, setEditSvcName] = useState('');
  const [editSvcRate, setEditSvcRate] = useState('');
  
  // New Service Add State
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcRate, setNewSvcRate] = useState('');
  const [newSvcCategory, setNewSvcCategory] = useState('Women');

  // Expense Management State
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expMethod, setExpMethod] = useState('CASH');
  const [expDescription, setExpDescription] = useState('');

  // Category Add State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Notification Logs State
  const [notifLogs, setNotifLogs] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchNotifLogs = async () => {
    setLoadingNotifs(true);
    try {
      const data = await messagingService.getNotificationHistory('a1000000-0000-0000-0000-000000000001');
      if (data) setNotifLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifLogs();
  }, []);

  const handleSaveSettings = (e) => {
    if (e) e.preventDefault();
    setSettings(prev => ({
      ...prev,
      shopName,
      phone,
      address,
      gstNumber,
      invoicePrefix,
      nextInvoiceNumber: parseInt(nextInvoiceNumber) || prev.nextInvoiceNumber
    }));
    showToast("Settings Saved", "Shop preferences updated successfully", "success");
  };

  const handleAddStatus = (e) => {
    e.preventDefault();
    if (!newStatusName.trim()) return;
    addProductionStatus(newStatusName.trim());
    setNewStatusName('');
  };

  const handleStartEditService = (svc) => {
    setEditingServiceId(svc.id);
    setEditSvcName(svc.name);
    setEditSvcRate(svc.defaultRate);
  };

  const handleSaveServiceEdit = (svcId) => {
    editService(svcId, { name: editSvcName, defaultRate: editSvcRate });
    setEditingServiceId(null);
  };

  const handleCreateService = (e) => {
    e.preventDefault();
    if (!newSvcName.trim()) return;
    addService({
      name: newSvcName.trim(),
      defaultRate: newSvcRate,
      category: newSvcCategory
    });
    setNewSvcName('');
    setNewSvcRate('');
    setShowAddServiceForm(false);
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    const val = parseFloat(expAmount);
    if (isNaN(val) || val <= 0) {
      showToast("Invalid Amount", "Expense amount must be greater than zero.", "warning");
      return;
    }

    const res = await addExpense({
      amount: val,
      expenseDate: expDate,
      categoryId: expCategoryId || null,
      paymentMethod: expMethod,
      description: expDescription
    });

    if (res?.success) {
      setExpAmount('');
      setExpDescription('');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await addExpenseCategory(newCategoryName.trim());
    if (res?.success) {
      setNewCategoryName('');
    }
  };

  const handleRetryNotif = async (notif) => {
    showToast("Retrying WhatsApp Dispatch", `Re-sending message to ${notif.recipient}...`, "info");
    const res = await messagingService.retryNotification(notif);
    if (res?.success) {
      showToast("Dispatch Success", "Notification successfully sent.", "success");
      fetchNotifLogs();
    } else {
      showToast("Dispatch Failed", res?.error || "Retry failed.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
            Shop Settings & Control Center
          </h2>
          <p className="text-xs text-[#777777] mt-1">
            Configure shop profile, invoice numbering, production workflow, rate card, expenses and WhatsApp notification logs.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth cursor-pointer"
        >
          <Save className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Save Preferences
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Section 1: Shop Profile */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Shop Profile</h3>
              <p className="text-xs text-[#777777]">Appears on printed receipts and WhatsApp messages</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#777777] mb-1">Shop Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">GST / Tax Number (Optional)</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Invoice Settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Invoice Settings</h3>
              <p className="text-xs text-[#777777]">Set invoice prefix and sequential auto-numbering</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">Next Invoice Number</label>
              <input
                type="number"
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: WhatsApp Communication Audit Logs */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#202020] text-white">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#202020] dark:text-white">WhatsApp & Notification Audit Logs</h3>
                <p className="text-xs text-[#777777]">Inspect delivery status history (SENT, DELIVERED, READ, FAILED) & retry failed dispatches</p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchNotifLogs}
              className="p-2 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] text-[#777777] hover:text-[#202020] dark:hover:text-white cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loadingNotifs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                {notifLogs.length > 0 ? (
                  notifLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F5F5F5] dark:hover:bg-[#252525]">
                      <td className="py-2.5 px-3 font-medium text-[#202020] dark:text-white whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#202020] dark:text-white">{log.type}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block text-[#202020] dark:text-white">{log.customers?.name || 'Customer'}</span>
                        <span className="text-[10px] text-[#777777]">{log.recipient}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SENT' || log.status === 'DELIVERED' || log.status === 'READ'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : (log.status === 'DEMO_MODE' ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600')
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {log.status === 'FAILED' && (
                          <button
                            type="button"
                            onClick={() => handleRetryNotif(log)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-xs text-[#777777]">
                      No WhatsApp notification logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Expense Ledger & Categories */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Shop Expenses & Categories</h3>
              <p className="text-xs text-[#777777]">Log daily operational costs (Rent, Electricity, Fabric, Maintenance) & manage categories</p>
            </div>
          </div>

          {/* New Expense Entry Form */}
          <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-3">
            <h4 className="font-bold text-xs text-[#202020] dark:text-white uppercase tracking-wider">Log New Expense Entry</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#777777] mb-1">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#777777] mb-1">Expense Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#777777] mb-1">Category</label>
                <select
                  value={expCategoryId}
                  onChange={(e) => setExpCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                >
                  <option value="">General / Uncategorized</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#777777] mb-1">Payment Method</label>
                <select
                  value={expMethod}
                  onChange={(e) => setExpMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#777777] mb-1">Description / Notes</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Electricity bill for September"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateExpense}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-smooth cursor-pointer"
                  >
                    + Log Expense
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Categories Manager */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-[#202020] dark:text-white flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-600" /> Expense Categories
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Category Name (e.g. Packaging, Machine Maintenance)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                className="px-4 py-2 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs shadow-xs transition-smooth cursor-pointer"
              >
                + Add Category
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {expenseCategories.map(cat => (
                <span 
                  key={cat.id} 
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#202020] dark:text-white"
                >
                  {cat.name}
                  <button
                    type="button"
                    onClick={() => deactivateExpenseCategory(cat.id)}
                    className="text-[#777777] hover:text-red-500 cursor-pointer"
                    title="Deactivate category"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Expenses Log Table */}
          <div className="space-y-2 pt-2">
            <h4 className="font-bold text-xs text-[#202020] dark:text-white">Recent Expense Records</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
                  {expenses.length > 0 ? (
                    expenses.slice(0, 10).map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#F5F5F5] dark:hover:bg-[#252525]">
                        <td className="py-2.5 px-3 font-medium text-[#202020] dark:text-white">{exp.expense_date}</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-600">
                          {exp.expense_categories?.name || 'General'}
                        </td>
                        <td className="py-2.5 px-3 text-[#777777] max-w-xs truncate">{exp.description || '—'}</td>
                        <td className="py-2.5 px-3 font-medium text-[#777777]">{exp.payment_method}</td>
                        <td className="py-2.5 px-3 font-bold text-right text-[#202020] dark:text-white">₹{exp.amount}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteExpense(exp.id)}
                            className="p-1 text-[#777777] hover:text-red-500 cursor-pointer"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-xs text-[#777777]">
                        No expenses logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Section 5: Service Catalog */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#202020] text-white">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#202020] dark:text-white">Tailoring Service Catalog & Default Rates</h3>
                <p className="text-xs text-[#777777]">Manage default catalog rates pre-filled during new invoice creation</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddServiceForm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs shadow-xs hover:opacity-90 transition-smooth cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Service
            </button>
          </div>

          {/* Add Service Inline Form */}
          {showAddServiceForm && (
            <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#202020] dark:text-white uppercase tracking-wider">New Catalog Service</span>
                <button
                  type="button"
                  onClick={() => setShowAddServiceForm(false)}
                  className="p-1 text-[#777777] hover:text-[#202020]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#777777] mb-1">Service Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Designer Blouse"
                    value={newSvcName}
                    onChange={(e) => setNewSvcName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#777777] mb-1">Default Rate (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 850"
                    value={newSvcRate}
                    onChange={(e) => setNewSvcRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#777777] mb-1">Category</label>
                  <select
                    value={newSvcCategory}
                    onChange={(e) => setNewSvcCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  >
                    <option value="Women">Women</option>
                    <option value="Men">Men</option>
                    <option value="Kids">Kids</option>
                    <option value="Alteration">Alteration</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddServiceForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#777777]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateService}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs"
                >
                  Save Service
                </button>
              </div>
            </div>
          )}

          {/* Service items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((svc) => {
              const isEditing = editingServiceId === svc.id;

              return (
                <div key={svc.id} className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between gap-2">
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editSvcName}
                        onChange={(e) => setEditSvcName(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] text-xs font-bold border"
                      />
                      <input
                        type="number"
                        value={editSvcRate}
                        onChange={(e) => setEditSvcRate(e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] text-xs font-bold border text-right"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveServiceEdit(svc.id)}
                        className="p-1 text-emerald-600"
                        title="Save price"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-bold text-xs text-[#202020] dark:text-white block">{svc.name}</span>
                        <span className="text-[10px] text-[#777777]">{svc.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl">
                          ₹{svc.defaultRate}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEditService(svc)}
                          className="p-1 text-[#777777] hover:text-[#202020] dark:hover:text-white"
                          title="Edit service price"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteService(svc.id)}
                          className="p-1 text-[#777777] hover:text-[#B85C5C]"
                          title="Remove service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </form>

      {/* Section: Google Sheets & Owner Business Data Export (OWNER ONLY) */}
      {userRole === 'OWNER' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[#202020] dark:text-white">Google Sheets Export & Integration</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    googleIntegration?.connected 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {googleIntegration?.connected ? 'CONNECTED' : 'NOT CONNECTED'}
                  </span>
                </div>
                <p className="text-xs text-[#777777]">Synchronize Mohit Tailoring business data directly into your owner Google Spreadsheet</p>
              </div>
            </div>
          </div>

          {googleIntegration?.connected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#252525] border border-[#E2E8F0] dark:border-[#333333] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-[#777777] block">Active Owner Spreadsheet</span>
                    <span className="font-bold text-xs text-[#202020] dark:text-white flex items-center gap-1.5 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {googleIntegration.spreadsheetName || 'Mohit Tailoring — Business Data'}
                    </span>
                  </div>
                  {googleIntegration.spreadsheetUrl && (
                    <a
                      href={googleIntegration.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:underline"
                    >
                      Open Google Sheet <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="text-[11px] text-[#777777] pt-2 border-t border-[#E2E8F0] dark:border-[#333333] flex items-center justify-between">
                  <span>Last Synced: <strong className="text-[#202020] dark:text-white">{googleIntegration.lastSyncedAt ? new Date(googleIntegration.lastSyncedAt).toLocaleString() : 'Never'}</strong></span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">10 Tabs Export Ready</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={async () => {
                    setIsSyncing(true);
                    await syncGoogleSheetsNow();
                    setIsSyncing(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-smooth shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Synchronizing...' : 'Sync Now'}
                </button>

                <button
                  type="button"
                  onClick={disconnectGoogleAccount}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-100 cursor-pointer transition-smooth"
                >
                  <Unlink className="w-3.5 h-3.5" /> Disconnect Link
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#F9FAFB] dark:bg-[#252525] border border-dashed border-[#D1D5DB] dark:border-[#404040] space-y-3">
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                Connect your Google Account to automatically export 10 operational tabs (Dashboard, Customers, Measurements, Orders, Order Items, Payments, Expenses, Services, Production, and WhatsApp Logs) into your private owner spreadsheet.
              </p>
              <button
                type="button"
                onClick={connectGoogleAccount}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 cursor-pointer transition-smooth shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Connect Google Account
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backend / Supabase Connection Notice Card */}
      <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Database className="w-4 h-4 text-emerald-600" />
          Backend & WhatsApp Integration Status
        </div>
        <p className="text-xs leading-relaxed opacity-90">
          This system is connected to Supabase Edge Function <code className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">send-whatsapp</code> and Meta WhatsApp Cloud API (<code className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">notifications</code>).
        </p>
      </div>

      {showWorkflowModal && (
        <WorkflowEditorModal onClose={() => setShowWorkflowModal(false)} />
      )}

    </div>
  );
};
