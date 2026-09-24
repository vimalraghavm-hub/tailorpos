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
  const { customers, openCustomerProfile } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
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
            Manage shop clients, view lifetime spend, outstanding dues, body measurements, and order histories.
          </p>
        </div>

        <button
          onClick={() => setShowAddCustModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs transition-smooth"
        >
          <UserPlus className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> Add New Customer
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
                <th className="py-3 px-4">Last Order Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {filteredCustomers.map((cust) => (
                <tr 
                  key={cust.id}
                  onClick={() => openCustomerProfile(cust.id)}
                  className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth group"
                >
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#EEEEEE] dark:bg-[#282828] text-[#202020] dark:text-white flex items-center justify-center text-xs font-bold">
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="block font-bold">{cust.name}</span>
                        <span className="text-[10px] text-[#777777] font-normal">{cust.address || 'Local Customer'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#777777] dark:text-[#9E9E9E]">{cust.phone}</td>
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">{cust.totalOrders || 0} orders</td>
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">₹{(cust.totalSpent || 0).toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 font-bold">
                    {cust.outstanding > 0 ? (
                      <span className="text-[#B85C5C]">₹{cust.outstanding.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-emerald-600">₹0 (Cleared)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#777777]">{cust.lastOrder || 'N/A'}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCustomerProfile(cust.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#777777] group-hover:text-[#202020] dark:group-hover:text-white hover:underline cursor-pointer"
                    >
                      View Profile <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddCustModal && (
        <CustomerModal 
          onClose={() => setShowAddCustModal(false)}
          onCustomerCreated={(newCust) => openCustomerProfile(newCust.id)}
        />
      )}

    </div>
  );
};
