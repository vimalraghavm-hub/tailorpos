import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Receipt, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  IndianRupee, 
  Check, 
  RefreshCw, 
  Copy,
  Tag,
  CreditCard,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Pin,
  Layers,
  AlertCircle,
  Clock,
  Save
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { getKolkataDateStr } from '../../utils/dateUtils';
import { Modal } from '../common/Modal';

export const ExpenseModal = ({ isOpen = true, onClose }) => {
  const { 
    expenses = [], 
    expenseCategories = [], 
    addExpense, 
    updateExpense, 
    deleteExpense, 
    addExpenseCategory,
    updateExpenseCategory,
    deactivateExpenseCategory,
    showToast,
    userRole = 'OWNER',
    hasPermission,
    loadExpenses,
    loadAnalytics,
    stats = {}
  } = useShop();

  useModalDismiss(onClose, isOpen);

  const canManage = hasPermission ? hasPermission('MANAGE_EXPENSES') : userRole === 'OWNER';

  const todayStr = useMemo(() => getKolkataDateStr(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const today = getKolkataDateStr(new Date());
    const [y, m, d] = today.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    return getKolkataDateStr(prev);
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Form State
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Management Drawer Toggle State
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Unsaved Yesterday's Copied Drafts State
  const [yesterdayDrafts, setYesterdayDrafts] = useState([]);

  // Shop Key for Presets Storage
  const shopId = 'a1000000-0000-0000-0000-000000000001';
  const STORAGE_KEY = `mohit_quick_expense_presets_${shopId}`;

  // Quick Preset Templates State with Local Storage Persistence
  const [quickTemplates, setQuickTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      { id: 'preset-1', name: 'Tea & Snacks', category: 'Tea & Snacks', method: 'CASH', desc: 'Daily shop tea & refreshments' },
      { id: 'preset-2', name: 'Packaging Materials', category: 'Packaging', method: 'UPI', desc: 'Garment bags & covers' },
      { id: 'preset-3', name: 'Electricity Bill', category: 'Electricity', method: 'UPI', desc: 'Shop monthly power bill' },
      { id: 'preset-4', name: 'Thread & Trims', category: 'Materials', method: 'CASH', desc: 'Sewing thread & zippers' },
      { id: 'preset-5', name: 'Transportation', category: 'Travel', method: 'CASH', desc: 'Local delivery / travel expense' },
      { id: 'preset-6', name: 'Rent', category: 'Rent', method: 'NETBANKING', desc: 'Shop monthly rent' }
    ];
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [showAddPresetInput, setShowAddPresetInput] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');

  if (!isOpen) return null;

  // Save Presets Helper
  const saveQuickTemplates = (newTemplates) => {
    setQuickTemplates(newTemplates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
    } catch (_) {}
  };

  // Filter actual saved expenses for selected date
  const filteredExpenses = (expenses || []).filter(e => {
    if (!e.expense_date) return false;
    return e.expense_date.startsWith(selectedDate);
  });

  // Official calculated totals (excludes unsaved drafts)
  const totalDailyExpense = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const todayExpensesOfficial = (expenses || [])
    .filter(e => {
      const eDate = e.expense_date ? e.expense_date.split('T')[0] : getKolkataDateStr(e.created_at);
      return eDate === todayStr;
    })
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Category totals breakdown for selected date
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(exp => {
      const catObj = (expenseCategories || []).find(c => c.id === exp.category_id || c.name === exp.category_id);
      const name = exp.expense_categories?.name || catObj?.name || 'General';
      map[name] = (map[name] || 0) + (parseFloat(exp.amount) || 0);
    });
    return map;
  }, [filteredExpenses, expenseCategories]);

  // Yesterday's Expenses count for repeat action
  const yesterdaySavedExpenses = (expenses || []).filter(e => {
    if (!e.expense_date) return false;
    return e.expense_date.startsWith(yesterdayStr);
  });

  // Action: Load Yesterday's Expenses as Unsaved Drafts for Today
  const handleRepeatYesterdayExpenses = () => {
    if (yesterdaySavedExpenses.length === 0) {
      if (showToast) showToast("No Yesterday Expenses", `No expense records found for yesterday (${yesterdayStr}).`, "info");
      return;
    }

    const drafts = yesterdaySavedExpenses.map((exp, idx) => {
      const catObj = (expenseCategories || []).find(c => c.id === exp.category_id || c.name === exp.category_id);
      const catName = exp.expense_categories?.name || catObj?.name || 'General';
      return {
        draftId: `draft-${Date.now()}-${idx}`,
        amount: String(exp.amount || ''),
        categoryId: exp.category_id || '',
        categoryName: catName,
        paymentMethod: exp.payment_method || 'CASH',
        description: exp.description || `${catName} (Copied from ${yesterdayStr})`
      };
    });

    setYesterdayDrafts(drafts);
    if (showToast) {
      showToast("Drafts Loaded", `Loaded ${drafts.length} expense entries from yesterday as drafts. Review & click Save below to persist.`, "info");
    }
  };

  // Draft editing helpers
  const handleUpdateDraft = (draftId, field, value) => {
    setYesterdayDrafts(prev => prev.map(d => d.draftId === draftId ? { ...d, [field]: value } : d));
  };

  const handleRemoveDraft = (draftId) => {
    setYesterdayDrafts(prev => prev.filter(d => d.draftId !== draftId));
  };

  // Confirm and Save All Drafts to Supabase
  const handleSaveAllDrafts = async () => {
    if (yesterdayDrafts.length === 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const draft of yesterdayDrafts) {
        const numAmt = parseFloat(draft.amount);
        if (isNaN(numAmt) || numAmt <= 0) continue;

        const res = await addExpense({
          amount: numAmt,
          categoryId: draft.categoryId || null,
          expenseDate: todayStr,
          paymentMethod: (draft.paymentMethod || 'CASH').toUpperCase(),
          description: draft.description || ''
        });

        if (res?.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      setYesterdayDrafts([]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      }
      if (showToast) {
        if (failCount === 0) {
          showToast("Expenses Saved", `Successfully created ${successCount} expense entries for today.`, "success");
        } else {
          showToast("Partial Import", `Saved ${successCount} entries, ${failCount} failed.`, "warning");
        }
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Save Error", err.message || "Failed to save draft expenses.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preset Handlers
  const handleApplyPreset = (preset) => {
    resetForm();
    setDescription(preset.desc || `${preset.name} expense`);
    setPaymentMethod(preset.method || 'CASH');
    const catSearchName = preset.category || preset.name;
    const matchedCat = (expenseCategories || []).find(c => c.name.toLowerCase() === catSearchName.toLowerCase());
    if (matchedCat) {
      setCategoryId(matchedCat.id);
    } else {
      setCustomCategoryName(catSearchName);
    }
    if (showToast) showToast("Preset Applied", `Pre-filled form with "${preset.name}". Enter amount & click Save.`, "info");
  };

  const handleAddPresetFromCategory = (catName, catId = null) => {
    if (!catName) return;
    if (quickTemplates.some(t => t.name.toLowerCase() === catName.toLowerCase())) {
      if (showToast) showToast("Preset Exists", `Quick preset for "${catName}" already exists.`, "info");
      return;
    }

    const newPreset = {
      id: `preset-${Date.now()}`,
      name: catName,
      category: catName,
      categoryId: catId,
      method: 'CASH',
      desc: `${catName} expense`
    };

    saveQuickTemplates([...quickTemplates, newPreset]);
    if (showToast) showToast("Preset Created", `Added "${catName}" to Quick Presets.`, "success");
  };

  const handleDropCategory = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const parsed = JSON.parse(dataStr);
      handleAddPresetFromCategory(parsed.name || dataStr, parsed.id || null);
    } catch (err) {
      console.error("Drop category error:", err);
    }
  };

  const handleDeletePresetShortcut = (presetId, e) => {
    if (e) e.stopPropagation();
    const updated = quickTemplates.filter(t => t.id !== presetId);
    saveQuickTemplates(updated);
    if (showToast) showToast("Preset Removed", "Removed quick preset shortcut.", "info");
  };

  const handleAddManualPreset = (e) => {
    if (e) e.preventDefault();
    if (!newPresetTitle.trim()) return;
    handleAddPresetFromCategory(newPresetTitle.trim());
    setNewPresetTitle('');
    setShowAddPresetInput(false);
  };

  // Form Reset & Submission
  const resetForm = () => {
    setEditingExpenseId(null);
    setAmount('');
    setCategoryId('');
    setCustomCategoryName('');
    setPaymentMethod('CASH');
    setDescription('');
  };

  const handleStartEdit = (exp) => {
    setEditingExpenseId(exp.id);
    setAmount(String(exp.amount || ''));
    setCategoryId(exp.category_id || '');
    setPaymentMethod(exp.payment_method || 'CASH');
    setDescription(exp.description || '');
    if (exp.expense_date) {
      setSelectedDate(exp.expense_date.split('T')[0]);
    }
  };

  const handleReuseExpense = (exp) => {
    setEditingExpenseId(null);
    setAmount(String(exp.amount || ''));
    setCategoryId(exp.category_id || '');
    setPaymentMethod(exp.payment_method || 'CASH');
    setDescription(exp.description || '');
    if (showToast) showToast("Expense Pre-filled", `Pre-filled form for ${selectedDate}. Update amount or notes & click Save.`, "info");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      if (showToast) showToast("Access Denied", "Only Owner accounts can manage expenses.", "warning");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      if (showToast) showToast("Validation Error", "Please enter a valid expense amount greater than 0.", "warning");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let finalCatId = categoryId;
      if (customCategoryName.trim()) {
        const catRes = await addExpenseCategory(customCategoryName.trim());
        if (catRes?.success && catRes?.data?.id) {
          finalCatId = catRes.data.id;
        }
      }

      const payload = {
        amount: numAmount,
        categoryId: finalCatId || null,
        expenseDate: selectedDate,
        paymentMethod: paymentMethod.toUpperCase(),
        description: description.trim()
      };

      let res;
      if (editingExpenseId) {
        res = await updateExpense(editingExpenseId, payload);
      } else {
        res = await addExpense(payload);
      }

      if (res?.success) {
        resetForm();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shop-data-updated'));
        }
      }
    } catch (err) {
      console.error("Expense submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expId) => {
    if (!canManage) {
      if (showToast) showToast("Access Denied", "Only Owner accounts can delete expenses.", "warning");
      return;
    }
    if (window.confirm("Are you sure you want to permanently delete this expense entry?")) {
      const res = await deleteExpense(expId);
      if (res?.success) {
        if (editingExpenseId === expId) resetForm();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shop-data-updated'));
        }
      }
    }
  };

  // Category Manager Handlers
  const handleCreateCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const res = await addExpenseCategory(newCatInput.trim());
    if (res?.success) setNewCatInput('');
  };

  const handleSaveRenameCategory = async (catId) => {
    if (!editingCatName.trim()) return;
    if (updateExpenseCategory) {
      await updateExpenseCategory(catId, editingCatName.trim());
    }
    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleDeactivateCategory = async (catId) => {
    if (window.confirm("Deactivate this category? Existing historical expenses will safely retain their category name.")) {
      await deactivateExpenseCategory(catId);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      maxWidthClass="max-w-4xl"
      zIndex={10020}
    >
      {/* Header */}
      <div className="p-3.5 sm:p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#202020] dark:text-white leading-tight">
              Expense Management Ledger
            </h3>
            <p className="text-[11px] sm:text-xs text-[#777777]">
              Simple daily shop expense tracking, presets & real-time analytics
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">

        {!canManage && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Notice: Worker account logged in. Viewing active expenses in read-only mode.</span>
          </div>
        )}

        {/* SECTION 1: QUICK PRESETS & REPEAT YESTERDAY'S EXPENSES */}
        <div className="space-y-3 p-4 rounded-2xl bg-[#F5F5F5]/70 dark:bg-[#252525]/70 border border-[#E3E3E3] dark:border-[#333333]">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#202020] dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> 1. Quick Add & Repeat Presets
              </h4>
              <p className="text-[11px] text-[#777777]">
                One-tap expense presets or repeat yesterday's shop entries
              </p>
            </div>

            {/* Repeat Yesterday's Expenses Action */}
            {canManage && (
              <button
                type="button"
                onClick={handleRepeatYesterdayExpenses}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-smooth cursor-pointer shrink-0"
                title={`Copy yesterday's (${yesterdayStr}) saved expenses into today's draft queue`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repeat Yesterday's Expenses ({yesterdaySavedExpenses.length})</span>
              </button>
            )}
          </div>

          {/* Dedicated Preset Drop Target Box & Shortcut Chips */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#777777] uppercase tracking-wider block">
                Saved Presets (Tap to Pre-fill Form):
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowAddPresetInput(!showAddPresetInput)}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Custom Preset
                </button>
              )}
            </div>

            {showAddPresetInput && (
              <form onSubmit={handleAddManualPreset} className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 animate-fade-in">
                <input
                  type="text"
                  placeholder="Preset title (e.g. Workshop Chai / Delivery)"
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Preset
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPresetInput(false)}
                  className="p-1 text-[#777777] hover:text-[#202020] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Drop Target Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDropCategory}
              className={`p-3 rounded-2xl border transition-all flex flex-wrap items-center gap-2 min-h-[50px] ${
                isDragOver
                  ? 'border-dashed border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30 scale-[1.01]'
                  : 'border-[#E3E3E3] dark:border-[#333333] bg-white dark:bg-[#1E1E1E]'
              }`}
            >
              {quickTemplates.length > 0 ? (
                quickTemplates.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleApplyPreset(p)}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 shrink-0 transition-smooth cursor-pointer shadow-2xs select-none"
                  >
                    <span>+ {p.name}</span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePresetShortcut(p.id, e)}
                        className="p-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-300 opacity-60 group-hover:opacity-100 transition-opacity ml-1"
                        title="Remove preset shortcut"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-xs text-[#777777] italic py-1">
                  📥 Drop category chip here to create a quick preset.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: YESTERDAY'S UNCONFIRMED DRAFTS QUEUE */}
        {yesterdayDrafts.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800/60 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/50 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Copied Yesterday's Expenses ({yesterdayDrafts.length} Editable Drafts for Today)
                </h4>
              </div>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Unsaved (Not in Official Totals Yet)
              </span>
            </div>

            <p className="text-xs text-amber-800 dark:text-amber-300/90">
              Modify amounts or notes below before saving. These entries will be saved for today's date ({todayStr}) without altering yesterday's historical records.
            </p>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {yesterdayDrafts.map((draft, idx) => (
                <div key={draft.draftId} className="p-3 rounded-xl bg-white dark:bg-[#1E1E1E] border border-amber-200 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#777777] block uppercase">Category</span>
                    <span className="font-bold text-[#202020] dark:text-white truncate block">{draft.categoryName}</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#777777] block uppercase">Amount (₹)</label>
                    <input
                      type="number"
                      value={draft.amount}
                      onChange={(e) => handleUpdateDraft(draft.draftId, 'amount', e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] font-bold text-xs text-[#202020] dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#777777] block uppercase">Description</label>
                    <input
                      type="text"
                      value={draft.description}
                      onChange={(e) => handleUpdateDraft(draft.draftId, 'description', e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveDraft(draft.draftId)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      title="Remove draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-amber-200 dark:border-amber-800/50">
              <button
                type="button"
                onClick={() => setYesterdayDrafts([])}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
              >
                Discard Drafts
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveAllDrafts}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-smooth cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Saving Entries...' : `Confirm & Save All ${yesterdayDrafts.length} Drafts`}
              </button>
            </div>
          </div>
        )}

        {/* SECTION 3: ADD / EDIT EXPENSE ENTRY FORM */}
        {canManage && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 rounded-2xl border border-[#E3E3E3] dark:border-[#333333] space-y-4 bg-white dark:bg-[#1E1E1E]">
            <div className="flex items-center justify-between border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777]">
                {editingExpenseId ? '✏️ Edit Expense Record' : `➕ Add Expense Entry for ${selectedDate}`}
              </h4>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-red-500 font-semibold hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (e.target.value !== 'NEW') setCustomCategoryName('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="">-- Select Category --</option>
                  {(expenseCategories || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="NEW">+ Create New Category...</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CARD">CARD / POS</option>
                  <option value="NETBANKING">NET BANKING</option>
                </select>
              </div>
            </div>

            {categoryId === 'NEW' && (
              <div>
                <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
                  New Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Refreshments"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#777777] uppercase mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Purchased 5 spools of golden thread & zippers"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const catObj = (expenseCategories || []).find(c => c.id === categoryId);
                  const catName = customCategoryName.trim() || catObj?.name || description.trim();
                  if (catName) handleAddPresetFromCategory(catName, categoryId || null);
                  else if (showToast) showToast("Preset Warning", "Please enter a category or notes first.", "info");
                }}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Pin className="w-3.5 h-3.5" /> Save Form Info as Preset
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-smooth cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : (editingExpenseId ? 'Update Expense' : 'Save Expense Record')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* SECTION 4: CATEGORY MANAGER DRAWER (RENAME, DELETE & TOUCHSCREEN PRESET PIN) */}
        <div className="space-y-3 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#202020] dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" /> Expense Categories ({expenseCategories.length})
              </h4>
              <p className="text-[11px] text-[#777777]">
                Drag category chip onto preset drop box, or tap "+ Preset" on touchscreens
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowCategoryDrawer(!showCategoryDrawer)}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showCategoryDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showCategoryDrawer ? 'Hide Manager' : 'Manage Categories'}
              </button>
            )}
          </div>

          {/* Active Category Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(expenseCategories || []).map((cat) => (
              <div
                key={cat.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', JSON.stringify({ name: cat.name, id: cat.id }));
                }}
                className="group px-3 py-1.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#202020] dark:text-white cursor-grab active:cursor-grabbing hover:border-amber-400 transition-all flex items-center gap-2 shadow-2xs select-none"
                title="Drag to drop box above, or use + Preset button"
              >
                <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{cat.name}</span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleAddPresetFromCategory(cat.name, cat.id)}
                    className="p-1 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold transition-opacity cursor-pointer"
                    title="Touchscreen action: Pin as Quick Preset"
                  >
                    + Preset
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Category Management Drawer */}
          {showCategoryDrawer && canManage && (
            <div className="p-3.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-3 animate-fade-in pt-3">
              <form onSubmit={handleCreateCategorySubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New category name (e.g. Sewing Oil / Ironing)"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  + Add Category
                </button>
              </form>

              <div className="divide-y divide-[#E3E3E3] dark:divide-[#333333] max-h-[160px] overflow-y-auto">
                {(expenseCategories || []).map((cat) => (
                  <div key={cat.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    {editingCatId === cat.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] text-xs font-bold text-[#202020] dark:text-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRenameCategory(cat.id)}
                          className="p-1 rounded-md bg-emerald-600 text-white cursor-pointer"
                          title="Save category name"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="p-1 text-[#777777] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-[#202020] dark:text-white">{cat.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatName(cat.name);
                            }}
                            className="p-1 rounded-md hover:bg-white dark:hover:bg-[#1E1E1E] text-gray-500 hover:text-emerald-600 cursor-pointer"
                            title="Rename category"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivateCategory(cat.id)}
                            className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-600 cursor-pointer"
                            title="Deactivate category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: REAL-TIME TOTALS & HISTORICAL RECORDED EXPENSES LEDGER */}
        <div className="space-y-4">
          
          {/* Date Selector & Real-Time Financial Cards Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333]">
            
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-[#202020] dark:text-white uppercase tracking-wider">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
              />
              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Go to Today
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs justify-between sm:justify-end">
              <div>
                <span className="text-[10px] font-bold text-[#777777] block uppercase">
                  {selectedDate === todayStr ? "Today's Expenses" : `${selectedDate} Total`}:
                </span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  ₹{totalDailyExpense.toLocaleString('en-IN')}
                </span>
              </div>

              {selectedDate === todayStr && (() => {
                const todayNet = (stats.todayRevenue || 0) - todayExpensesOfficial;
                const isLoss = todayNet < 0;
                return (
                  <div className="pl-4 border-l border-[#E3E3E3] dark:border-[#333333]">
                    <span className="text-[10px] font-bold text-[#777777] block uppercase">
                      {isLoss ? "Today's Net (Loss):" : "Today's Net Profit:"}
                    </span>
                    <span className={`text-lg font-bold ${isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {isLoss ? `-₹${Math.abs(todayNet).toLocaleString('en-IN')}` : `₹${todayNet.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Category Breakdown Chips */}
          {Object.keys(categoryBreakdown).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#F5F5F5]/60 dark:bg-[#252525]/60 border border-[#E3E3E3] dark:border-[#333333] text-xs">
              <span className="text-[10px] font-bold text-[#777777] uppercase tracking-wider">Breakdown:</span>
              {Object.entries(categoryBreakdown).map(([cName, cTotal]) => (
                <span key={cName} className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] font-semibold text-[11px] text-[#202020] dark:text-white">
                  {cName}: <strong className="text-amber-600 dark:text-amber-400">₹{cTotal.toLocaleString('en-IN')}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Recorded Expenses List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777] flex items-center justify-between">
              <span>Saved Expenses for {selectedDate} ({filteredExpenses.length})</span>
              <span className="text-[11px] text-[#777777]">Actual Database Records</span>
            </h4>

            {filteredExpenses.length > 0 ? (
              <div className="divide-y divide-[#E3E3E3] dark:divide-[#333333] border border-[#E3E3E3] dark:border-[#333333] rounded-2xl overflow-hidden shadow-2xs">
                {filteredExpenses.map((exp) => {
                  const catObj = (expenseCategories || []).find(c => c.id === exp.category_id || c.name === exp.category_id);
                  const catName = exp.expense_categories?.name || catObj?.name || 'General';

                  return (
                    <div
                      key={exp.id}
                      className="p-3.5 bg-white dark:bg-[#1E1E1E] hover:bg-[#F9FAFB] dark:hover:bg-[#252525] transition-smooth flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#202020] dark:text-white text-sm">
                            ₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 font-bold text-[10px]">
                            {catName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[#777777] font-mono text-[10px]">
                            {exp.payment_method || 'CASH'}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-[#777777] text-xs">{exp.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReuseExpense(exp)}
                              className="px-2.5 py-1 rounded-lg border border-[#E3E3E3] dark:border-[#333333] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                              title="Re-use / repeat this entry for today"
                            >
                              <Copy className="w-3 h-3" /> Repeat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(exp)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-[#282828] cursor-pointer"
                              title="Edit expense entry"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exp.id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                              title="Delete expense entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#777777] border border-dashed border-[#E3E3E3] dark:border-[#333333] rounded-2xl bg-white dark:bg-[#1E1E1E]">
                No official expenses logged for {selectedDate}. Use the form above to add an entry.
              </div>
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default ExpenseModal;
