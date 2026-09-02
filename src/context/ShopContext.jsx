import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialCustomers, initialInvoices, defaultServicesList, defaultShopSettings, defaultNotifications } from '../data/demoData';

const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
  const [customers, setCustomers] = useState(initialCustomers);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [services, setServices] = useState(defaultServicesList);
  const [settings, setSettings] = useState(defaultShopSettings);
  const [notifications, setNotifications] = useState(defaultNotifications);
  
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, new-invoice, registers, measurements, customers, invoice-detail, settings
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('INV-1025');
  const [selectedCustomerId, setSelectedCustomerId] = useState('CUST-101');
  const [theme, setTheme] = useState(defaultShopSettings.theme || 'light');
  
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync dark class on body
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    setSettings(prev => ({ ...prev, theme: nextTheme }));
    showToast("Theme Updated", `Switched to ${nextTheme} mode`, "info");
  };

  const showToast = (title, message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const navigateTo = (view, params = {}) => {
    setCurrentView(view);
    if (params.invoiceId) setSelectedInvoiceId(params.invoiceId);
    if (params.customerId) setSelectedCustomerId(params.customerId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add new invoice
  const addInvoice = (newInvoiceData) => {
    const newId = `${settings.invoicePrefix}${settings.nextInvoiceNumber}`;
    
    // Check if customer exists by phone
    let customerObj = customers.find(c => c.phone === newInvoiceData.phone);
    
    if (!customerObj) {
      // Create new customer
      customerObj = {
        id: `CUST-${Date.now().toString().slice(-4)}`,
        name: newInvoiceData.customerName,
        phone: newInvoiceData.phone,
        address: newInvoiceData.address || "Local Customer",
        totalOrders: 1,
        totalSpent: newInvoiceData.total,
        outstanding: newInvoiceData.balance,
        lastOrder: newInvoiceData.date,
        notes: newInvoiceData.notes || "",
        measurements: newInvoiceData.measurements || {
          shirt: { length: '28"', shoulder: '17"', chest: '40"', waist: '38"', sleeve: '24"', neck: '15.5"' },
          pant: { length: '40"', waist: '34"', hip: '40"', bottom: '14"', 'in-seam': '30"' },
          blouse: { length: '14"', chest: '36"', waist: '30"', shoulder: '14"', sleeve: '10"' }
        }
      };
      setCustomers(prev => [customerObj, ...prev]);
    } else {
      // Update existing customer totals
      setCustomers(prev => prev.map(c => {
        if (c.id === customerObj.id) {
          return {
            ...c,
            totalOrders: c.totalOrders + 1,
            totalSpent: c.totalSpent + newInvoiceData.total,
            outstanding: c.outstanding + newInvoiceData.balance,
            lastOrder: newInvoiceData.date
          };
        }
        return c;
      }));
    }

    const fullInvoice = {
      ...newInvoiceData,
      id: newId,
      customerId: customerObj.id,
      customerName: customerObj.name,
      status: "Cutting",
      cutting: true,
      stitching: false,
      packing: false,
      delivery: false
    };

    setInvoices(prev => [fullInvoice, ...prev]);
    
    // Update next invoice number
    setSettings(prev => ({ ...prev, nextInvoiceNumber: prev.nextInvoiceNumber + 1 }));

    // Add notification
    setNotifications(prev => [
      {
        id: Date.now(),
        title: "New Invoice Created",
        message: `${newId} for ${customerObj.name} (₹${newInvoiceData.total})`,
        time: "Just now",
        read: false,
        type: "success"
      },
      ...prev
    ]);

    showToast("Invoice Saved", `Successfully generated ${newId}`, "success");
    setSelectedInvoiceId(newId);
    navigateTo('invoice-detail', { invoiceId: newId });
  };

  // Toggle stage status (Cutting, Stitching, Packing, Delivery)
  const toggleStage = (invoiceId, stageKey) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv;

      const updated = { ...inv, [stageKey]: !inv[stageKey] };

      // Determine overall status based on stages
      let newStatus = inv.status;
      if (updated.delivery) {
        newStatus = "Delivered";
      } else if (updated.packing) {
        newStatus = "Ready";
      } else if (updated.stitching) {
        newStatus = "Packing";
      } else if (updated.cutting) {
        newStatus = "Stitching";
      } else {
        newStatus = "Cutting";
      }

      updated.status = newStatus;
      return updated;
    }));

    showToast("Production Updated", `Order ${invoiceId} stage updated`, "info");
  };

  // Record payment against an invoice
  const recordPayment = (invoiceId, amount, mode) => {
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

    // Update customer outstanding
    const targetInvoice = invoices.find(i => i.id === invoiceId);
    if (targetInvoice) {
      setCustomers(prev => prev.map(c => {
        if (c.id === targetInvoice.customerId) {
          return {
            ...c,
            outstanding: Math.max(0, c.outstanding - amount)
          };
        }
        return c;
      }));
    }

    showToast("Payment Recorded", `₹${amount} recorded for ${invoiceId}`, "success");
  };

  // Save updated customer measurements
  const saveCustomerMeasurements = (customerId, garmentType, measurements, notes) => {
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

    showToast("Measurements Saved", "Customer measurement profile updated", "success");
  };

  // Add customer
  const addCustomer = (customerData) => {
    const newCust = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      totalOrders: 0,
      totalSpent: 0,
      outstanding: 0,
      lastOrder: "N/A",
      notes: customerData.notes || "",
      measurements: {
        shirt: { length: '28"', shoulder: '17"', chest: '40"', waist: '38"', sleeve: '24"', neck: '15.5"' },
        pant: { length: '40"', waist: '34"', hip: '40"', bottom: '14"', 'in-seam': '30"' },
        blouse: { length: '14"', chest: '36"', waist: '30"', shoulder: '14"', sleeve: '10"' }
      },
      ...customerData
    };
    setCustomers(prev => [newCust, ...prev]);
    showToast("Customer Added", `${newCust.name} added to customer database`, "success");
    return newCust;
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Metrics calculation
  const stats = {
    todayRevenue: invoices.reduce((acc, curr) => acc + curr.advancePaid, 0),
    totalInvoices: invoices.length,
    pendingOrders: invoices.filter(i => i.status !== 'Delivered').length,
    readyForDelivery: invoices.filter(i => i.status === 'Ready').length,
    totalOutstanding: invoices.reduce((acc, curr) => acc + curr.balance, 0),
    statusCounts: {
      cutting: invoices.filter(i => i.status === 'Cutting').length,
      stitching: invoices.filter(i => i.status === 'Stitching').length,
      packing: invoices.filter(i => i.status === 'Packing').length,
      ready: invoices.filter(i => i.status === 'Ready').length,
      delivered: invoices.filter(i => i.status === 'Delivered').length
    }
  };

  return (
    <ShopContext.Provider value={{
      customers,
      invoices,
      services,
      settings,
      notifications,
      currentView,
      selectedInvoiceId,
      selectedCustomerId,
      theme,
      toasts,
      sidebarCollapsed,
      mobileMenuOpen,
      stats,
      setSidebarCollapsed,
      setMobileMenuOpen,
      navigateTo,
      addInvoice,
      toggleStage,
      recordPayment,
      saveCustomerMeasurements,
      addCustomer,
      setSettings,
      toggleTheme,
      showToast,
      removeToast,
      markNotificationRead,
      setSelectedInvoiceId,
      setSelectedCustomerId
    }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
