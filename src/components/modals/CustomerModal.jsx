import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin, FileText, Check } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const CustomerModal = ({ initialPhone = '', onClose, onCustomerCreated }) => {
  const { addCustomer } = useShop();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newCust = addCustomer({
      name,
      phone,
      address: address || "Local Address",
      notes
    });

    if (onCustomerCreated) onCustomerCreated(newCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#202020] text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white">Add New Customer</h3>
              <p className="text-xs text-[#777777]">Save customer to profile directory</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#EEEEEE] text-[#777777]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
              Customer Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
              Phone Number *
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-[#777777] absolute left-3.5" />
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
              Address
            </label>
            <div className="relative flex items-center">
              <MapPin className="w-4 h-4 text-[#777777] absolute left-3.5" />
              <input
                type="text"
                placeholder="Area / Street name, Bangalore"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
              Fitting Notes / Preferences
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Likes loose collar, slim pant fit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-sm text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E3E3E3] dark:border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#777777]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs shadow-md"
            >
              <Check className="w-4 h-4" />
              Save Customer
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
