import React, { useState } from 'react';
import { 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  FileText, 
  Ruler, 
  IndianRupee, 
  Clock, 
  ChevronRight,
  PlusCircle,
  X
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CustomerModal } from '../modals/CustomerModal';

export const CustomersView = () => {
  const { customers, invoices, navigateTo } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustForDrawer, setSelectedCustForDrawer] = useState(null);
  const [showAddCustModal, setShowAddCustModal] = useState(false);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
            Customer Directory & Ledger
          </h2>
          <p className="text-xs text-[#777777] mt-1">
            Manage shop clients, view lifetime spend, outstanding dues, and order histories.
          </p>
        </div>

        <button
          onClick={() => setShowAddCustModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth"
        >
          <UserPlus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Customers Ledger Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Total Orders</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4">Outstanding Balance</th>
                <th className="py-3 px-4">Last Order</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {filteredCustomers.map((cust) => (
                <tr 
                  key={cust.id}
                  onClick={() => setSelectedCustForDrawer(cust)}
                  className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth group"
                >
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#EEEEEE] dark:bg-[#282828] text-[#202020] dark:text-white flex items-center justify-center text-xs font-bold">
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="block font-bold">{cust.name}</span>
                        <span className="text-[10px] text-[#777777] font-normal">{cust.address}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#777777] dark:text-[#9E9E9E]">{cust.phone}</td>
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">{cust.totalOrders} orders</td>
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">₹{cust.totalSpent.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 font-bold">
                    {cust.outstanding > 0 ? (
                      <span className="text-[#B85C5C]">₹{cust.outstanding.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-[#5F8F68]">₹0 (Cleared)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#777777]">{cust.lastOrder}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#777777] group-hover:text-[#202020] dark:group-hover:text-white">
                      Profile <ChevronRight className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER DETAIL PROFILE DRAWER */}
      {selectedCustForDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedCustForDrawer(null)}
          />

          <div className="relative w-full max-w-md h-full bg-white dark:bg-[#1E1E1E] shadow-2xl border-l border-[#E3E3E3] dark:border-[#333333] z-10 flex flex-col animate-fade-in overflow-y-auto p-6 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E3E3] dark:border-[#333333]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#202020] text-white flex items-center justify-center font-bold text-base">
                  {selectedCustForDrawer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#202020] dark:text-white leading-tight">
                    {selectedCustForDrawer.name}
                  </h3>
                  <p className="text-xs text-[#777777] font-mono">{selectedCustForDrawer.phone}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedCustForDrawer(null)}
                className="p-2 rounded-xl hover:bg-[#EEEEEE] text-[#777777]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] text-center space-y-1">
                <span className="text-[10px] font-bold text-[#777777] uppercase">Orders</span>
                <span className="font-bold text-base text-[#202020] dark:text-white block">
                  {selectedCustForDrawer.totalOrders}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] text-center space-y-1">
                <span className="text-[10px] font-bold text-[#777777] uppercase">Spent</span>
                <span className="font-bold text-base text-emerald-600 block">
                  ₹{selectedCustForDrawer.totalSpent}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] text-center space-y-1">
                <span className="text-[10px] font-bold text-[#777777] uppercase">Due</span>
                <span className="font-bold text-base text-[#B85C5C] block">
                  ₹{selectedCustForDrawer.outstanding}
                </span>
              </div>
            </div>

            {/* Address & Notes */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-[#777777]">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[#202020] dark:text-white">{selectedCustForDrawer.address}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EEEEEE]/60 dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333]">
                <span className="text-[10px] font-bold uppercase text-[#777777] block mb-1">Fitting Preference</span>
                <p className="text-[#202020] dark:text-white">{selectedCustForDrawer.notes || "Standard fitting."}</p>
              </div>
            </div>

            {/* Saved Measurements Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#777777] uppercase tracking-wider">
                  Saved Measurements
                </span>
                <button
                  onClick={() => {
                    navigateTo('measurements', { customerId: selectedCustForDrawer.id });
                    setSelectedCustForDrawer(null);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  View Full Profile →
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] text-xs font-mono space-y-1">
                <div className="flex justify-between text-[#777777]">
                  <span>Shirt Length / Chest:</span>
                  <span className="font-bold text-[#202020] dark:text-white">
                    {selectedCustForDrawer.measurements?.shirt?.length} / {selectedCustForDrawer.measurements?.shirt?.chest}
                  </span>
                </div>
                <div className="flex justify-between text-[#777777]">
                  <span>Pant Length / Waist:</span>
                  <span className="font-bold text-[#202020] dark:text-white">
                    {selectedCustForDrawer.measurements?.pant?.length} / {selectedCustForDrawer.measurements?.pant?.waist}
                  </span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => {
                navigateTo('new-invoice', { customerId: selectedCustForDrawer.id });
                setSelectedCustForDrawer(null);
              }}
              className="w-full py-3.5 rounded-2xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-md flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              Create New Invoice for {selectedCustForDrawer.name}
            </button>

          </div>
        </div>
      )}

      {showAddCustModal && (
        <CustomerModal onClose={() => setShowAddCustModal(false)} />
      )}

    </div>
  );
};
