import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const SettingsView = () => {
  const { settings, setSettings, theme, toggleTheme, services, showToast } = useShop();

  const [shopName, setShopName] = useState(settings.shopName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [gstNumber, setGstNumber] = useState(settings.gstNumber);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(settings.nextInvoiceNumber);

  const handleSaveSettings = (e) => {
    e.preventDefault();
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

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
            Shop Settings & Configuration
          </h2>
          <p className="text-xs text-[#777777] mt-1">
            Configure shop profile, invoice numbering, default rate card and UI theme.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth"
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
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#777777] mb-1">Shop Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">GST / Tax Number (Optional)</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
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
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#777777] mb-1">Starting / Next Invoice Number</label>
              <input
                type="number"
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Appearance & Theme */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Appearance & Theme</h3>
              <p className="text-xs text-[#777777]">Choose soft SaaS dashboard aesthetic</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              type="button"
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-smooth ${
                theme === 'light'
                  ? 'bg-[#202020] text-white border-[#202020] shadow-sm'
                  : 'bg-[#F5F5F5] dark:bg-[#252525] border-[#E3E3E3] dark:border-[#333333] text-[#777777]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5" />
                <span className="font-bold text-xs">Light Theme</span>
              </div>
              {theme === 'light' && <Check className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-smooth ${
                theme === 'dark'
                  ? 'bg-white text-[#202020] border-white shadow-sm'
                  : 'bg-[#F5F5F5] dark:bg-[#252525] border-[#E3E3E3] dark:border-[#333333] text-[#777777]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5" />
                <span className="font-bold text-xs">Dark Theme</span>
              </div>
              {theme === 'dark' && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          </div>
        </div>

        {/* Section 4: Default Service Catalog Rates */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Default Services & Rate Card</h3>
              <p className="text-xs text-[#777777]">Pre-configured tailoring service prices for quick POS billing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((svc) => (
              <div key={svc.id} className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-[#202020] dark:text-white block">{svc.name}</span>
                  <span className="text-[10px] text-[#777777]">{svc.category}</span>
                </div>
                <span className="font-bold text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl">
                  ₹{svc.defaultRate}
                </span>
              </div>
            ))}
          </div>
        </div>

      </form>

      {/* Backend / Supabase Connection Notice Card */}
      <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Database className="w-4 h-4 text-emerald-600" />
          Backend & Supabase Integration Roadmap
        </div>
        <p className="text-xs leading-relaxed opacity-90">
          This prototype is fully self-contained on the client side with reactive local state. To later connect this to Supabase:
          replace <code className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">ShopContext.jsx</code> data handlers with Supabase RPCs / Postgres tables (<code className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">customers</code>, <code className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">invoices</code>, <code className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">measurements</code>) and real-time subscription channels.
        </p>
      </div>

    </div>
  );
};
