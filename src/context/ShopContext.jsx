import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { initialCustomers, initialInvoices, defaultServicesList, defaultShopSettings, defaultNotifications } from '../data/demoData';
import { generateUniqueId } from '../utils/idGenerator';
import { GARMENT_MEASUREMENT_TYPES, GARMENT_MEASUREMENT_FIELDS, getDefaultMeasurements as getFallbackDefaultMeasurements } from '../data/measurementDefinitions';
import { isPhoneMatch, normalizePhone } from '../utils/phoneUtils';
import { supabase, isSupabaseConfigured, isUuid } from '../lib/supabase/client';
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
import { measurementTemplatesService } from '../services/measurementTemplates';
import { measurementsService } from '../services/measurements';

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
  const [isHydrated, setIsHydrated] = useState(!isSupabaseConfigured);
  const [customers, setCustomers] = useState(() => isSupabaseConfigured ? [] : initialCustomers);
  const [invoices, setInvoices] = useState(() => isSupabaseConfigured ? [] : initialInvoices);
  const [services, setServices] = useState(defaultServicesList);
  const [settings, setSettings] = useState(defaultShopSettings);
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [measurementTemplates, setMeasurementTemplates] = useState([]);
  
  // Auth & Session State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'OWNER' | 'WORKER' | null
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
  
  const getInitialRoute = () => {
    if (typeof window === 'undefined') return 'login';
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path || path === 'login') return 'login';
    if (path === 'invoice') return 'new-invoice';
    return path;
  };

  const [currentView, setCurrentView] = useState(getInitialRoute);
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
        setDbConnectionError("Production Database Connection Missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is unconfigured.");
      }
      setIsAuthLoading(false);
      return;
    }

    const initAuthSession = async () => {
      try {
        const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (savedUserStr) {
          try {
            const savedWorker = JSON.parse(savedUserStr);
            if (savedWorker && savedWorker.role === 'WORKER' && savedWorker.id) {
              setUser(savedWorker);
              setUserProfile(savedWorker);
              setUserRole('WORKER');

              const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+|\/+$/g, '') : '';
              if (!currentPath || currentPath === 'login') {
                setCurrentView('registers');
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', '/registers');
                }
              } else {
                const viewName = currentPath === 'invoice' ? 'new-invoice' : currentPath;
                if (viewName === 'settings' || viewName === 'customers' || viewName === 'new-invoice' || viewName === 'workers') {
                  setCurrentView('registers');
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/registers');
                  }
                } else {
                  setCurrentView(viewName);
                }
              }
              setIsAuthLoading(false);
              return;
            }
          } catch (e) {}
        }

        const session = await authService.getCurrentSession();
        if (session?.user) {
          setUser(session.user);
          const profile = await authService.getCurrentProfile(session.user.id);
          if (profile) {
            setUserProfile(profile);
            const role = profile.role || 'OWNER';
            setUserRole(role);

            const currentPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+|\/+$/g, '') : '';
            if (!currentPath || currentPath === 'login') {
              const defaultView = role === 'WORKER' ? 'registers' : 'dashboard';
              setCurrentView(defaultView);
              if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', '/' + (defaultView === 'new-invoice' ? 'invoice' : defaultView));
              }
            } else {
              const viewName = currentPath === 'invoice' ? 'new-invoice' : currentPath;
              if (role === 'WORKER' && (viewName === 'settings' || viewName === 'customers' || viewName === 'new-invoice' || viewName === 'workers')) {
                setCurrentView('registers');
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', '/registers');
                }
              } else {
                setCurrentView(viewName);
              }
            }
          } else {
            setUserProfile(null);
            setUserRole('OWNER');
          }
        } else {
          setUser(null);
          setUserProfile(null);
          setUserRole(null);
          setCurrentView('login');
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.history.replaceState({}, '', '/login');
          }
        }
      } catch (err) {
        console.error('Error initializing auth session:', err);
        setUser(null);
        setUserProfile(null);
        setUserRole(null);
        setCurrentView('login');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.history.replaceState({}, '', '/login');
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    initAuthSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const profile = await authService.getCurrentProfile(session.user.id);
        if (profile) {
          setUserProfile(profile);
          const role = profile.role || 'OWNER';
          setUserRole(role);
        }
      } else {
        const savedUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        let savedWorker = null;
        if (savedUserStr) {
          try {
            savedWorker = JSON.parse(savedUserStr);
          } catch (e) {}
        }
        if (savedWorker && savedWorker.role === 'WORKER') {
          setUser(savedWorker);
          setUserProfile(savedWorker);
          setUserRole('WORKER');
        } else {
          setUser(null);
          setUserProfile(null);
          setUserRole(null);
          setCurrentView('login');
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.history.replaceState({}, '', '/login');
          }
        }
      }
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Browser Popstate Back/Forward URL Sync
  useEffect(() => {
    const handlePopState = () => {
      if (!user) {
        setCurrentView('login');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.history.replaceState({}, '', '/login');
        }
        return;
      }
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
      if (!path || path === 'login') {
        setCurrentView(userRole === 'WORKER' ? 'registers' : 'dashboard');
      } else {
        const viewName = path === 'invoice' ? 'new-invoice' : path;
        if (userRole === 'WORKER' && (viewName === 'settings' || viewName === 'customers' || viewName === 'new-invoice' || viewName === 'workers')) {
          setCurrentView('registers');
        } else {
          setCurrentView(viewName);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, userRole]);

  // 2. Hydrate shop data & Realtime subscriptions from Supabase PostgreSQL
  const loadShopData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const activeUser = userProfile || user;
      const [dbTemplates, dbCustomers, dbOrders, dbServices, dbStatuses] = await Promise.all([
        measurementTemplatesService.getMeasurementTemplates(shopId),
        customersService.getCustomers(shopId),
        ordersService.getOrders(shopId, activeUser),
        catalogServicesService.getServices(shopId),
        productionService.getProductionStatuses(shopId)
      ]);

      if (dbTemplates !== null && Array.isArray(dbTemplates)) {
        setMeasurementTemplates(dbTemplates);
      }

      let formattedInvoices = [];
      if (dbOrders !== null) {
        let maxInvoiceNum = 1000;
        formattedInvoices = dbOrders.map(ord => {
          const invNumStr = ord.invoice_number || ord.id;
          if (invNumStr) {
            const match = String(invNumStr).match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxInvoiceNum) maxInvoiceNum = num;
            }
          }

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
            customerName: ord.customers?.name || ord.customer_name || 'Customer',
            phone: ord.customers?.phone || ord.customer_phone || '',
            customers: ord.customers,
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
            created_at: ord.created_at,
            archived_in_register: Boolean(ord.archived_in_register)
          };
        });
        setInvoices(formattedInvoices);
        setSettings(prev => ({ ...prev, nextInvoiceNumber: maxInvoiceNum + 1 }));
        if (formattedInvoices.length > 0) {
          setSelectedInvoiceId(formattedInvoices[0].id);
        }
      }

      if (dbCustomers !== null) {
        const defaultMeas = getFallbackDefaultMeasurements();
        const formattedCustomers = dbCustomers.map(c => {
          const measurementsObj = JSON.parse(JSON.stringify(defaultMeas));
          if (c.measurements && Array.isArray(c.measurements)) {
            c.measurements.forEach(m => {
              if (m.garment_type) {
                const typeKey = m.garment_type.toLowerCase();
                measurementsObj[typeKey] = {
                  ...(defaultMeas[typeKey] || {}),
                  ...(m.measurements || {}),
                  notes: m.notes || m.measurements?.notes || '',
                  suppliedGarment: Boolean(m.is_customer_supplied || m.measurements?.suppliedGarment)
                };
              }
            });
          }

          const custInvoices = formattedInvoices.filter(inv => inv.customerId === c.id || (inv.phone && c.phone && isPhoneMatch(c.phone, inv.phone)));
          const totalOrders = custInvoices.length;
          const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
          const outstanding = custInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
          const lastOrderDisplay = custInvoices[0] ? custInvoices[0].date : (c.last_order_date ? c.last_order_date.split('T')[0] : 'N/A');

          return {
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address || '',
            notes: c.notes || '',
            measurements: measurementsObj,
            totalOrders,
            totalSpent,
            outstanding,
            lastOrder: lastOrderDisplay,
            last_order_date: c.last_order_date || (custInvoices[0] ? custInvoices[0].date : null),
            is_favourite: Boolean(c.is_favourite),
            created_at: c.created_at
          };
        });
        setCustomers(formattedCustomers);
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
    } finally {
      setIsHydrated(true);
    }
  }, [shopId, user, userProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    loadShopData().then(() => {
      loadAnalytics();
      loadExpenses();
    });

    // Supabase Realtime Channel Subscription for instant sync
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        loadShopData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadShopData();
        loadAnalytics();
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        loadShopData();
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_assignments' }, () => {
        loadShopData();
        loadWorkersData();
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_assignments' }, () => {
        loadShopData();
        loadWorkersData();
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        loadShopData();
        loadAnalytics();
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        loadExpenses();
        loadAnalytics();
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'measurements' }, () => {
        // Handle measurements changes cleanly without full DB reload loop
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, () => {
        // Audit log table - do not invoke loadShopData() to prevent infinite refetch loop
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_statuses' }, () => {
        loadShopData();
        window.dispatchEvent(new CustomEvent('shop-data-updated'));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Global event listener for instant cross-screen synchronization
  useEffect(() => {
    const handleGlobalUpdate = () => {
      loadShopData();
      loadAnalytics();
      loadExpenses();
    };

    window.addEventListener('shop-data-updated', handleGlobalUpdate);
    return () => window.removeEventListener('shop-data-updated', handleGlobalUpdate);
  }, []);

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
      const role = res.profile?.role || 'OWNER';
      setUserRole(role);
      const defaultView = role === 'WORKER' ? 'registers' : 'dashboard';
      setCurrentView(defaultView);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/' + (defaultView === 'new-invoice' ? 'invoice' : defaultView));
      }
    }
    return res;
  };

  const logout = async (skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmSignOut = window.confirm("Are you sure you want to sign out?");
      if (!confirmSignOut) return { success: false, cancelled: true };
    }
    await authService.logout();
    setUser(null);
    setUserProfile(null);
    setUserRole(null);
    setCurrentView('login');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/login');
    }
    return { success: true };
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
    if (!user) {
      setCurrentView('login');
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/login');
      }
      return;
    }

    // Role-based navigation guard
    if (userRole === 'WORKER') {
      const workerTabs = userProfile?.permissions?.tabs || user?.permissions?.tabs || [];
      const hasCustPerm = 
        workerTabs.includes('customers') ||
        workerTabs.includes('Customer Profiles') ||
        workerTabs.includes('Customer Directory & Ledger') ||
        userProfile?.permissions?.features?.view_customers === true ||
        userProfile?.permissions?.VIEW_CUSTOMER_PROFILE === true ||
        userProfile?.permissions?.VIEW_CUSTOMER_CONTACT === true;

      if (view === 'customers' && !hasCustPerm) {
        showToast("Access Restricted", "You do not have permission to view Customer Profiles. Contact your shop owner.", "warning");
        return;
      }
      if (view === 'settings' || view === 'new-invoice' || view === 'workers') {
        showToast("Access Restricted", "Owner permissions required for this section.", "warning");
        return;
      }
    }

    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const urlPath = view === 'new-invoice' ? '/invoice' : '/' + view;
      window.history.pushState({}, '', urlPath);
    }

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

  const refreshCustomerProfileData = useCallback(async (customerId) => {
    if (!isSupabaseConfigured || !customerId) return;
    try {
      const fullProfile = await customersService.getCustomerFullProfile(shopId, customerId);
      if (!fullProfile || !fullProfile.customer) return;

      const defaultMeas = getFallbackDefaultMeasurements();
      const measurementsObj = JSON.parse(JSON.stringify(defaultMeas));

      if (fullProfile.measurements && typeof fullProfile.measurements === 'object') {
        Object.entries(fullProfile.measurements).forEach(([garmentKey, measData]) => {
          const lowerKey = garmentKey.toLowerCase();
          measurementsObj[lowerKey] = {
            ...(defaultMeas[lowerKey] || {}),
            ...measData
          };
        });
      }

      const hasFilledMeas = (obj) => {
        if (!obj || typeof obj !== 'object') return false;
        return Object.values(obj).some(garment => {
          if (!garment || typeof garment !== 'object') return false;
          if (garment.suppliedGarment) return true;
          return Object.entries(garment).some(([k, v]) => 
            k !== 'suppliedGarment' && k !== 'notes' && v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-'
          );
        });
      };

      if (!hasFilledMeas(measurementsObj) && fullProfile.orders && fullProfile.orders.length > 0) {
        const orderWithMeas = fullProfile.orders.find(ord => ord.measurement_snapshot && hasFilledMeas(ord.measurement_snapshot));
        if (orderWithMeas && orderWithMeas.measurement_snapshot) {
          Object.entries(orderWithMeas.measurement_snapshot).forEach(([gKey, mData]) => {
            if (mData && typeof mData === 'object') {
              const lowerKey = gKey.toLowerCase();
              measurementsObj[lowerKey] = {
                ...(defaultMeas[lowerKey] || {}),
                ...mData
              };
            }
          });
          await measurementsService.saveAllCustomerMeasurements(shopId, customerId, measurementsObj);
        }
      }

      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const freshBalance = fullProfile.customer.outstanding_balance !== undefined 
            ? parseFloat(fullProfile.customer.outstanding_balance) || 0 
            : c.outstanding;
          return {
            ...c,
            name: fullProfile.customer.name || c.name,
            phone: fullProfile.customer.phone || c.phone,
            address: fullProfile.customer.address !== undefined ? fullProfile.customer.address : c.address,
            notes: fullProfile.customer.notes !== undefined ? fullProfile.customer.notes : c.notes,
            outstanding: freshBalance,
            outstanding_balance: freshBalance,
            measurements: measurementsObj
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error refreshing customer profile data:', err);
    }
  }, [shopId]);

  const openCustomerProfile = useCallback((customerId) => {
    setActiveProfileCustomerId(customerId);
    if (customerId) {
      refreshCustomerProfileData(customerId);
    }
  }, [refreshCustomerProfileData]);

  const closeCustomerProfile = useCallback(() => {
    setActiveProfileCustomerId(null);
  }, []);

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

  const moveProductionStatus = async (statusId, direction) => {
    const idx = productionStatuses.findIndex(ps => ps.id === statusId || ps.name === statusId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= productionStatuses.length) return;
    const updated = [...productionStatuses];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setProductionStatuses(updated);
    if (isSupabaseConfigured) {
      await productionService.reorderProductionStatuses(shopId, updated);
    }
  };

  const reorderProductionStatuses = async (newStatuses) => {
    if (Array.isArray(newStatuses)) {
      setProductionStatuses(newStatuses);
      if (isSupabaseConfigured) {
        await productionService.reorderProductionStatuses(shopId, newStatuses);
      }
    }
  };

  const deleteProductionStatus = async (statusId, reassignStatusName = null, force = false) => {
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
    if (isSupabaseConfigured) {
      await productionService.deleteProductionStatus(shopId, targetStatus.id, targetStatus.name);
    }
    showToast("Status Deleted", `Removed stage ${targetStatus.name} from workflow`, "info");
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

  // Delivery Order Handler (Flexible Partial/Full Payment)
  const deliverOrder = async (invoiceId, amountPaidNow = 0, paymentMode = 'Cash') => {
    if (!invoiceId) return { success: false, error: 'No order ID provided' };

    const targetInv = invoices.find(inv => 
      inv.id === invoiceId || 
      inv.dbId === invoiceId || 
      (inv.invoice_number && String(inv.invoice_number) === String(invoiceId))
    );
    const targetId = targetInv?.dbId || (isUuid(invoiceId) ? invoiceId : (targetInv?.id || invoiceId));
    const customerId = targetInv?.customerId || targetInv?.customer_id;
    const invoiceNum = targetInv?.id || targetInv?.invoice_number || invoiceId;

    const currentTotal = parseFloat(targetInv?.total || targetInv?.total_amount || 0);
    const currentPaid = parseFloat(targetInv?.advancePaid || targetInv?.total_paid || 0);
    const currentBal = targetInv?.balance !== undefined ? targetInv.balance : Math.max(0, currentTotal - currentPaid);

    let addPayment = 0;
    if (typeof amountPaidNow === 'boolean') {
      addPayment = amountPaidNow ? currentBal : 0;
    } else {
      addPayment = Math.max(0, parseFloat(amountPaidNow) || 0);
    }

    const newPaid = Math.min(currentTotal, currentPaid + addPayment);
    const newBalance = Math.max(0, currentTotal - newPaid);

    // 1. Execute Supabase backend operation first
    if (isSupabaseConfigured) {
      try {
        const res = await ordersService.deliverOrder(shopId, targetId, addPayment, paymentMode, userProfile?.id);
        if (res && res.success === false) {
          const errMsg = res.error || "Failed to process delivery in database";
          showToast("Delivery Failed", errMsg, "error");
          return { success: false, error: errMsg };
        }
        if (customerId) {
          await updateCustomerBalance(customerId);
          await refreshCustomerProfileData(customerId);
        }
        await refetchOrders();
        if (loadAnalytics) loadAnalytics();
      } catch (err) {
        console.error('Error delivering order in context:', err);
        const errMsg = err?.message || "Failed to process delivery";
        showToast("Delivery Failed", errMsg, "error");
        return { success: false, error: errMsg };
      }
    } else if (customerId) {
      updateCustomerBalance(customerId);
    }

    // 2. Update local state upon successful backend delivery
    setInvoices(prev => prev.map(inv => {
      const isMatch = inv.id === invoiceNum || inv.id === invoiceId || (targetId && inv.dbId === targetId) || (inv.invoice_number && String(inv.invoice_number) === String(invoiceId));
      if (!isMatch) return inv;

      const updatedServices = inv.services ? inv.services.map(s => ({ ...s, status: 'DELIVERED', task_status: 'DELIVERED' })) : [];

      return {
        ...inv,
        advancePaid: newPaid,
        total_paid: newPaid,
        balance: newBalance,
        balance_amount: newBalance,
        status: 'DELIVERED',
        overall_status: 'DELIVERED',
        workflow_status: 'DELIVERED',
        is_delivered: true,
        delivered_at: inv.delivered_at || new Date().toISOString(),
        paymentMode: addPayment > 0 ? (paymentMode || inv.paymentMode) : inv.paymentMode,
        services: updatedServices
      };
    }));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shop-data-updated'));
    }

    showToast(
      newBalance === 0 ? "Order Delivered & Paid" : "Order Delivered with Partial Balance",
      newBalance === 0 ? `${invoiceNum} delivered and payment fully settled` : `${invoiceNum} delivered. Remaining balance: ₹${newBalance}`,
      "success"
    );

    return { success: true };
  };

  const markAsDelivered = async (orderId) => {
    return deliverOrder(orderId, 0);
  };

  const archiveOrderInRegister = async (orderId) => {
    if (!orderId) return { success: false };
    const targetInv = invoices.find(inv => inv.id === orderId || inv.dbId === orderId);
    const targetDbId = targetInv?.dbId || orderId;

    setInvoices(prev => prev.map(inv => {
      if (inv.id === orderId || (targetDbId && inv.dbId === targetDbId)) {
        return { ...inv, archived_in_register: true };
      }
      return inv;
    }));

    if (isSupabaseConfigured && targetDbId) {
      await ordersService.archiveOrderInRegister(shopId, targetDbId);
    }
    showToast("Order Archived", `Order #${orderId} removed from Registers view`, "info");
    return { success: true };
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
    let nextOverallStatus = 'IN PROGRESS';

    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;

      const updatedServices = inv.services.map(svc => {
        if (svc.id === serviceId) {
          return { ...svc, status: newStatus.toUpperCase() };
        }
        return svc;
      });

      nextOverallStatus = computeOverallInvoiceStatus({ ...inv, services: updatedServices });

      return {
        ...inv,
        services: updatedServices,
        status: nextOverallStatus
      };
    }));

    if (isSupabaseConfigured) {
      try {
        await productionService.updateItemStatus(shopId, targetId, serviceId, newStatus, userProfile?.id, nextOverallStatus);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shop-data-updated'));
        }
      } catch (err) {
        console.warn("Notice in background updateServiceStatus:", err);
      }
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

  const updateCustomerBalance = async (customerId) => {
    if (!customerId) return 0;
    
    let newOutstandingBalance = 0;

    if (isSupabaseConfigured && isUuid(customerId)) {
      try {
        const { data: custOrders } = await supabase
          .from('orders')
          .select('total_amount, total_paid, status')
          .eq('customer_id', customerId);

        newOutstandingBalance = (custOrders || []).reduce((sum, o) => {
          const isCancelled = (o.status || '').toUpperCase() === 'CANCELLED';
          if (isCancelled) return sum;
          const tot = parseFloat(o.total_amount) || 0;
          const pd = parseFloat(o.total_paid) || 0;
          return sum + Math.max(0, tot - pd);
        }, 0);

        await supabase
          .from('customers')
          .update({ outstanding_balance: newOutstandingBalance, updated_at: new Date().toISOString() })
          .eq('id', customerId);
      } catch (e) {
        console.warn('Notice recalculating customer balance in database:', e);
      }
    } else {
      const targetCustomer = customers.find(c => c.id === customerId);
      const customerOrders = invoices.filter(o => 
        (o.customerId && o.customerId === customerId) ||
        (o.customer_id && o.customer_id === customerId) ||
        (targetCustomer?.phone && o.phone && isPhoneMatch(targetCustomer.phone, o.phone))
      );

      newOutstandingBalance = customerOrders.reduce((sum, o) => {
        const isCancelled = (o.status || o.overall_status || '').toUpperCase() === 'CANCELLED';
        if (isCancelled) return sum;
        const total = parseFloat(o.total || o.total_amount || 0);
        const paid = parseFloat(o.advancePaid || o.total_paid || o.amount_paid || 0);
        const pending = parseFloat(o.balance !== undefined ? o.balance : Math.max(0, total - paid));
        return sum + Math.max(0, pending);
      }, 0);
    }

    setCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, outstanding: newOutstandingBalance, outstanding_balance: newOutstandingBalance } : c
    ));

    return newOutstandingBalance;
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
          measurements: updatedData.measurements || c.measurements,
          is_favourite: updatedData.is_favourite !== undefined ? Boolean(updatedData.is_favourite) : c.is_favourite
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

  const toggleCustomerFavourite = async (customerId, currentStatus = undefined) => {
    if (!customerId) return;
    const target = customers.find(c => c.id === customerId);
    const currStatus = currentStatus !== undefined ? currentStatus : Boolean(target?.is_favourite);
    const nextStatus = !currStatus;

    // A. INSTANT LOCAL STATE UPDATE (ZERO LAG)
    setCustomers(prev => 
      prev.map(c => c.id === customerId ? { ...c, is_favourite: nextStatus } : c)
    );

    // B. BACKGROUND SUPABASE SYNC
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('customers')
          .update({ is_favourite: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', String(customerId));

        if (error) {
          // Revert on error
          setCustomers(prev => 
            prev.map(c => c.id === customerId ? { ...c, is_favourite: currStatus } : c)
          );
          console.error("Favourite update failed:", error);
        }
      } catch (err) {
        setCustomers(prev => 
          prev.map(c => c.id === customerId ? { ...c, is_favourite: currStatus } : c)
        );
        console.error("Favourite update exception:", err);
      }
    }
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
    const isEdit = Boolean(invoiceData.isEditMode || (editingOrder && (editingOrder.id === invoiceData.id || editingOrder.dbId === invoiceData.dbId)));
    let customerObj = customers.find(c => (c.id && invoiceData.customerId && c.id === invoiceData.customerId) || (c.phone && invoiceData.phone && isPhoneMatch(invoiceData.phone, c.phone)));
    const updatedCustomerMeasurements = invoiceData.measurements || (customerObj ? customerObj.measurements : undefined);

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
      const targetDbId = invoiceData.dbId || editingOrder?.dbId;
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoiceData.id || (targetDbId && inv.dbId === targetDbId)) {
          return {
            ...inv,
            ...invoiceData,
            balance,
            extraPaid,
            paymentStatus,
            services: servicesWithStatus,
            customerId: customerObj?.id || invoiceData.customerId,
            customerName: invoiceData.customerName,
            measurements: invoiceData.measurements || inv.measurements
          };
        }
        return inv;
      }));

      if (isSupabaseConfigured && targetDbId) {
        const updateRes = await ordersService.updateOrder(shopId, targetDbId, invoiceData);
        if (updateRes && updateRes.success === false) {
          showToast("Update Failed", updateRes.error || "Failed to update order", "error");
          return { success: false, error: updateRes.error };
        }
        if (customerObj?.id && updatedCustomerMeasurements) {
          await measurementsService.saveAllCustomerMeasurements(shopId, customerObj.id, updatedCustomerMeasurements);
        }
      }

      showToast("Invoice Updated", `Saved changes to ${invoiceData.id}`, "success");
      setSelectedInvoiceId(invoiceData.id);
      navigateTo('invoice-detail', { invoiceId: invoiceData.id });
      return { success: true, invoiceId: invoiceData.id };
    }

    // New Order Save Flow
    let proposedId = `${settings.invoicePrefix}${settings.nextInvoiceNumber}`;
    let finalInvoiceId = proposedId;
    let createdDbId = null;
    let realCustomerId = customerObj?.id;

    if (isSupabaseConfigured) {
      const orderRes = await ordersService.createOrder(
        shopId,
        {
          ...invoiceData,
          invoice_number: proposedId,
          customerId: realCustomerId,
          customerName: invoiceData.customerName,
          phone: invoiceData.phone,
          address: invoiceData.address || "Local Customer",
          services: servicesWithStatus,
          advancePaid,
          paymentMode: invoiceData.paymentMode || 'CASH',
          measurements: updatedCustomerMeasurements || getFallbackDefaultMeasurements()
        },
        user?.id || userProfile?.id
      );

      if (!orderRes?.success) {
        console.error("Failed to save order to Supabase:", orderRes?.error);
        showToast(
          "Order Creation Failed",
          orderRes?.error || "Could not persist order to database",
          "error"
        );
        return { success: false, error: orderRes?.error };
      }

      if (orderRes.data) {
        createdDbId = orderRes.data.id;
        if (orderRes.data.invoice_number) {
          finalInvoiceId = orderRes.data.invoice_number;
        }
        if (orderRes.data.customer_id) {
          realCustomerId = orderRes.data.customer_id;
        }
      }

      if (realCustomerId && updatedCustomerMeasurements) {
        await measurementsService.saveAllCustomerMeasurements(shopId, realCustomerId, updatedCustomerMeasurements);
      }
    }

    const nowIso = new Date().toISOString();
    const todayStr = invoiceData.date || nowIso.split('T')[0];

    if (!customerObj) {
      customerObj = {
        id: realCustomerId || generateUniqueId('CUST'),
        name: invoiceData.customerName,
        phone: invoiceData.phone,
        address: invoiceData.address || "Local Customer",
        totalOrders: 1,
        totalSpent: invoiceData.total || 0,
        outstanding: balance,
        lastOrder: todayStr,
        last_order_date: nowIso,
        notes: invoiceData.notes || "",
        measurements: updatedCustomerMeasurements || getFallbackDefaultMeasurements()
      };
      setCustomers(prev => [customerObj, ...prev]);
    } else {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerObj.id) {
          return {
            ...c,
            name: invoiceData.customerName || c.name,
            address: invoiceData.address || c.address,
            totalOrders: (c.totalOrders || 0) + 1,
            totalSpent: (c.totalSpent || 0) + total,
            outstanding: (c.outstanding || 0) + balance,
            lastOrder: todayStr,
            last_order_date: nowIso,
            measurements: updatedCustomerMeasurements || c.measurements
          };
        }
        return c;
      }));
    }

    if (isSupabaseConfigured && (realCustomerId || customerObj?.id)) {
      const targetCustId = realCustomerId || customerObj?.id;
      try {
        await supabase
          .from('customers')
          .update({ last_order_date: nowIso, updated_at: nowIso })
          .eq('id', targetCustId);
      } catch (e) {}
    }

    const fullInvoice = {
      material: "Customer Fabric",
      garmentType: "Custom Stitching",
      ...invoiceData,
      id: finalInvoiceId,
      invoice_number: finalInvoiceId,
      dbId: createdDbId,
      balance,
      extraPaid,
      paymentStatus,
      services: servicesWithStatus,
      customerId: customerObj.id,
      customerName: customerObj.name,
      status: invoiceData.status || "PENDING",
      measurements: updatedCustomerMeasurements || getFallbackDefaultMeasurements()
    };

    setInvoices(prev => [fullInvoice, ...prev]);

    const numMatch = String(finalInvoiceId).match(/\d+/);
    if (numMatch) {
      const numVal = parseInt(numMatch[0], 10);
      if (!isNaN(numVal)) {
        setSettings(prev => ({ ...prev, nextInvoiceNumber: Math.max(prev.nextInvoiceNumber, numVal + 1) }));
      }
    } else {
      setSettings(prev => ({ ...prev, nextInvoiceNumber: prev.nextInvoiceNumber + 1 }));
    }

    setNotifications(prev => [
      {
        id: generateUniqueId('notif'),
        title: "New Order Created",
        message: `${finalInvoiceId} for ${customerObj.name} (₹${invoiceData.total})`,
        time: "Just now",
        read: false,
        type: "success"
      },
      ...prev
    ]);

    showToast("Invoice Saved", `Successfully generated ${finalInvoiceId}`, "success");
    setSelectedInvoiceId(finalInvoiceId);
    
    // Refresh analytics & customer profile data
    loadAnalytics();
    if (customerObj?.id) {
      refreshCustomerProfileData(customerObj.id);
    }

    return { success: true, invoiceId: finalInvoiceId, dbId: createdDbId };
  };

  const addInvoice = saveInvoice;

  const refetchOrders = useCallback(async () => {
    await loadShopData();
  }, [loadShopData]);

  const recordPayment = async (invoiceId, amount, mode) => {
    const targetInv = invoices.find(inv => inv.id === invoiceId || inv.dbId === invoiceId);
    const targetDbId = targetInv?.dbId || invoiceId;
    const customerId = targetInv?.customerId || targetInv?.customer_id;

    if (isSupabaseConfigured) {
      try {
        const res = await paymentsService.recordPayment(shopId, targetDbId, amount, mode, null, '', userProfile?.id);
        if (res && res.success === false) {
          const errMsg = res.error || "Could not record payment";
          showToast("Payment Failed", errMsg, "error");
          return { success: false, error: errMsg };
        }
        if (customerId) {
          await updateCustomerBalance(customerId);
          await refreshCustomerProfileData(customerId);
        }
        await refetchOrders();
      } catch (err) {
        console.error("Error in recordPayment handler:", err);
        const errMsg = err?.message || "Could not record payment";
        showToast("Payment Failed", errMsg, "error");
        return { success: false, error: errMsg };
      }
    } else if (customerId) {
      updateCustomerBalance(customerId);
    }

    setInvoices(prev => prev.map(inv => {
      const isMatch = inv.id === invoiceId || inv.dbId === invoiceId || (targetDbId && inv.dbId === targetDbId) || (inv.invoice_number && String(inv.invoice_number) === String(invoiceId));
      if (!isMatch) return inv;

      const totalVal = parseFloat(inv.total || inv.total_amount || 0);
      const newAdvance = (parseFloat(inv.advancePaid || inv.total_paid || 0)) + amount;
      const newBalance = Math.max(0, totalVal - newAdvance);
      const isPaid = newBalance === 0;
      const pStatus = isPaid ? 'PAID' : (newAdvance > 0 ? 'PARTIALLY PAID' : 'UNPAID');

      return {
        ...inv,
        advancePaid: newAdvance,
        total_paid: newAdvance,
        advance_paid: newAdvance,
        paid_amount: newAdvance,
        amount_paid: newAdvance,
        balance: newBalance,
        balance_amount: newBalance,
        pending_amount: newBalance,
        balance_due: newBalance,
        paymentStatus: pStatus,
        payment_status: pStatus,
        status: isPaid && inv.status !== 'DELIVERED' ? 'PAID' : inv.status,
        paymentMode: mode || inv.paymentMode
      };
    }));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shop-data-updated'));
    }

    showToast("Payment Recorded", `₹${amount} recorded for ${invoiceId}`, "success");
    return { success: true };
  };

  const settlePayment = async (orderId) => {
    const targetInv = invoices.find(inv => inv.id === orderId || inv.dbId === orderId);
    const targetDbId = targetInv?.dbId || orderId;
    const customerId = targetInv?.customerId || targetInv?.customer_id;

    setInvoices(prev => prev.map(inv => {
      const isMatch = inv.id === orderId || inv.dbId === orderId || (targetDbId && inv.dbId === targetDbId) || (inv.invoice_number && String(inv.invoice_number) === String(orderId));
      if (!isMatch) return inv;
      const totalVal = parseFloat(inv.total || inv.total_amount || 0);

      return {
        ...inv,
        advancePaid: totalVal,
        total_paid: totalVal,
        advance_paid: totalVal,
        paid_amount: totalVal,
        amount_paid: totalVal,
        balance: 0,
        balance_amount: 0,
        pending_amount: 0,
        balance_due: 0,
        paymentStatus: 'PAID',
        payment_status: 'PAID',
        status: inv.status === 'DELIVERED' ? 'DELIVERED' : (inv.status || 'PAID')
      };
    }));

    if (isSupabaseConfigured && targetDbId) {
      try {
        const res = await ordersService.settleOrderPayment(shopId, targetDbId, userProfile?.id);
        if (res && res.success === false) {
          showToast("Settlement Failed", res.error || "Failed to settle payment", "error");
          return { success: false, error: res.error };
        }
        if (customerId) {
          await updateCustomerBalance(customerId);
          await refreshCustomerProfileData(customerId);
        }
        await refetchOrders();
      } catch (err) {
        console.error("Error in settlePayment handler:", err);
        showToast("Settlement Failed", err?.message || "Failed to settle payment", "error");
        return { success: false, error: err.message };
      }
    } else if (customerId) {
      updateCustomerBalance(customerId);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shop-data-updated'));
    }

    showToast("Balance Settled", `Settled full remaining balance for ${orderId}`, "success");
    return { success: true };
  };

  const deleteOrder = async (orderId) => {
    if (!orderId) return { success: false };

    const targetInv = invoices.find(inv => inv.id === orderId || inv.dbId === orderId);
    const targetDbId = targetInv?.dbId || orderId;
    const customerId = targetInv?.customerId;

    // Filter out deleted order from invoices state
    const remainingInvoices = invoices.filter(inv => inv.id !== orderId && (targetDbId ? inv.dbId !== targetDbId : true));
    setInvoices(remainingInvoices);

    // Dynamic Measurement Fallback Rule on Order Deletion (Requirements 10-15 & 38)
    if (customerId) {
      const custRemainingInvoices = remainingInvoices.filter(inv => 
        (inv.customerId && inv.customerId === customerId) ||
        (inv.phone && targetInv?.phone && isPhoneMatch(targetInv.phone, inv.phone))
      );

      // Check if the deleted order was the latest order for this customer
      const wasLatestOrder = targetInv && (!custRemainingInvoices.length || 
        new Date(targetInv.created_at || targetInv.date).getTime() >= 
        Math.max(...custRemainingInvoices.map(i => new Date(i.created_at || i.date).getTime()))
      );

      if (wasLatestOrder) {
        if (custRemainingInvoices.length > 0) {
          // Fall back to the latest remaining order's measurement snapshot
          const latestRemaining = custRemainingInvoices[0];
          if (latestRemaining.measurements && Object.keys(latestRemaining.measurements).length > 0) {
            if (isSupabaseConfigured) {
              await measurementsService.saveAllCustomerMeasurements(shopId, customerId, latestRemaining.measurements);
            }
            setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, measurements: latestRemaining.measurements } : c));
          }
        } else {
          // No orders left -> fall back to initial customer baseline measurements if available
          const cust = customers.find(c => c.id === customerId);
          if (cust && cust.baselineMeasurements) {
            if (isSupabaseConfigured) {
              await measurementsService.saveAllCustomerMeasurements(shopId, customerId, cust.baselineMeasurements);
            }
            setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, measurements: cust.baselineMeasurements } : c));
          }
        }
      }

      // Update customer aggregates (orders count, total spent, outstanding balance, last order date)
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const totalOrders = custRemainingInvoices.length;
          const totalSpent = custRemainingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
          const outstanding = custRemainingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
          const lastOrder = custRemainingInvoices[0] ? custRemainingInvoices[0].date : 'N/A';

          return {
            ...c,
            totalOrders,
            totalSpent,
            outstanding,
            lastOrder
          };
        }
        return c;
      }));
    }

    // Call Supabase DB Delete
    if (isSupabaseConfigured && targetDbId) {
      await ordersService.deleteOrder(shopId, targetDbId);
    }

    showToast("Order Deleted", `Successfully removed order ${targetInv?.id || orderId}`, "info");
    return { success: true };
  };

  const saveCustomerMeasurements = async (customerId, garmentType, measurements, notes) => {
    if (!customerId) return;
    setCustomers(prev => prev.map(c => {
      if (c && c.id === customerId) {
        return {
          ...c,
          notes: notes !== undefined ? notes : c.notes,
          measurements: {
            ...(c.measurements || {}),
            ...(garmentType ? { [garmentType]: measurements || {} } : {})
          }
        };
      }
      return c;
    }));

    if (isSupabaseConfigured && customerId && garmentType) {
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

    let createdCustObj = null;
    let dbId = generateUniqueId('CUST');

    if (isSupabaseConfigured) {
      const res = await customersService.createCustomerWithMeasurements(shopId, customerData);
      if (res?.success && res.data) {
        dbId = res.data.id;
        const defaultMeas = getFallbackDefaultMeasurements();
        const measurementsObj = JSON.parse(JSON.stringify(defaultMeas));

        if (customerData.measurements) {
          Object.keys(customerData.measurements).forEach(garment => {
            const meas = customerData.measurements[garment];
            if (meas && typeof meas === 'object') {
              measurementsObj[garment.toLowerCase()] = {
                ...(defaultMeas[garment.toLowerCase()] || {}),
                ...meas
              };
            }
          });
        }

        if (res.data.measurements && Array.isArray(res.data.measurements)) {
          res.data.measurements.forEach(m => {
            if (m.garment_type) {
              const typeKey = m.garment_type.toLowerCase();
              measurementsObj[typeKey] = {
                ...(defaultMeas[typeKey] || {}),
                ...(measurementsObj[typeKey] || {}),
                ...(m.measurements || {}),
                notes: m.notes || m.measurements?.notes || '',
                suppliedGarment: Boolean(m.is_customer_supplied || m.measurements?.suppliedGarment)
              };
            }
          });
        }

        createdCustObj = {
          id: res.data.id,
          name: res.data.name,
          phone: res.data.phone,
          address: res.data.address || '',
          notes: res.data.notes || '',
          measurements: measurementsObj,
          totalOrders: 0,
          totalSpent: 0,
          outstanding: 0,
          lastOrder: 'N/A',
          created_at: res.data.created_at
        };
      }
    }

    const defaultMeas = getFallbackDefaultMeasurements();
    const fallbackMeasurements = JSON.parse(JSON.stringify(defaultMeas));
    if (customerData.measurements) {
      Object.keys(customerData.measurements).forEach(garment => {
        const meas = customerData.measurements[garment];
        if (meas && typeof meas === 'object') {
          fallbackMeasurements[garment.toLowerCase()] = {
            ...(defaultMeas[garment.toLowerCase()] || {}),
            ...meas
          };
        }
      });
    }

    const newCust = createdCustObj || {
      id: dbId,
      totalOrders: 0,
      totalSpent: 0,
      outstanding: 0,
      lastOrder: "N/A",
      notes: customerData.notes || "",
      measurements: fallbackMeasurements,
      ...customerData
    };

    setCustomers(prev => [newCust, ...prev.filter(c => c.id !== newCust.id)]);
    showToast("Customer Added", `${newCust.name} added to customer database`, "success");
    return newCust;
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const computedTodayRevenue = invoices.reduce((sum, inv) => {
    const isToday = (inv.date && inv.date.startsWith(todayStr)) || (inv.created_at && inv.created_at.startsWith(todayStr));
    if (isToday) {
      return sum + (parseFloat(inv.advancePaid) || 0);
    }
    if ((inv.status || '').toUpperCase() === 'DELIVERED' && (parseFloat(inv.advancePaid) || 0) > 0) {
      return sum + (parseFloat(inv.advancePaid) || 0);
    }
    return sum;
  }, 0);

  const todayRevVal = analyticsData.summary?.today_revenue ?? computedTodayRevenue;
  const todayExpVal = analyticsData.summary?.today_expenses ?? (expenses || [])
    .filter(e => e.expense_date && e.expense_date.startsWith(todayStr))
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const stats = {
    todayRevenue: todayRevVal,
    todaySales: analyticsData.summary?.today_sales ?? invoices.filter(i => (i.date && i.date.startsWith(todayStr)) || (i.created_at && i.created_at.startsWith(todayStr))).reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0),
    todayOrders: analyticsData.summary?.today_orders ?? invoices.filter(i => (i.date && i.date.startsWith(todayStr)) || (i.created_at && i.created_at.startsWith(todayStr))).length,
    totalInvoices: analyticsData.summary?.total_invoices ?? invoices.length,
    pendingOrders: analyticsData.summary?.pending_orders ?? invoices.filter(i => (i.status || '').toUpperCase() !== 'DELIVERED').length,
    readyForDelivery: analyticsData.summary?.ready_orders ?? invoices.filter(i => (i.status || '').toUpperCase() === 'READY').length,
    totalOutstanding: analyticsData.summary?.total_outstanding ?? invoices.reduce((acc, curr) => acc + (parseFloat(curr.balance) || 0), 0),
    todayExpenses: todayExpVal,
    estimatedNet: todayRevVal - todayExpVal,
    statusCounts: {
      cutting: invoices.filter(i => (i.status || '').toUpperCase() === 'CUTTING').length,
      stitching: invoices.filter(i => (i.status || '').toUpperCase() === 'STITCHING').length,
      packing: invoices.filter(i => (i.status || '').toUpperCase() === 'PACKING').length,
      ready: invoices.filter(i => (i.status || '').toUpperCase() === 'READY').length,
      delivered: invoices.filter(i => (i.status || '').toUpperCase() === 'DELIVERED').length
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
  const [customerAssignmentsMap, setCustomerAssignmentsMap] = useState({});

  const loadWorkersData = async () => {
    const list = await workersService.getWorkers(shopId);
    setWorkersList(list);
    const assignments = await workersService.getAssignments(shopId);
    setOrderAssignmentsMap(assignments);
    const custAssignments = await workersService.getCustomerAssignments(shopId);
    setCustomerAssignmentsMap(custAssignments);
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

  const createWorker = async ({ email, password, fullName, phone, permissions, name, role }) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can create worker accounts.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await workersService.createWorker({ shopId, email, password, fullName: fullName || name, phone, permissions, role });
    if (res?.success && res.worker) {
      const createdWorker = {
        ...res.worker,
        full_name: res.worker.name || res.worker.full_name || fullName || name,
        name: res.worker.name || res.worker.full_name || fullName || name,
        is_online: true,
        is_active: true,
        assignedCount: 0
      };
      setWorkersList(prev => [createdWorker, ...prev.filter(w => w.id !== createdWorker.id)]);
      showToast("Worker Created", `Account created for ${createdWorker.full_name}`, "success");
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
    setWorkersList(prev => prev.map(w => w.id === workerId ? { ...w, is_active: isActive, is_online: isActive, status: isActive ? 'ACTIVE' : 'INACTIVE' } : w));
    const res = await workersService.toggleStatus(workerId, isActive, shopId);
    if (res?.success) {
      showToast("Worker Status Updated", `Worker is now ${isActive ? 'ACTIVE' : 'DISABLED'}`, "info");
      loadWorkersData();
    } else {
      showToast("Update Failed", res?.error || "Failed to update status", "error");
      loadWorkersData();
    }
    return res;
  };

  const deleteWorker = async (workerId) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can delete worker accounts.", "error");
      return { success: false, error: "Unauthorized" };
    }
    setWorkersList(prev => prev.filter(w => w.id !== workerId));
    const res = await workersService.deleteWorker(workerId, shopId);
    if (res?.success) {
      showToast("Worker Deleted", "Worker profile has been deleted.", "info");
      loadWorkersData();
    } else {
      showToast("Delete Failed", res?.error || "Failed to delete worker", "error");
      loadWorkersData();
    }
    return res;
  };

  const assignOrderToWorker = async (orderId, workerIds, alsoAssignCustomer = false, customerId = null) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can assign orders.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const targetWorkerIds = Array.isArray(workerIds) ? workerIds.filter(Boolean) : (workerIds ? [workerIds] : []);

    const assignedObjects = targetWorkerIds.map(wId => {
      const w = (workersList || []).find(w => w.id === wId || w.auth_user_id === wId);
      return {
        workerId: wId,
        workerName: w ? (w.full_name || w.name) : 'Assigned Worker',
        assignedAt: new Date().toISOString()
      };
    });

    setOrderAssignmentsMap(prev => ({
      ...prev,
      [orderId]: assignedObjects
    }));

    if (alsoAssignCustomer && customerId) {
      setCustomerAssignmentsMap(prev => ({
        ...prev,
        [customerId]: assignedObjects
      }));
    }

    const res = await workersService.assignOrder({ shopId, orderId, workerIds: targetWorkerIds, assignedBy: userProfile?.id, customerId, alsoAssignCustomer });
    if (res?.success) {
      showToast("Assignment Updated", "Worker order assignments updated", "success");
      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach(warn => showToast("Worker Access Warning", warn, "warning"));
      }
      await loadWorkersData();
      window.dispatchEvent(new CustomEvent('shop-data-updated'));
    } else {
      showToast("Assignment Failed", res?.error || "Failed to assign order", "error");
      await loadWorkersData();
    }
    return res;
  };

  const assignCustomerToWorker = async (customerId, workerIds) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can assign customers.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const targetWorkerIds = Array.isArray(workerIds) ? workerIds.filter(Boolean) : (workerIds ? [workerIds] : []);

    const assignedObjects = targetWorkerIds.map(wId => {
      const w = (workersList || []).find(w => w.id === wId || w.auth_user_id === wId);
      return {
        workerId: wId,
        workerName: w ? (w.full_name || w.name) : 'Assigned Worker',
        assignedAt: new Date().toISOString()
      };
    });

    setCustomerAssignmentsMap(prev => ({
      ...prev,
      [customerId]: assignedObjects
    }));

    const res = await workersService.assignCustomer({ shopId, customerId, workerIds: targetWorkerIds, assignedBy: userProfile?.id });
    if (res?.success) {
      showToast("Customer Assigned", "Customer profile assignments updated", "success");
      if (res.warnings && res.warnings.length > 0) {
        res.warnings.forEach(warn => showToast("Worker Access Warning", warn, "warning"));
      }
      await loadWorkersData();
      window.dispatchEvent(new CustomEvent('shop-data-updated'));
    } else {
      showToast("Assignment Failed", res?.error || "Failed to assign customer", "error");
      await loadWorkersData();
    }
    return res;
  };

  const saveMeasurementTemplate = async (templateData) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can manage measurement templates.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await measurementTemplatesService.saveMeasurementTemplate(shopId, templateData);
    if (res?.success) {
      showToast("Measurement Template Saved", `Template "${templateData.name}" updated successfully`, "success");
      await loadShopData();
    } else {
      showToast("Save Failed", res?.error || "Failed to save measurement template", "error");
    }
    return res;
  };

  const toggleTemplateActive = async (templateId, isActive) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can change measurement templates.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await measurementTemplatesService.toggleTemplateActive(shopId, templateId, isActive);
    if (res?.success) {
      showToast("Template Updated", `Measurement template ${isActive ? 'enabled' : 'disabled'}`, "info");
      await loadShopData();
    } else {
      showToast("Update Failed", res?.error || "Failed to update template status", "error");
    }
    return res;
  };

  const deactivateTemplateField = async (fieldId) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can delete measurement fields.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await measurementTemplatesService.deactivateTemplateField(fieldId);
    if (res?.success) {
      showToast("Field Removed", "Measurement field deactivated", "info");
      await loadShopData();
    }
    return res;
  };

  const addTemplateField = async (templateId, fieldLabel, fieldUnit = 'inches') => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can add measurement fields.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await measurementTemplatesService.addTemplateField(templateId, fieldLabel, fieldUnit);
    if (res?.success) {
      showToast("Field Added", `Field "${fieldLabel}" added to preset`, "success");
      await loadShopData();
    } else {
      showToast("Add Failed", res?.error || "Failed to add field", "error");
    }
    return res;
  };

  const deleteTemplate = async (templateId) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can delete measurement presets.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await measurementTemplatesService.deleteTemplate(shopId, templateId);
    if (res?.success) {
      showToast("Preset Deleted", "Measurement preset removed successfully", "info");
      await loadShopData();
    } else {
      showToast("Delete Failed", res?.error || "Failed to delete preset", "error");
    }
    return res;
  };

  const renameMeasurementTemplate = async (templateId, newName) => {
    if (userRole !== 'OWNER') {
      showToast("Access Denied", "Only SHOP OWNER can rename measurement presets.", "error");
      return { success: false, error: "Unauthorized" };
    }
    const res = await measurementTemplatesService.renameMeasurementTemplate(shopId, templateId, newName);
    if (res?.success) {
      showToast("Preset Renamed", `Preset renamed to "${newName.trim()}"`, "success");
      await loadShopData();
    } else {
      showToast("Rename Failed", res?.error || "Failed to rename preset", "error");
    }
    return res;
  };

  const garmentMeasurementTypes = (Array.isArray(measurementTemplates) && measurementTemplates.length > 0)
    ? measurementTemplates
        .filter(t => t.is_active !== false)
        .map(t => ({ id: t.slug, label: t.name, isSystemDefault: t.is_system_default }))
    : GARMENT_MEASUREMENT_TYPES;

  const garmentMeasurementFields = {};
  if (Array.isArray(measurementTemplates) && measurementTemplates.length > 0) {
    measurementTemplates.forEach(t => {
      garmentMeasurementFields[t.slug] = (t.fields || []).map(f => ({
        id: f.id,
        key: f.key,
        label: f.label,
        unit: f.unit,
        type: f.type,
        placeholder: f.placeholder,
        required: f.required
      }));
    });
  } else {
    Object.assign(garmentMeasurementFields, GARMENT_MEASUREMENT_FIELDS);
  }

  const getDynamicDefaultMeasurements = () => {
    const defaults = {};
    garmentMeasurementTypes.forEach(t => {
      const typeFields = garmentMeasurementFields[t.id] || [];
      const fieldsObj = { suppliedGarment: false };
      typeFields.forEach(f => {
        fieldsObj[f.key] = '';
      });
      defaults[t.id] = fieldsObj;
    });
    return defaults;
  };

  const contextValue = useMemo(() => ({
    isAuthLoading,
    isHydrated,
    customers,
    invoices,
    services,
    settings,
    notifications,
    productionStatuses,
    measurementTemplates,
    garmentMeasurementTypes,
    garmentMeasurementFields,
    getDynamicDefaultMeasurements,
    saveMeasurementTemplate,
    renameMeasurementTemplate,
    toggleTemplateActive,
    deactivateTemplateField,
    addTemplateField,
    deleteTemplate,
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
    deleteOrder,
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
    markAsDelivered,
    archiveOrderInRegister,
    getCustomerStats,
    updateCustomerBalance,
    recordPayment,
    settlePayment,
    refetchOrders,
    saveCustomerMeasurements,
    addCustomer,
    updateCustomer,
    toggleCustomerFavourite,
    deleteCustomer,
    openCustomerProfile,
    closeCustomerProfile,
    refreshCustomerProfileData,
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
    customerAssignmentsMap,
    loadWorkersData,
    createWorker,
    updateWorkerPermissions,
    toggleWorkerStatus,
    deleteWorker,
    assignOrderToWorker,
    assignCustomerToWorker,
    hasWorkerPermission,
    dbConnectionError
  }), [
    isAuthLoading, isHydrated, customers, invoices, services, settings,
    notifications, productionStatuses, measurementTemplates, garmentMeasurementTypes,
    garmentMeasurementFields, currentView, selectedInvoiceId, selectedCustomerId,
    activeProfileCustomerId, editingOrder, theme, toasts, sidebarCollapsed,
    mobileMenuOpen, user, userProfile, userRole, showAuthModal, stats,
    analyticsData, expenses, expenseCategories, googleIntegration, workersList,
    orderAssignmentsMap, customerAssignmentsMap, dbConnectionError
  ]);

  return (
    <ShopContext.Provider value={contextValue}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);