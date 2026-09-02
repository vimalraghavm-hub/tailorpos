import React from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Toast } from './components/common/Toast';

import { DashboardView } from './components/views/DashboardView';
import { NewInvoiceView } from './components/views/NewInvoiceView';
import { RegistersView } from './components/views/RegistersView';
import { MeasurementsView } from './components/views/MeasurementsView';
import { CustomersView } from './components/views/CustomersView';
import { InvoiceDetailView } from './components/views/InvoiceDetailView';
import { SettingsView } from './components/views/SettingsView';

const MainContent = () => {
  const { currentView } = useShop();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'new-invoice':
        return <NewInvoiceView />;
      case 'registers':
        return <RegistersView />;
      case 'measurements':
        return <MeasurementsView />;
      case 'customers':
        return <CustomersView />;
      case 'invoice-detail':
        return <InvoiceDetailView />;
      case 'settings':
        return <SettingsView />;
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

export function App() {
  return (
    <ShopProvider>
      <div className="flex min-h-screen font-sans bg-[#F5F5F5] dark:bg-[#141414]">
        <Sidebar />
        <MainContent />
        <Toast />
      </div>
    </ShopProvider>
  );
}

export default App;
