import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardList, 
  Ruler, 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Scissors,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const Sidebar = () => {
  const { 
    currentView, 
    navigateTo, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    showToast
  } = useShop();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-invoice', label: 'New Invoice', icon: PlusCircle, highlight: true },
    { id: 'registers', label: 'Registers', icon: ClipboardList },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, action: () => showToast("Help & Support", "Support desk is available 9 AM - 8 PM", "info") },
    { id: 'logout', label: 'Logout', icon: LogOut, action: () => showToast("Demo Mode", "Logout disabled in prototype mode", "info") },
  ];

  const handleNav = (item) => {
    if (item.action) {
      item.action();
    } else {
      navigateTo(item.id);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FFFFFF] dark:bg-[#1E1E1E] border-r border-[#E3E3E3] dark:border-[#333333] transition-smooth select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-[#202020] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Scissors className="w-5 h-5 text-emerald-400" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg text-[#202020] dark:text-[#F5F5F5] leading-none tracking-tight truncate">
                TailorPOS
              </span>
              <span className="text-[11px] text-[#777777] dark:text-[#9E9E9E] mt-1 font-medium truncate">
                Smart tailoring
              </span>
            </div>
          )}
        </div>

        {/* Mobile close or Desktop collapse toggle */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-[#777777] hover:text-[#202020] dark:hover:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] transition-smooth"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-[#777777] hover:bg-[#EEEEEE]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-smooth group relative ${
                isActive
                  ? 'bg-[#202020] text-white shadow-sm dark:bg-white dark:text-[#202020]'
                  : 'text-[#777777] dark:text-[#9E9E9E] hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] hover:text-[#202020] dark:hover:text-white'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                isActive 
                  ? 'text-white dark:text-[#202020]' 
                  : item.highlight ? 'text-amber-500' : 'text-[#777777] dark:text-[#9E9E9E] group-hover:text-[#202020] dark:group-hover:text-white'
              }`} />
              
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {item.highlight && !sidebarCollapsed && !isActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-[#E3E3E3] dark:border-[#333333] space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-smooth ${
                isActive
                  ? 'bg-[#202020] text-white dark:bg-white dark:text-[#202020]'
                  : 'text-[#777777] dark:text-[#9E9E9E] hover:bg-[#EEEEEE] dark:hover:bg-[#2A2A2A] hover:text-[#202020] dark:hover:text-white'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0 text-[#777777] dark:text-[#9E9E9E]" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside 
        className={`hidden md:block sticky top-0 h-screen z-30 transition-all duration-300 ${
          sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[260px] max-w-[80vw] h-full shadow-2xl z-10 animate-fade-in">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
