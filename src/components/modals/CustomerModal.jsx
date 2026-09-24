import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin, Ruler, Check, AlertTriangle, UserCheck, Edit3 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { 
  GARMENT_MEASUREMENT_TYPES, 
  GARMENT_MEASUREMENT_FIELDS, 
  getDefaultMeasurements 
} from '../../data/measurementDefinitions';
import { isPhoneMatch } from '../../utils/phoneUtils';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';

export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+1', country: 'Canada', flag: '🇨🇦' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
];

export const CustomerModal = ({ 
  initialPhone = '', 
  customerToEdit = null, 
  onClose, 
  onCustomerCreated 
}) => {
  const { customers, addCustomer, updateCustomer, openCustomerProfile, getCustomerStats, showToast } = useShop();

  const isEdit = Boolean(customerToEdit);

  // Helper to extract country code and phone number
  const parsePhone = (rawPhone) => {
    if (!rawPhone) return { code: '+91', number: '' };
    const trimmed = rawPhone.trim();
    const matchedCountry = COUNTRY_CODES.find(c => trimmed.startsWith(c.code));
    if (matchedCountry) {
      return {
        code: matchedCountry.code,
        number: trimmed.slice(matchedCountry.code.length).replace(/\D/g, '').trim()
      };
    }
    return { code: '+91', number: trimmed.replace(/\D/g, '') };
  };

  const initialParsed = parsePhone(customerToEdit ? customerToEdit.phone : initialPhone);

  const [name, setName] = useState(customerToEdit ? customerToEdit.name : '');
  const [countryCode, setCountryCode] = useState(initialParsed.code);
  const [phoneNumber, setPhoneNumber] = useState(initialParsed.number);
  const [address, setAddress] = useState(customerToEdit ? (customerToEdit.address || '') : '');
  const [notes, setNotes] = useState(customerToEdit ? (customerToEdit.notes || '') : '');

  // Measurement state per category
  const [activeTab, setActiveTab] = useState('gown');
  const [measurements, setMeasurements] = useState(
    customerToEdit ? JSON.parse(JSON.stringify(customerToEdit.measurements || getDefaultMeasurements())) : getDefaultMeasurements()
  );

  // Duplicate / Autocomplete suggestion dropdown state
  const [duplicateCustomer, setDuplicateCustomer] = useState(null);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);

  // ESC key dismissal with nested stack support
  useModalDismiss(onClose);

  const fullPhone = `${countryCode} ${phoneNumber.trim()}`.trim();

  // Filter matching existing customers for Name Autocomplete
  const nameMatches = (!isEdit && name.trim().length >= 2)
    ? customers.filter(c => c.name && c.name.toLowerCase().includes(name.trim().toLowerCase()))
    : [];

  // Filter matching existing customers for Phone Autocomplete
  const phoneMatches = (!isEdit && phoneNumber.trim().length >= 3)
    ? customers.filter(c => c.phone && isPhoneMatch(fullPhone, c.phone))
    : [];

  const handleMeasurementChange = (garment, field, value) => {
    setMeasurements(prev => ({
      ...prev,
      [garment]: {
        ...(prev[garment] || {}),
        [field]: value
      }
    }));
  };

  const handleSuppliedGarmentToggle = (garment) => {
    setMeasurements(prev => ({
      ...prev,
      [garment]: {
        ...(prev[garment] || {}),
        suppliedGarment: !Boolean(prev[garment]?.suppliedGarment)
      }
    }));
  };

  const handleSelectExistingCustomer = (cust) => {
    if (onCustomerCreated) {
      onCustomerCreated(cust);
    } else if (openCustomerProfile) {
      openCustomerProfile(cust.id);
    }
    onClose();
  };

  const handleNameChange = (val) => {
    setName(val);
    setShowNameDropdown(true);
  };

  const handlePhoneChange = (val) => {
    const digitsOnly = val.replace(/\D/g, '');
    setPhoneNumber(digitsOnly);
    setShowPhoneDropdown(true);
  };

  const validatePhoneLength = (code, num) => {
    const len = num.length;
    switch (code) {
      case '+91':
      case '+1':
        return len === 10 ? null : `${code} phone number must be exactly 10 digits.`;
      case '+65':
        return len === 8 ? null : `Singapore (+65) phone number must be exactly 8 digits.`;
      case '+971':
        return len === 9 ? null : `UAE (+971) phone number must be exactly 9 digits.`;
      case '+61':
        return (len >= 9 && len <= 10) ? null : `Australia (+61) phone number must be 9 or 10 digits.`;
      case '+44':
        return (len >= 10 && len <= 11) ? null : `UK (+44) phone number must be 10 or 11 digits.`;
      default:
        return len >= 7 ? null : `Phone number must be at least 7 digits.`;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phoneNumber.trim()) return;

    const phoneErr = validatePhoneLength(countryCode, phoneNumber.trim());
    if (phoneErr) {
      if (showToast) {
        showToast("Invalid Phone Number", phoneErr, "error");
      } else {
        alert(phoneErr);
      }
      return;
    }

    if (isEdit) {
      const res = updateCustomer(customerToEdit.id, {
        name: name.trim(),
        phone: fullPhone,
        address: address.trim(),
        notes: notes.trim(),
        measurements
      });
      if (res && res.success !== false) {
        onClose();
      }
      return;
    }

    // Direct check if exact match exists
    const existing = customers.find(c => isPhoneMatch(fullPhone, c.phone));
    if (existing) {
      handleSelectExistingCustomer(existing);
      return;
    }

    const newCust = addCustomer({
      name: name.trim(),
      phone: fullPhone,
      address: address.trim() || "Local Address",
      notes: notes.trim(),
      measurements
    });

    if (onCustomerCreated && newCust) {
      onCustomerCreated(newCust);
    }
    onClose();
  };

  const activeFields = GARMENT_MEASUREMENT_FIELDS[activeTab] || [];
  const currentGarmentData = measurements[activeTab] || {};

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="md"
      zIndex={10010}
    >
        
        {/* Header */}
        <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020]">
              {isEdit ? <Edit3 className="w-5 h-5 text-emerald-400 dark:text-emerald-600" /> : <UserPlus className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202020] dark:text-white leading-tight">
                {isEdit ? 'Edit Customer Profile' : 'Add New Customer'}
              </h3>
              <p className="text-xs text-[#777777]">
                {isEdit ? `Updating profile for ${customerToEdit.name}` : 'Create profile & save initial measurement info'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">

            {/* Section 1: Customer Information */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777] border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
                Customer Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. CUSTOMER NAME INPUT + AUTOCOMPLETE DROPDOWN */}
                <div className="relative">
                  <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
                    1. Customer Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ananya Sharma"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => setShowNameDropdown(true)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                    required
                  />

                  {/* NAME AUTOCOMPLETE DROPDOWN */}
                  {showNameDropdown && nameMatches.length > 0 && !isEdit && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] p-2 z-50 max-h-52 overflow-y-auto animate-fade-in">
                      <span className="text-[10px] font-bold text-[#777777] uppercase px-3 py-1.5 block tracking-wider">
                        EXISTING CUSTOMER MATCHES
                      </span>
                      {nameMatches.map(c => {
                        const stats = getCustomerStats ? getCustomerStats(c) : { totalOrders: c.totalOrders || 0 };
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectExistingCustomer(c)}
                            className="p-3 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth flex items-center justify-between text-xs mb-1"
                          >
                            <div>
                              <span className="font-bold text-[#202020] dark:text-white block">{c.name}</span>
                              <span className="text-[11px] text-[#777777] font-mono">{c.phone} • {stats.totalOrders} Orders</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                              Load Profile
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. PHONE NUMBER INPUT + COUNTRY CODE DROPDOWN + AUTOCOMPLETE */}
                <div className="relative">
                  <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
                    2. Phone Number *
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Country Code Selector */}
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-28 shrink-0 px-2.5 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none cursor-pointer"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={`${c.country}-${c.code}`} value={c.code}>
                          {c.flag} {c.code} ({c.country})
                        </option>
                      ))}
                    </select>

                    {/* National Phone Input */}
                    <div className="relative flex-1 flex items-center">
                      <Phone className="w-4 h-4 text-[#777777] absolute left-3.5" />
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onFocus={() => setShowPhoneDropdown(true)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                        required
                      />
                    </div>
                  </div>

                  {/* PHONE AUTOCOMPLETE DROPDOWN */}
                  {showPhoneDropdown && phoneMatches.length > 0 && !isEdit && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] p-2 z-50 max-h-52 overflow-y-auto animate-fade-in">
                      <span className="text-[10px] font-bold text-[#777777] uppercase px-3 py-1.5 block tracking-wider">
                        EXISTING CUSTOMER MATCHES
                      </span>
                      {phoneMatches.map(c => {
                        const stats = getCustomerStats ? getCustomerStats(c) : { totalOrders: c.totalOrders || 0 };
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectExistingCustomer(c)}
                            className="p-3 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#282828] cursor-pointer transition-smooth flex items-center justify-between text-xs mb-1"
                          >
                            <div>
                              <span className="font-bold text-[#202020] dark:text-white block">{c.name}</span>
                              <span className="text-[11px] text-[#777777] font-mono">{c.phone} • {stats.totalOrders} Orders</span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                              Load Profile
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* 3. Address */}
              <div>
                <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1.5">
                  3. Address
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-[#777777] absolute left-3.5" />
                  <input
                    type="text"
                    placeholder="Area / Street name, City"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Customer Notes */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777] border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
                4. Customer Notes & Preferences
              </h4>
              <textarea
                rows="2"
                placeholder="e.g. Long-term customer preferences, comfortable fit preferences..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
              />
            </div>

            {/* Section 3: Body Measurements & Supplied Garment Flag */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#777777] flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-emerald-600" /> 5. Body Measurements
                </h4>

                {/* Category tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] overflow-x-auto">
                  {GARMENT_MEASUREMENT_TYPES.map(tab => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-smooth whitespace-nowrap cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                          : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supplied Garment Checkbox (Requirement 8 & 9) */}
              <div className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 font-semibold text-[#202020] dark:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(currentGarmentData.suppliedGarment)}
                    onChange={() => handleSuppliedGarmentToggle(activeTab)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Follow measurements from customer supplied garment / sample ({GARMENT_MEASUREMENT_TYPES.find(t => t.id === activeTab)?.label})</span>
                </label>
              </div>

              {/* Show Inputs OR Follow Customer Measurements Banner */}
              {Boolean(currentGarmentData.suppliedGarment) ? (
                <div className="p-5 text-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2 animate-fade-in">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Follow customer measurements</span>
                </div>
              ) : activeTab === 'custom' ? (
                <div className="pt-1">
                  <textarea
                    rows="2"
                    placeholder="Record custom measurements or fitting remarks..."
                    value={(measurements.custom && measurements.custom.notes) || ''}
                    onChange={(e) => handleMeasurementChange('custom', 'notes', e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {activeFields.map(f => (
                    <div key={f.key} className="p-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333]">
                      <span className="text-[10px] font-bold text-[#777777] uppercase block">{f.label}</span>
                      <input
                        type="text"
                        placeholder="--"
                        value={(measurements[activeTab] && measurements[activeTab][f.key]) || ''}
                        onChange={(e) => handleMeasurementChange(activeTab, f.key, e.target.value)}
                        className="w-full px-2 py-0.5 rounded-md bg-white dark:bg-[#1E1E1E] text-xs font-bold text-[#202020] dark:text-white border border-[#E3E3E3] dark:border-[#333333] focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer Submit Area */}
          <div className="p-4 border-t border-[#E3E3E3] dark:border-[#333333] bg-white dark:bg-[#1E1E1E] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs shadow-md hover:opacity-90 transition-smooth cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isEdit ? 'Save Profile Changes' : 'Create Customer Profile'}
            </button>
          </div>
        </form>
    </Modal>
  );
};
