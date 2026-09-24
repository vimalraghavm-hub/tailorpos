import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialCustomers, initialInvoices, defaultServicesList, defaultShopSettings, defaultNotifications } from '../data/demoData';
import { generateUniqueId } from '../utils/idGenerator';
import { getDefaultMeasurements } from '../data/measurementDefinitions';
import { isPhoneMatch, normalizePhone } from '../utils/phoneUtils';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { authService } from '../services/auth';
import { customersService } from '../services/customers';
import { ordersService } from '../services/orders';
import { paymentsService } from '../services/payments';
import { productionService } from '../services/production';
import { catalogServicesService } from '../services/services';
import { expensesService } from '../services/expenses';
import { analyticsService } from '../services/analytics';
import { googleSheetsService } from '../services/googleSheets';
import { workersService, DEFAULT_WORKER_PERMISSIONS } from '../services/workers';

const ShopContext = createContext();

export const defaultProductionStatuses = [
  { id: 'PS-1', name: 'PENDING' },
  { id: 'PS-2', name: 'CUTTING' },
  { id: 'PS-3', name: 'STITCHING' },
  { id: 'PS-4', name: 'FITTING' },
  { id: 'PS-5', name: 'PACKING' },
  { id: 'PS-6', name: 'READY' },
  { id: 'PS-7', name: 'DELIVERED' }
];

export const ShopProvider = ({ children }) => {
  const [customers, setCustomers] = useState(initialCustomers);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [services, setServices] = useState(defaultServicesList);
  const [settings, setSettings] = useState(defaultShopSettings);
  const [notifications, setNotifications] = useState(defaultNotifications);
  
  // Auth & Session State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState('OWNER'); // OWNER | CRM | WORKER
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Shop Context Details
  const shopId = 'a1000000-0000-0000-0000-000000000001';

  // Persist workflow production statuses in localStorage
  const [productionStatuses, setProductionStatuses] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('tailorpos_production_statuses') : null;
      const parsed = saved ? JSON.parse(saved) : defaultProductionStatuses;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => {
          if (typeof item === 'string') return { id: `PS-${idx + 1}`, name: item };
          return item && item.name ? item : { id: `PS-${idx + 1}`, name: String(item || '') };
        });
      }
      return defaultProductionStatuses;
    } catch (e) {
      return defaultProductionStatuses;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('tailorpos_production_statuses', JSON.stringify(productionStatuses));
    } catch (e) {}
  }, [productionStatuses]);
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('INV-1027');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [activeProfileCustomerId, setActiveProfileCustomerId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tailorpos_theme') : null;
    return saved ? saved : (defaultShopSettings.theme || 'light');
  });
  
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbConnectionError, setDbConnectionError] = useState(null);

  // 1. Supabase Auth Session Listener & Profile Sync
  useEffect(() => {
    const isProdEnv = import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.MODE === 'production';
    if (!isSupabaseConfigured) {
      if (isProdEnv) {
        setDbConnectionError("Production Database Connection Missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is unconfigured. Demo fallbacks are disabled in production.");
      }
      return;
    }

    // Fetch initial session
    authService.getCurrentSession().then(async (session) => {
      if (session?.user) {
        setUser(session.user);
        const profile = await authService.getCurrentProfile(session.user.id);
        if (profile) {
          setUserProfile(profile);
          setUserRole(profile.role || 'OWNER');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const profile = await authService.getCurrentProfile(session.user.id);
        if (profile) {
          setUserProfile(profile);
          setUserRole(profile.role || 'OWNER');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setUserRole('OWNER');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Hydrate shop data from Supabase PostgreSQL when available
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadShopData = async () => {
      try {
        const [dbCustomers, dbOrders, dbServices, dbStatuses] = await Promise.all([
          customersService.getCustomers(shopId),
          ordersService.getOrders(shopId),
          catalogServicesService.getServices(shopId),
          productionService.getProductionStatuses(shopId)
        ]);

        if (dbCustomers !== null) {
          const formattedCustomers = dbCustomers.map(c => {
            const measurementsObj = {};
            if (c.measurements && Array.isArray(c.measurements)) {
              c.measurements.forEach(m => {
                measurementsObj[m.garment_type] = m.measurements;
              });
            }
            return {
              id: c.id,
              name: c.name,
              phone: c.phone,
              address: c.address || '',
              notes: c.notes || '',
              measurements: Object.keys(measurementsObj).length > 0 ? measurementsObj : getDefaultMeasurements(),
              totalOrders: 0,
              totalSpent: 0,
              outstanding: 0,
              lastOrder: 'N/A',
              created_at: c.created_at
            };
          });
          setCustomers(formattedCustomers);
        } else {
          showToast("Database Notice", "Could not fetch customers from Supabase (using offline cache)", "warning");
        }

        if (dbOrders !== null) {
          const formattedInvoices = dbOrders.map(ord => {
            const lineItems = (ord.order_items || []).map(item => ({
              id: item.id,
              serviceId: item.service_id,
              name: item.service_name_snapshot,
              rate: parseFloat(item.unit_price) || 0,
              qty: item.quantity || 1,
              amount: parseFloat(item.line_total) || 0,
              status: item.status || 'PENDING'
            }));

            return {
              id: ord.invoice_number || ord.id,
              dbId: ord.id,
              customerId: ord.customer_id,
              customerName: ord.customers?.name || 'Customer',
              phone: ord.customers?.phone || '',
              date: ord.order_date,
              dueDate: ord.due_date,
              subtotal: parseFloat(ord.subtotal) || 0,
              discount: parseFloat(ord.discount) || 0,
              discount_type: ord.discount_type || 'amount',
              total: parseFloat(ord.total_amount) || 0,
              advancePaid: parseFloat(ord.total_paid) || 0,
              balance: parseFloat(ord.balance_amount) || 0,
              extraPaid: Math.max(0, (parseFloat(ord.total_paid) || 0) - (parseFloat(ord.total_amount) || 0)),
              status: ord.status || 'PENDING',
              notes: ord.notes || '',
              measurements: ord.measurement_snapshot || {},
              services: lineItems,
              created_at: ord.created_at
            };
          });
          setInvoices(formattedInvoices);
          if (formattedInvoices.length > 0) {
            setSelectedInvoiceId(formattedInvoices[0].id);
          }
        } else {
          showToast("Database Notice", "Could not fetch orders from Supabase (using offline cache)", "warning");
        }

        if (dbServices !== null) {
          const formattedServices = dbServices.map(s => ({
            id: s.id,
            name: s.name,
            defaultRate: parseFloat(s.default_price) || 0,
            category: s.category || 'General'
          }));
          setServices(formattedServices);
        }

        if (dbStatuses !== null) {
          const formattedStatuses = dbStatuses.map(s => ({
            id: s.id,
            name: s.name,
            sortOrder: s.sort_order
          }));
          setProductionStatuses(formattedStatuses);
        }
      } catch (err) {
        console.error('Error hydrating shop data from Supabase:', err);
        showToast("Database Error", "Failed to communicate with Supabase server", "error");
      }
    };

    loadShopData().then(() => {
      loadAnalytics();
      loadExpenses();
    });
  }, [user]);

  // Phase 3 Analytics & Expenses State
  const [analyticsData, setAnalyticsData] = useState({
    summary: null,
    revenueTrend: [],
    orderStatusSummary: [],
    expenseSummary: null,
    serviceAnalytics: [],
    overdueOrders: null,
    loading: false,
    error: null
  });

  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  const loadAnalytics = async (period = 'Week') => {
    if (!isSupabaseConfigured) return;
    setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [summary, trend, statusSummary, expSummary, serviceSummary, overdue] = await Promise.all([
        analyticsService.getDashboardSummary(),
        analyticsService.getRevenueTrend(period),
        analyticsService.getOrderStatusSummary(),
        analyticsService.getExpenseSummary(),
        analyticsService.getServiceAnalytics(),
        analyticsService.getOverdueOrders()
      ]);

      setAnalyticsData({
        summary: summary || null,
        revenueTrend: trend || [],
        orderStatusSummary: statusSummary || [],
        expenseSummary: expSummary || null,
        serviceAnalytics: serviceSummary || [],
        overdueOrders: overdue || null,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setAnalyticsData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const loadExpenses = async (startDate = null, endDate = null) => {
    if (!isSupabaseConfigured) return;
    try {
      const [expList, categories] = await Promise.all([
        expensesService.getExpenses(shopId, startDate, endDate),
        expensesService.getExpenseCategories(shopId)
      ]);
      if (expList) setExpenses(expList);
      if (categories) setExpenseCategories(categories);
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  };

  const addExpense = async (expenseData) => {
    if (!expenseData || parseFloat(expenseData.amount) <= 0) {
      showToast("Invalid Expense", "Amount must be greater than zero.", "warning");
      return { success: false, error: "Amount must be greater than zero." };
    }

    if (!hasPermission('MANAGE_EXPENSES')) {
      showToast("Access Denied", "Only Owner accounts can record expenses.", "warning");
      return { success: false, error: "Access Denied" };
    }

    if (isSupabaseConfigured) {
      const res = await expensesService.createExpense(shopId, expenseData, userProfile?.id);
      if (res.success) {
        showToast("Expense Recorded", `₹${expenseData.amount} logged under expenses`, "success");
        await loadExpenses();
        await loadAnalytics();
        return { success: true, data: res.data };
      } else {
        showToast("Expense Error", res.error || "Failed to record expense", "error");
        return { success: false, error: res.error };
      }
    }

    const newExp = {
      id: generateUniqueId('EXP'),
      amount: parseFloat(expenseData.amount),
      expense_date: expenseData.expenseDate || new Date().toISOString().split('T')[0],
      description: expenseData.description || '',
      payment_method: (expenseData.paymentMethod || 'CASH').toUpperCase()
    };
    setExpenses(prev => [newExp, ...prev]);
    showToast("Expense Recorded", `₹${newExp.amount} logged under expenses`, "success");
    return { success: true, data: newExp };
  };

  const updateExpense = async (expenseId, expenseData) => {
    if (!hasPermission('MANAGE_EXPENSES')) {
      showToast("Access Denied", "Only Owner accounts can update expenses.", "warning");
      return { success: false, error: "Access Denied" };
    }

    if (isSupabaseConfigured) {
      const res = await expensesService.updateExpense(expenseId, expenseData);
      if (res.success) {
        showToast("Expense Updated", "Expense record updated successfully", "success");
        await loadExpenses();
        await loadAnalytics();
        return { success: true };
      } else {
        showToast("Expense Error", res.error || "Failed to update expense", "error");
        return { success: false, error: res.error };
      }
    }

    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, ...expenseData } : e));
    showToast("Expense Updated", "Expense record updated successfully", "success");
    return { success: true };
  };

  const deleteExpense = async (expenseId) => {
    if (!hasPermission('MANAGE_EXPENSES')) {
      showToast("Access Denied", "Only Owner accounts can delete expenses.", "warning");
      return { success: false };
    }

    if (isSupabaseConfigured) {
      const res = await expensesService.deleteExpense(expenseId);
      if (res.success) {
        showToast("Expense Removed", "Removed expense entry", "info");
        await loadExpenses();
        await loadAnalytics();
        return { success: true };
      } else {
        showToast("Expense Error", res.error || "Failed to remove expense", "error");
        return { success: false };
      }
    }

    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    showToast("Expense Removed", "Removed expense entry", "info");
    return { success: true };
  };

  const addExpenseCategory = async (name) => {
    if (!hasPermission('MANAGE_EXPENSES')) {
      showToast("Access Denied", "Only Owner accounts can manage expense categories.", "warning");
      return { success: false };
    }

    if (isSupabaseConfigured) {
      const res = await expensesService.addExpenseCategory(shopId, name);
      if (res.success) {
        showToast("Category Added", `Expense category '${name}' created`, "success");
        await loadExpenses();
        return { success: true, data: res.data };
      } else {
        showToast("Category Error", res.error || "Failed to add category", "error");
        return { success: false, error: res.error };
      }
    }

    const newCat = { id: generateUniqueId('EC'), name: name.trim(), is_active: true };
    setExpenseCategories(prev => [...prev, newCat]);
    showToast("Category Added", `Expense category '${name}' created`, "success");
    return { success: true, data: newCat };
  };

  const deactivateExpenseCategory = async (categoryId) => {
    if (!hasPermission('MANAGE_EXPENSES')) {
      showToast("Access Denied", "Only Owner accounts can manage expense categories.", "warning");
      return { success: false };
    }

    if (isSupabaseConfigured) {
      const res = await expensesService.deactivateExpenseCategory(categoryId);
      if (res.success) {
        showToast("Category Deactivated", "Deactivated category for future entries", "info");
        await loadExpenses();
        return { success: true };
      } else {
        showToast("Category Error", res.error || "Failed to deactivate category", "error");
        return { success: false };
      }
    }

    setExpenseCategories(prev => prev.filter(c => c.id !== categoryId));
    showToast("Category Deactivated", "Deactivated category for future entries", "info");
    return { success: true };
  };

  // Sync dark/maroon class on body and persist in localStorage
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'maroon');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'maroon') {
      document.documentElement.classList.add('maroon');
    }
    try {
      localStorage.setItem('tailorpos_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : (theme === 'dark' ? 'maroon' : 'light');
    setTheme(nextTheme);
    setSettings(prev => ({ ...prev, theme: nextTheme }));
  };

  const setThemeMode = (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark' && newTheme !== 'maroon') return;
    setTheme(newTheme);
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  const showToast = (title, message, type = 'success') => {
    const id = generateUniqueId('toast');
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auth Operations
  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success) {
      setUser(res.user);
      setUserProfile(res.profile);
      setUserRole(res.profile?.role || 'OWNER');
    }
    return res;
  };

  const logout = async () => {
    const res = await authService.logout();
    setUser(null);
    setUserProfile(null);
    setUserRole('OWNER');
    return res;
  };

  // Permission Check Helper based on Active User Role
  const hasPermission = (permission) => {
    switch (permission) {
      case 'MANAGE_EMPLOYEES':
      case 'DELETE_CUSTOMER':
      case 'MANAGE_SHOP_SETTINGS':
      case 'VIEW_FINANCIAL_REPORTS':
      case 'MANAGE_EXPENSES':
        return userRole === 'OWNER';
      case 'CREATE_INVOICE':
      case 'RECORD_PAYMENT':
      case 'MANAGE_CUSTOMERS':
      case 'WHATSAPP_SEND':
        return userRole === 'OWNER' || userRole === 'CRM';
      case 'VIEW_REGISTERS':
      case 'UPDATE_PRODUCTION_STATUS':
        return userRole === 'OWNER' || userRole === 'CRM' || userRole === 'WORKER';
      default:
        return true;
    }
  };

  const navigateTo = (view, params = {}) => {
    // Role-based navigation guard
    if (userRole === 'WORKER' && (view === 'settings' || view === 'customers' || view === 'new-invoice')) {
      showToast("Access Restricted", "Worker accounts only have access to Production Registers.", "warning");
      setCurrentView('registers');
      return;
    }

    setCurrentView(view);
    if (params.invoiceId) setSelectedInvoiceId(params.invoiceId);
    if (params.customerId) setSelectedCustomerId(params.customerId);
    if (params.orderToEdit !== undefined) {
      setEditingOrder(params.orderToEdit);
    } else if (view !== 'new-invoice') {
      setEditingOrder(null);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearEditingOrder = () => {
    setEditingOrder(null);
  };

  const openCustomerProfile = (customerId) => {
    setActiveProfileCustomerId(customerId);
  };

  const closeCustomerProfile = () => {
    setActiveProfileCustomerId(null);
  };

  // Production Status Operations
  const addProductionStatus = async (statusName) => {
    if (!statusName || !statusName.trim()) return null;
    const cleanName = statusName.trim().toUpperCase();
    const existing = productionStatuses.find(ps => ps.name === cleanName);
    if (existing) {
      return existing;
    }

    let newStatus = {
      id: generateUniqueId('PS'),
      name: cleanName
    };

    if (isSupabaseConfigured) {
      const res = await productionService.addProductionStatus(shopId, cleanName);
      if (res?.success && res.data) {
        newStatus = { id: res.data.id, name: res.data.name };
      }
    }

    setProductionStatuses(prev => [...prev, newStatus]);
    return newStatus;
  };

  const editProductionStatus = (statusId, newName) => {
    if (!newName || !newName.trim()) return;
    const cleanName = newName.trim().toUpperCase();
    const targetStatus = productionStatuses.find(ps => ps.id === statusId || ps.name === statusId);
    if (!targetStatus) return;

    const oldName = targetStatus.name;
    setProductionStatuses(prev => prev.map(ps => {
      if (ps.id === statusId || ps.name === statusId) {
        return { ...ps, name: cleanName };
      }
      return ps;
    }));

    if (oldName !== cleanName) {
      setInvoices(prev => prev.map(inv => {
        const matchOverall = (inv.status || '').toUpperCase() === oldName.toUpperCase();
        const updatedServices = inv.services ? inv.services.map(svc => {
          if ((svc.status || '').toUpperCase() === oldName.toUpperCase()) {
            return { ...svc, status: cleanName };
          }
          return svc;
        }) : inv.services;

        return {
          ...inv,
          status: matchOverall ? cleanName : inv.status,
          services: updatedServices
        };
      }));
    }
  };

  const moveProductionStatus = (statusId, direction) => {
    setProductionStatuses(prev => {
      const idx = prev.findIndex(ps => ps.id === statusId || ps.name === statusId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
  };

  const reorderProductionStatuses = (newStatuses) => {
    if (Array.isArray(newStatuses)) {
      setProductionStatuses(newStatuses);
    }
  };

  const deleteProductionStatus = (statusId, reassignStatusName = null, force = false) => {
    const targetStatus = productionStatuses.find(ps => ps.id === statusId || ps.name === statusId);
    if (!targetStatus) return { success: false, reason: "Status not found" };

    const inUseInvoices = invoices.filter(inv => {
      if ((inv.status || '').toUpperCase() === targetStatus.name.toUpperCase()) return true;
      return inv.services && inv.services.some(s => (s.status || '').toUpperCase() === targetStatus.name.toUpperCase());
    });

    if (inUseInvoices.length > 0 && !reassignStatusName && !force) {
      return {
        success: false,
        inUse: true,
        count: inUseInvoices.length,
        statusName: targetStatus.name,
        message: "This status is currently used by existing orders."
      };
    }

    if (reassignStatusName) {
      const cleanReassign = reassignStatusName.trim().toUpperCase();
      setInvoices(prev => prev.map(inv => {
        const matchOverall = (inv.status || '').toUpperCase() === targetStatus.name.toUpperCase();
        const updatedServices = inv.services ? inv.services.map(svc => {
          if ((svc.status || '').toUpperCase() === targetStatus.name.toUpperCase()) {
            return { ...svc, status: cleanReassign };
          }
          return svc;
        }) : inv.services;

        return {
          ...inv,
          status: matchOverall ? cleanReassign : inv.status,
          services: updatedServices
        };
      }));
    }

    setProductionStatuses(prev => prev.filter(ps => ps.id !== targetStatus.id && ps.name !== targetStatus.name));
    return { success: true };
  };

  // Services Catalog Management
  const addService = async (serviceData) => {
    if (!serviceData || !serviceData.name) return null;
    let newSvc = {
      id: generateUniqueId('S'),
      name: serviceData.name.trim(),
      defaultRate: parseFloat(serviceData.defaultRate) || 0,
      category: serviceData.category || "General"
    };

    if (isSupabaseConfigured) {
      const res = await catalogServicesService.addService(shopId, serviceData);
      if (res?.success && res.data) {
        newSvc = {
          id: res.data.id,
          name: res.data.name,
          defaultRate: parseFloat(res.data.default_price) || 0,
          category: res.data.category || 'General'
        };
      }
    }

    setServices(prev => [...prev, newSvc]);
    showToast("Service Added", `Added ${newSvc.name} (₹${newSvc.defaultRate}) to service catalog`, "success");
    return newSvc;
  };

  const editService = async (serviceId, updatedData) => {
    setServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        return {
          ...s,
          name: updatedData.name ? updatedData.name.trim() : s.name,
          defaultRate: updatedData.defaultRate !== undefined ? parseFloat(updatedData.defaultRate) || 0 : s.defaultRate,
          category: updatedData.category || s.category
        };
      }
      return s;
    }));
    if (isSupabaseConfigured) {
      await catalogServicesService.updateService(serviceId, updatedData);
    }
    showToast("Service Pricing Updated", "Default catalog price updated.", "info");
  };

  const deleteService = async (serviceId) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
    if (isSupabaseConfigured) {
      await catalogServicesService.deleteService(serviceId);
    }
    showToast("Service Removed", "Removed service from default catalog", "info");
  };

  // Delivery Order Handler
  const deliverOrder = async (invoiceId, markPaid = true, paymentMode = 'Cash') => {
    const targetInv = invoices.find(inv => inv.id === invoiceId);
    const targetId = targetInv?.dbId || invoiceId;

    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;

      const newAdvance = markPaid ? inv.total : inv.advancePaid;
      const newBalance = markPaid ? 0 : Math.max(0, inv.total - newAdvance);
      const updatedServices = inv.services ? inv.services.map(s => ({ ...s, status: 'DELIVERED' })) : [];

      return {
        ...inv,
        advancePaid: newAdvance,
        balance: newBalance,
        status: 'DELIVERED',
        paymentMode: markPaid ? (paymentMode || inv.paymentMode) : inv.paymentMode,
        services: updatedServices
      };
    }));

    if (isSupabaseConfigured) {
      await ordersService.updateOrderStatus(targetId, 'DELIVERED');
    }

    showToast(
      markPaid ? "Order Delivered & Paid" : "Order Delivered with Balance",
      markPaid ? `${invoiceId} delivered and payment fully settled` : `${invoiceId} delivered with outstanding balance`,
      "success"
    );
  };

  const computeOverallInvoiceStatus = (invoice) => {
    if (!invoice.services || invoice.services.length === 0) return invoice.status || "PENDING";
    const statuses = invoice.services.map(s => (s.status || "PENDING").toUpperCase());
    
    if (statuses.every(st => st === "DELIVERED")) return "DELIVERED";
    if (statuses.every(st => st === "READY")) return "READY";
    if (statuses.every(st => st === "PENDING")) return "PENDING";
    
    return "IN PROGRESS";
  };

  const updateServiceStatus = async (invoiceId, serviceId, newStatus) => {
    if (!newStatus) return;

    const targetInv = invoices.find(inv => inv.id === invoiceId);
    const targetId = targetInv?.dbId || invoiceId;

    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;

      const updatedServices = inv.services.map(svc => {
        if (svc.id === serviceId) {
          return { ...svc, status: newStatus.toUpperCase() };
        }
        return svc;
      });

      const nextOverallStatus = computeOverallInvoiceStatus({ ...inv, services: updatedServices });

      return {
        ...inv,
        services: updatedServices,
        status: nextOverallStatus
      };
    }));

    if (isSupabaseConfigured) {
      await productionService.updateItemStatus(shopId, targetId, serviceId, newStatus, userProfile?.id);
    }
    showToast("Status Updated", `Service status set to ${newStatus}`, "info");
  };

  const getCustomerStats = (customer) => {
    if (!customer) return { totalOrders: 0, totalSpent: 0, balance: 0, extraPaid: 0, measurementsCount: 0, customerOrders: [] };

    const customerOrders = invoices.filter(inv => 
      (inv.customerId && inv.customerId === customer.id) ||
      (inv.phone && customer.phone && isPhoneMatch(customer.phone, inv.phone))
    );

    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const balance = customerOrders.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const extraPaid = customerOrders.reduce((sum, inv) => sum + (inv.extraPaid || 0), 0);

    let measurementsCount = 0;
    if (customer.measurements && typeof customer.measurements === 'object') {
      Object.values(customer.measurements).forEach(category => {
        if (category && typeof category === 'object') {
          Object.entries(category).forEach(([k, val]) => {
            if (k !== 'suppliedGarment' && val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0' && String(val).trim() !== '-') {
              measurementsCount++;
            }
          });
        }
      });
    }

    return {
      customerOrders,
      totalOrders,
      totalSpent,
      balance,
      extraPaid,
      measurementsCount
    };
  };

  const updateCustomer = async (customerId, updatedData) => {
    if (!customerId) return { success: false };

    if (updatedData.phone) {
      const existing = customers.find(c => 
        c.id !== customerId && 
        c.phone && 
        isPhoneMatch(updatedData.phone, c.phone)
      );
      if (existing) {
        showToast("Phone Already in Use", `Phone number belongs to ${existing.name}`, "warning");
        return { success: false, reason: "Phone number already exists" };
      }
    }

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          name: updatedData.name ? updatedData.name.trim() : c.name,
          phone: updatedData.phone ? updatedData.phone.trim() : c.phone,
          address: updatedData.address !== undefined ? updatedData.address.trim() : c.address,
          notes: updatedData.notes !== undefined ? updatedData.notes.trim() : c.notes,
          measurements: updatedData.measurements || c.measurements
        };
      }
      return c;
    }));

    if (updatedData.name || updatedData.phone) {
      setInvoices(prev => prev.map(inv => {
        if (inv.customerId === customerId) {
          return {
            ...inv,
            customerName: updatedData.name ? updatedData.name.trim() : inv.customerName,
            phone: updatedData.phone ? updatedData.phone.trim() : inv.phone
          };
        }
        return inv;
      }));
    }

    if (isSupabaseConfigured) {
      await customersService.updateCustomer(customerId, updatedData);
    }
    showToast("Customer Profile Updated", "Customer profile saved successfully", "success");
    return { success: true };
  };

  const deleteCustomer = async (customerId) => {
    if (!customerId) return;
    if (!hasPermission('DELETE_CUSTOMER')) {
      showToast("Access Denied", "Only Owner can delete customer profiles.", "warning");
      return;
    }

    const target = (customers || []).find(c => c && c.id === customerId);
    const custName = target ? target.name : 'Customer';

    setCustomers(prev => prev.filter(c => c && c.id !== customerId));
    if (activeProfileCustomerId === customerId) {
      setActiveProfileCustomerId(null);
    }

    if (isSupabaseConfigured) {
      await customersService.softDeleteCustomer(customerId);
    }
    showToast("Customer Profile Deleted", `Permanently removed profile for ${custName}`, "info");
  };

  const saveInvoice = async (invoiceData) => {
    const isEdit = invoiceData.id && invoices.some(i => i.id === invoiceData.id);
    let customerObj = customers.find(c => c.phone && invoiceData.phone && isPhoneMatch(invoiceData.phone, c.phone));
    const updatedCustomerMeasurements = invoiceData.measurements || (customerObj ? customerObj.measurements : undefined);

    if (!customerObj) {
      let newCustId = generateUniqueId('CUST');
      if (isSupabaseConfigured) {
        const res = await customersService.createCustomer(shopId, {
          name: invoiceData.customerName,
          phone: invoiceData.phone,
          address: invoiceData.address || "Local Customer",
          notes: invoiceData.notes || ""
        });
        if (res?.success && res.data) {
          newCustId = res.data.id;
        }
      }

      customerObj = {
        id: newCustId,
        name: invoiceData.customerName,
        phone: invoiceData.phone,
        address: invoiceData.address || "Local Customer",
        totalOrders: 1,
        totalSpent: invoiceData.total || 0,
        outstanding: invoiceData.balance || 0,
        lastOrder: invoiceData.date || "Today",
        notes: invoiceData.notes || "",
        measurements: updatedCustomerMeasurements || getDefaultMeasurements()
      };
      setCustomers(prev => [customerObj, ...prev]);
    } else {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerObj.id) {
          return {
            ...c,
            name: invoiceData.customerName || c.name,
            address: invoiceData.address || c.address,
            totalOrders: isEdit ? c.totalOrders : c.totalOrders + 1,
            totalSpent: isEdit ? c.totalSpent : c.totalSpent + (invoiceData.total || 0),
            outstanding: isEdit ? invoiceData.balance : c.outstanding + (invoiceData.balance || 0),
            lastOrder: invoiceData.date || c.lastOrder,
            measurements: updatedCustomerMeasurements || c.measurements
          };
        }
        return c;
      }));
    }

    const servicesWithStatus = (invoiceData.services || []).map((s, idx) => ({
      ...s,
      id: s.id || `S-${idx + 1}`,
      status: s.status || "PENDING"
    }));

    const total = invoiceData.total || 0;
    const advancePaid = invoiceData.advancePaid !== undefined ? invoiceData.advancePaid : 0;
    const balance = Math.max(0, total - advancePaid);
    const extraPaid = Math.max(0, advancePaid - total);

    let paymentStatus = 'UNPAID';
    if (advancePaid > 0 && advancePaid < total) {
      paymentStatus = 'PARTIALLY PAID';
    } else if (advancePaid === total && total > 0) {
      paymentStatus = 'PAID';
    } else if (advancePaid > total) {
      paymentStatus = 'OVERPAID / CREDIT';
    }

    if (isEdit) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoiceData.id) {
          return {
            ...inv,
            ...invoiceData,
            balance,
            extraPaid,
            paymentStatus,
            services: servicesWithStatus,
            customerId: customerObj.id,
            customerName: customerObj.name,
            measurements: invoiceData.measurements || inv.measurements
          };
        }
        return inv;
      }));
      showToast("Invoice Updated", `Saved changes to ${invoiceData.id}`, "success");
      setSelectedInvoiceId(invoiceData.id);
      navigateTo('invoice-detail', { invoiceId: invoiceData.id });
    } else {
      const newId = `${settings.invoicePrefix}${settings.nextInvoiceNumber}`;
      let createdDbId = null;

      if (isSupabaseConfigured) {
        const orderRes = await ordersService.createOrder(shopId, {
          ...invoiceData,
          invoice_number: newId,
          customerId: customerObj.id,
          services: servicesWithStatus,
          advancePaid,
          measurements: invoiceData.measurements || customerObj.measurements
        }, userProfile?.id);
        if (orderRes?.success && orderRes.data) {
          createdDbId = orderRes.data.id;
        }
      }

      const fullInvoice = {
        material: "Customer Fabric",
        garmentType: "Custom Stitching",
        ...invoiceData,
        id: newId,
        dbId: createdDbId,
        balance,
        extraPaid,
        paymentStatus,
        services: servicesWithStatus,
        customerId: customerObj.id,
        customerName: customerObj.name,
        status: invoiceData.status || "PENDING",
        measurements: invoiceData.measurements || customerObj.measurements
      };

      setInvoices(prev => [fullInvoice, ...prev]);
      setSettings(prev => ({ ...prev, nextInvoiceNumber: prev.nextInvoiceNumber + 1 }));

      setNotifications(prev => [
        {
          id: generateUniqueId('notif'),
          title: "New Order Created",
          message: `${newId} for ${customerObj.name} (₹${invoiceData.total})`,
          time: "Just now",
          read: false,
          type: "success"
        },
        ...prev
      ]);

      showToast("Invoice Saved", `Successfully generated ${newId}`, "success");
      setSelectedInvoiceId(newId);
      navigateTo('invoice-detail', { invoiceId: newId });
    }
  };

  const addInvoice = saveInvoice;

  const recordPayment = async (invoiceId, amount, mode) => {
    const targetInv = invoices.find(inv => inv.id === invoiceId);
    const targetDbId = targetInv?.dbId || invoiceId;

    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;
      const newAdvance = inv.advancePaid + amount;
      const newBalance = Math.max(0, inv.total - newAdvance);
      return {
        ...inv,
        advancePaid: newAdvance,
        balance: newBalance,
        paymentMode: mode || inv.paymentMode
      };
    }));

    if (isSupabaseConfigured) {
      await paymentsService.recordPayment(shopId, targetDbId, amount, mode, null, '', userProfile?.id);
    }
    showToast("Payment Recorded", `₹${amount} recorded for ${invoiceId}`, "success");
  };

  const saveCustomerMeasurements = async (customerId, garmentType, measurements, notes) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          notes: notes !== undefined ? notes : c.notes,
          measurements: {
            ...c.measurements,
            [garmentType]: measurements
          }
        };
      }
      return c;
    }));

    if (isSupabaseConfigured) {
      await measurementsService.saveMeasurement(shopId, customerId, garmentType, measurements, notes);
    }
  };

  const addCustomer = async (customerData) => {
    if (!customerData.phone) return null;
    
    const existing = customers.find(c => c.phone && c.phone.trim() === customerData.phone.trim());
    if (existing) {
      showToast("Customer Already Exists", `Loaded profile for ${existing.name} (${existing.phone})`, "info");
      return existing;
    }

    let dbId = generateUniqueId('CUST');
    if (isSupabaseConfigured) {
      const res = await customersService.createCustomer(shopId, customerData);
      if (res?.success && res.data) {
        dbId = res.data.id;
      }
    }

    const newCust = {
      id: dbId,
      totalOrders: 0,
      totalSpent: 0,
      outstanding: 0,
      lastOrder: "N/A",
      notes: customerData.notes || "",
      measurements: customerData.measurements || getDefaultMeasurements(),
      ...customerData
    };
    setCustomers(prev => [newCust, ...prev]);
    showToast("Customer Added", `${newCust.name} added to customer database`, "success");
    return newCust;
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const stats = {
    todayRevenue: analyticsData.summary?.today_revenue ?? invoices.reduce((acc, curr) => acc + curr.advancePaid, 0),
    todaySales: analyticsData.summary?.today_sales ?? invoices.reduce((acc, curr) => acc + curr.total, 0),
    todayOrders: analyticsData.summary?.today_orders ?? invoices.length,
    totalInvoices: analyticsData.summary?.total_invoices ?? invoices.length,
    pendingOrders: analyticsData.summary?.pending_orders ?? invoices.filter(i => i.status !== 'DELIVERED').length,
    readyForDelivery: analyticsData.summary?.ready_orders ?? invoices.filter(i => i.status === 'READY').length,
    totalOutstanding: analyticsData.summary?.total_outstanding ?? invoices.reduce((acc, curr) => acc + curr.balance, 0),
    todayExpenses: analyticsData.summary?.today_expenses ?? 0,
    estimatedNet: analyticsData.summary?.estimated_net ?? 0,
    statusCounts: {
      cutting: invoices.filter(i => i.status === 'CUTTING').length,
      stitching: invoices.filter(i => i.status === 'STITCHING').length,
      packing: invoices.filter(i => i.status === 'PACKING').length,
      ready: invoices.filter(i => i.status === 'READY').length,
      delivered: invoices.filter(i => i.status === 'DELIVERED').length
    }
  };

  // Google Sheets Integration State & Functions
  const [googleIntegration, setGoogleIntegration] = useState({
    connected: false,
    spreadsheetId: null,
    spreadsheetName: 'Mohit Tailoring — Business Data',
    spreadsheetUrl: null,
    lastSyncedAt: null,
    googleUserEmail: null
  });

  const loadGoogleStatus = async () => {
    const res = await googleSheetsService.getStatus(shopId);
    if (res) {
      setGoogleIntegration(res);
    }
  };

  useEffect(() => {
    loadGoogleStatus();
  }, [userRole]);

  const connectGoogleAccount = async () => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can connect Google Sheets integration.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await googleSheetsService.connectAccount(shopId);
    if (res?.success) {
      setGoogleIntegration(res);
      showToast("Google Sheets Connected", "Business spreadsheet initialized successfully.", "success");
    } else {
      showToast("Connection Failed", res?.error || "Failed to connect Google account", "error");
    }
    return res;
  };

  const syncGoogleSheetsNow = async () => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can trigger business data sync.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const snapshot = {
      customers,
      invoices,
      services,
      expenses,
      notifications,
      analytics: analyticsData
    };
    const res = await googleSheetsService.syncNow(shopId, snapshot);
    if (res?.success) {
      setGoogleIntegration(prev => ({
        ...prev,
        connected: true,
        lastSyncedAt: res.lastSyncedAt || new Date().toISOString()
      }));
      showToast("Sync Successful", "Business data exported to Google Sheet (No duplicates).", "success");
    } else {
      showToast("Sync Failed", res?.error || "Failed to sync Google Sheets", "error");
    }
    return res;
  };

  const disconnectGoogleAccount = async () => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can disconnect Google Sheets.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await googleSheetsService.disconnectAccount(shopId);
    if (res?.success) {
      setGoogleIntegration({
        connected: false,
        spreadsheetId: null,
        spreadsheetName: 'Mohit Tailoring — Business Data',
        spreadsheetUrl: null,
        lastSyncedAt: null,
        googleUserEmail: null
      });
      showToast("Disconnected", "Google Sheets link removed. Owner spreadsheet preserved.", "info");
    }
    return res;
  };

  // Worker Management & Permissions State
  const [workersList, setWorkersList] = useState([]);
  const [orderAssignmentsMap, setOrderAssignmentsMap] = useState({});

  const loadWorkersData = async () => {
    const list = await workersService.getWorkers(shopId);
    setWorkersList(list);
    const assignments = await workersService.getAssignments(shopId);
    setOrderAssignmentsMap(assignments);
  };

  useEffect(() => {
    loadWorkersData();
  }, [userRole]);

  /**
   * Helper to check granular permission for logged-in user
   */
  const hasWorkerPermission = (permissionKey) => {
    if (userRole === 'OWNER') return true;
    if (userRole === 'WORKER') {
      if (userProfile && userProfile.permissions && typeof userProfile.permissions[permissionKey] === 'boolean') {
        return userProfile.permissions[permissionKey];
      }
      return DEFAULT_WORKER_PERMISSIONS[permissionKey] ?? false;
    }
    return false;
  };

  const createWorker = async ({ email, password, fullName, permissions }) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can create worker accounts.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await workersService.createWorker({ shopId, email, password, fullName, permissions });
    if (res?.success) {
      showToast("Worker Created", `Account created for ${fullName}`, "success");
      loadWorkersData();
    } else {
      showToast("Creation Failed", res?.error || "Failed to create worker account", "error");
    }
    return res;
  };

  const updateWorkerPermissions = async (workerId, permissions) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can modify permissions.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await workersService.updatePermissions(workerId, permissions, shopId);
    if (res?.success) {
      showToast("Permissions Updated", "Worker access rights updated successfully.", "success");
      loadWorkersData();
    } else {
      showToast("Update Failed", res?.error || "Failed to update permissions", "error");
    }
    return res;
  };

  const toggleWorkerStatus = async (workerId, isActive) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can change worker status.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await workersService.toggleStatus(workerId, isActive, shopId);
    if (res?.success) {
      showToast("Worker Status Updated", `Worker is now ${isActive ? 'ACTIVE' : 'DISABLED'}`, "info");
      loadWorkersData();
    }
    return res;
  };

  const assignOrderToWorker = async (orderId, workerId) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can assign orders.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await workersService.assignOrder({ shopId, orderId, workerId, assignedBy: userProfile?.id });
    if (res?.success) {
      const workerName = workersList.find(w => w.id === workerId)?.full_name || 'Worker';
      showToast("Assignment Updated", workerId ? `Order assigned to ${workerName}` : "Worker assignment removed", "success");
      loadWorkersData();
    }
    return res;
  };

  return (
    <ShopContext.Provider value={{
      customers,
      invoices,
      services,
      settings,
      notifications,
      productionStatuses,
      currentView,
      selectedInvoiceId,
      selectedCustomerId,
      activeProfileCustomerId,
      editingOrder,
      theme,
      toasts,
      sidebarCollapsed,
      mobileMenuOpen,
      user,
      userProfile,
      userRole,
      showAuthModal,
      stats,
      analyticsData,
      loadAnalytics,
      expenses,
      expenseCategories,
      loadExpenses,
      addExpense,
      updateExpense,
      deleteExpense,
      addExpenseCategory,
      deactivateExpenseCategory,
      setUserRole,
      setShowAuthModal,
      login,
      logout,
      hasPermission,
      setSidebarCollapsed,
      setMobileMenuOpen,
      navigateTo,
      setEditingOrder,
      clearEditingOrder,
      addInvoice,
      saveInvoice,
      updateServiceStatus,
      addProductionStatus,
      editProductionStatus,
      moveProductionStatus,
      reorderProductionStatuses,
      deleteProductionStatus,
      addService,
      editService,
      deleteService,
      deliverOrder,
      getCustomerStats,
      recordPayment,
      saveCustomerMeasurements,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      openCustomerProfile,
      closeCustomerProfile,
      setSettings,
      toggleTheme,
      setThemeMode,
      showToast,
      removeToast,
      markNotificationRead,
      setSelectedInvoiceId,
      setSelectedCustomerId,
      googleIntegration,
      connectGoogleAccount,
      syncGoogleSheetsNow,
      disconnectGoogleAccount,
      workersList,
      orderAssignmentsMap,
      loadWorkersData,
      createWorker,
      updateWorkerPermissions,
      toggleWorkerStatus,
      assignOrderToWorker,
      hasWorkerPermission,
      dbConnectionError
    }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
