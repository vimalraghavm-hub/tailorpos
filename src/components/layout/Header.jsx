import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Menu, 
  User, 
  CheckCheck, 
  FileText, 
  Users, 
  ChevronDown,
  X
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { isPhoneMatch } from '../../utils/phoneUtils';
import { AuthModal } from '../modals/AuthModal';

export const Header = () => {
  const { 
    currentView, 
    settings, 
    notifications, 
    markNotificationRead, 
    theme, 
    toggleTheme, 
    setMobileMenuOpen,
    invoices,
    customers,
    openCustomerProfile,
    navigateTo,
    userProfile,
    userRole,
    showAuthModal,
    setShowAuthModal,
    dbConnectionError
  } = useShop();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filter search results for live dropdown
  const filteredInvoices = searchQuery.trim() 
    ? invoices.filter(i => 
        i.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        isPhoneMatch(searchQuery, i.phone)
      ).slice(0, 4)
    : [];

  const filteredCustomers = searchQuery.trim()
    ? customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        isPhoneMatch(searchQuery, c.phone)
      ).slice(0, 4)
    : [];

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning, Owner";
    if (hour >= 12 && hour < 17) return "Good afternoon, Owner";
    if (hour >= 17 && hour < 21) return "Good evening, Owner";
    return "Good night, Owner";
  };

  return (
    <header className="sticky top-0 z-20 bg-[#F5F5F5]/90 dark:bg-[#141414]/90 backdrop-blur-md border-b border-[#E3E3E3] dark:border-[#333333] px-4 md:px-8 py-4 transition-smooth">
      {dbConnectionError && (
        <div className="mb-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs font-bold flex items-center justify-between gap-2">
          <span>⚠️ {dbConnectionError}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        
        {/* Mobile Menu Trigger & Title / Greeting */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-[#202020] dark:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#202020] dark:text-[#F5F5F5] tracking-tight">
              {getGreeting()} 👋
            </h1>
            <p className="text-xs md:text-sm text-[#777777] dark:text-[#9E9E9E] mt-0.5">
              Here's what's happening in your shop today.
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* Global Search Bar */}
          <div className="relative hidden sm:block" ref={searchRef}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#777777] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search invoice, customer, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="w-[200px] lg:w-[280px] pl-10 pr-8 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white placeholder-[#777777] focus:outline-none focus:ring-2 focus:ring-[#202020]/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-[#777777] hover:text-[#202020]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Search Results Popover */}
            {searchFocused && (filteredInvoices.length > 0 || filteredCustomers.length > 0) && (
              <div className="absolute right-0 top-full mt-2 w-[320px] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl border border-[#E3E3E3] dark:border-[#333333] p-2 z-50 animate-fade-in">
                {filteredInvoices.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] px-3 py-1 block">
                      Invoices
                    </span>
                    {filteredInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => {
                          navigateTo('invoice-detail', { invoiceId: inv.id });
                          setSearchFocused(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#282828] text-left transition-smooth"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#777777]" />
                          <div>
                            <span className="font-semibold text-xs text-[#202020] dark:text-white block">{inv.id}</span>
                            <span className="text-[11px] text-[#777777]">{inv.customerName}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#202020] dark:text-white">₹{inv.total}</span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredCustomers.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] px-3 py-1 block">
                      Customers
                    </span>
                    {filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => {
                          openCustomerProfile(cust.id);
                          setSearchFocused(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#282828] text-left transition-smooth cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#777777]" />
                          <div>
                            <span className="font-semibold text-xs text-[#202020] dark:text-white block">{cust.name}</span>
                            <span className="text-[11px] text-[#777777] font-mono">{cust.phone}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-emerald-600 font-medium">{cust.totalOrders || 0} orders</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-center text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth cursor-pointer"
            title={`Current Theme: ${theme.toUpperCase()}. Click to switch theme.`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : theme === 'dark' ? (
              <div className="w-4 h-4 rounded-full bg-[#650A35] border border-white/60" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>


          {/* Notifications Popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative w-10 h-10 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-center text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#B85C5C] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#F5F5F5] dark:border-[#141414]">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-[340px] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl border border-[#E3E3E3] dark:border-[#333333] p-4 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#E3E3E3] dark:border-[#333333]">
                  <span className="font-bold text-sm text-[#202020] dark:text-white">Notifications</span>
                  <span className="text-xs text-[#777777]">{unreadCount} new</span>
                </div>
                <div className="py-2 space-y-2 max-h-[280px] overflow-y-auto">
                  {notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-smooth border ${
                        n.read 
                          ? 'bg-[#F5F5F5]/50 dark:bg-[#252525]/30 border-transparent opacity-70' 
                          : 'bg-[#EEEEEE]/70 dark:bg-[#282828] border-[#E3E3E3] dark:border-[#333333]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-[#202020] dark:text-white">{n.title}</span>
                        <span className="text-[10px] text-[#777777]">{n.time}</span>
                      </div>
                      <p className="text-xs text-[#777777] dark:text-[#9E9E9E] mt-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Card & Auth Trigger */}
          <div 
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] cursor-pointer hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth select-none"
            title="Account & Role Management Portal"
          >
            <div className="w-8 h-8 rounded-lg bg-[#202020] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {userProfile ? userProfile.full_name.slice(0, 2).toUpperCase() : 'MT'}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-[#202020] dark:text-white leading-tight flex items-center gap-1">
                {userProfile ? userProfile.full_name : 'Mohit Owner'}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                {userRole} Mode
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  );
};
