import React, { useEffect } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Toast } from './components/common/Toast';
import { CustomerProfileModal } from './components/modals/CustomerProfileModal';
import { ApplicationLoadingScreen } from './components/common/ApplicationLoadingScreen';
import { LoginPage } from './components/auth/LoginPage';

import { DashboardView } from './components/views/DashboardView';
import { NewInvoiceView } from './components/views/NewInvoiceView';
import { RegistersView } from './components/views/RegistersView';
import { MeasurementsView } from './components/views/MeasurementsView';
import { CustomersView } from './components/views/CustomersView';
import { InvoiceDetailView } from './components/views/InvoiceDetailView';
import { SettingsView } from './components/views/SettingsView';
import { WorkersView } from './components/views/WorkersView';

const MainContent = () => {
  const { currentView, userRole, userProfile, navigateTo, hasWorkerPermission, showToast } = useShop();

  // Enforce granular tab permission routing & redirection for WORKER accounts
  useEffect(() => {
    if (userRole === 'WORKER') {
      const allowedTabs = userProfile?.permissions?.tabs;
      const isTabPermitted = (view) => {
        if (Array.isArray(allowedTabs)) {
          if (allowedTabs.includes(view)) return true;
        }
        if (view === 'registers' && hasWorkerPermission('VIEW_REGISTERS')) return true;
        if (view === 'customers' && (hasWorkerPermission('VIEW_CUSTOMER_PROFILE') || hasWorkerPermission('VIEW_CUSTOMER_CONTACT'))) return true;
        if (view === 'dashboard' && (hasWorkerPermission('VIEW_ASSIGNED_ORDERS') || hasWorkerPermission('VIEW_ALL_ORDERS'))) return true;
        return false;
      };

      if (!isTabPermitted(currentView)) {
        const fallback = ['registers', 'dashboard', 'customers'].find(t => isTabPermitted(t)) || 'registers';
        showToast("Access Restricted", `Your account does not have access to '${currentView}' tab.`, "warning");
        navigateTo(fallback);
      }
    }
  }, [currentView, userRole, userProfile]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'new-invoice':
        return <NewInvoiceView />;
      case 'registers':
        return <RegistersView />;
      case 'measurements':
        return <CustomersView />;
      case 'customers':
        return <CustomersView />;
      case 'invoice-detail':
        return <InvoiceDetailView />;
      case 'settings':
        return <SettingsView />;
      case 'workers':
        return <WorkersView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F5F5F5] dark:bg-[#141414] min-h-screen transition-colors duration-200">
      <Header />
      <main className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto">
        {renderView()}
      </main>
    </div>
  );
};

const AppBody = () => {
  const { isAuthLoading, isHydrated, user, currentView, activeProfileCustomerId, closeCustomerProfile, customers } = useShop();

  if (isAuthLoading || (user && !isHydrated)) {
    return <ApplicationLoadingScreen />;
  }

  if (!user || currentView === 'login') {
    return (
      <>
        <LoginPage />
        <Toast />
      </>
    );
  }

  const selectedCustomer = (customers || []).find(c => c && c.id === activeProfileCustomerId);

  return (
    <div className="flex min-h-screen font-sans bg-[#F5F5F5] dark:bg-[#141414]">
      <Sidebar />
      <MainContent />
      <Toast />
      {selectedCustomer && (
        <CustomerProfileModal 
          customer={selectedCustomer} 
          onClose={closeCustomerProfile} 
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <ShopProvider>
      <AppBody />
    </ShopProvider>
  );
}

export default App;
