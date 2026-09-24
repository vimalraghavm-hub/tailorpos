import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Ruler, 
  Save, 
  Edit3, 
  Plus, 
  Check, 
  Scissors, 
  User, 
  FileText,
  Copy,
  ChevronRight
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { GARMENT_MEASUREMENT_TYPES, GARMENT_MEASUREMENT_FIELDS } from '../../data/measurementDefinitions';

export const MeasurementsView = () => {
  const { customers, selectedCustomerId, setSelectedCustomerId, saveCustomerMeasurements, navigateTo, showToast } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeGarmentTab, setActiveGarmentTab] = useState('gown'); // gown, blouse, top, shirt, pant, custom
  const [isEditing, setIsEditing] = useState(false);

  // Active customer object
  const activeCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // Measurements form state synced with selected customer
  const [measurementsForm, setMeasurementsForm] = useState(activeCustomer ? (activeCustomer.measurements || {}) : {});
  const [notesForm, setNotesForm] = useState(activeCustomer ? (activeCustomer.notes || '') : '');

  useEffect(() => {
    if (activeCustomer) {
      setMeasurementsForm(activeCustomer.measurements || {});
      setNotesForm(activeCustomer.notes || '');
      setIsEditing(false);
    }
  }, [selectedCustomerId, customers]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const handleFieldValueChange = (garmentId, fieldKey, val) => {
    setMeasurementsForm(prev => ({
      ...prev,
      [garmentId]: {
        ...(prev[garmentId] || {}),
        [fieldKey]: val
      }
    }));
  };

  const handleSave = () => {
    if (!activeCustomer) return;
    GARMENT_MEASUREMENT_TYPES.forEach(type => {
      const typeData = measurementsForm[type.id] || {};
      saveCustomerMeasurements(activeCustomer.id, type.id, typeData, notesForm);
    });
    setIsEditing(false);
  };

  const handleCopyMeasurements = () => {
    if (!activeCustomer) return;
    let text = `Customer: ${activeCustomer.name} (${activeCustomer.phone})\n`;
    GARMENT_MEASUREMENT_TYPES.forEach(type => {
      const typeData = measurementsForm[type.id];
      if (typeData && Object.keys(typeData).length > 0) {
        text += `${type.label.toUpperCase()}: ${JSON.stringify(typeData)}\n`;
      }
    });
    navigator.clipboard.writeText(text);
    showToast("Copied to Clipboard", "Measurements text copied for WhatsApp/notes", "info");
  };

  const currentGarmentFields = GARMENT_MEASUREMENT_FIELDS[activeGarmentTab] || [];
  const currentGarmentData = measurementsForm[activeGarmentTab] || {};

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
            Customer Measurements
          </h2>
          <p className="text-xs text-[#777777] mt-1">
            Store & manage reusable body measurements per customer for precision tailoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCustomer && (
            <button
              onClick={() => navigateTo('new-invoice', { customerId: activeCustomer.id })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 transition-smooth shadow-xs cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              Use in New Invoice
            </button>
          )}
        </div>
      </div>

      {/* Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (1 Col): Customer Search & Selector */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredCustomers.map((cust) => {
              const isSelected = activeCustomer && cust.id === activeCustomer.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-smooth border flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#202020] text-white border-[#202020] dark:bg-white dark:text-[#202020] shadow-sm'
                      : 'bg-[#F5F5F5]/60 dark:bg-[#252525]/60 border-transparent hover:border-[#E3E3E3] text-[#202020] dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isSelected 
                        ? 'bg-white/20 text-white dark:bg-[#202020] dark:text-white' 
                        : 'bg-[#EEEEEE] dark:bg-[#333333] text-[#202020] dark:text-white'
                    }`}>
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs leading-tight">{cust.name}</h4>
                      <span className={`text-[11px] font-mono block ${isSelected ? 'opacity-80' : 'text-[#777777]'}`}>
                        {cust.phone}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (2 Cols): Interactive Measurement Profile Form */}
        {activeCustomer ? (
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-6">
            
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E3E3] dark:border-[#333333]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#202020] text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {activeCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#202020] dark:text-white leading-tight">
                    {activeCustomer.name}
                  </h3>
                  <p className="text-xs text-[#777777] font-mono mt-0.5">
                    Ph: {activeCustomer.phone} • {activeCustomer.address}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyMeasurements}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white cursor-pointer"
                  title="Copy measurements text"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>

                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Measurements
                  </button>
                )}
              </div>
            </div>

            {/* Garment Type Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] overflow-x-auto">
              {GARMENT_MEASUREMENT_TYPES.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveGarmentTab(tab.id)}
                  className={`flex-1 min-w-[75px] py-2 px-3 text-xs font-bold rounded-xl transition-smooth whitespace-nowrap cursor-pointer ${
                    activeGarmentTab === tab.id
                      ? 'bg-white dark:bg-[#1E1E1E] text-[#202020] dark:text-white shadow-xs'
                      : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* MEASUREMENTS FIELDS FOR SELECTED GARMENT */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
              {currentGarmentFields.map((field) => (
                <div key={field.key} className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-1">
                  <span className="text-[11px] font-bold text-[#777777] uppercase tracking-wider block">
                    {field.label}
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentGarmentData[field.key] || ''}
                      onChange={(e) => handleFieldValueChange(activeGarmentTab, field.key, e.target.value)}
                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-gray-700 text-sm font-bold text-[#202020] dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  ) : (
                    <span className="text-xl font-bold text-[#202020] dark:text-white block">
                      {currentGarmentData[field.key] || '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Notes Section */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-2">
                Customer Fitting Notes & Remarks
              </label>
              {isEditing ? (
                <textarea
                  rows="3"
                  value={notesForm}
                  onChange={(e) => setNotesForm(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              ) : (
                <p className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white leading-relaxed">
                  {notesForm || "No specific fitting notes recorded yet."}
                </p>
              )}
            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 p-12 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-center text-[#777777]">
            No customer selected.
          </div>
        )}

      </div>

    </div>
  );
};

