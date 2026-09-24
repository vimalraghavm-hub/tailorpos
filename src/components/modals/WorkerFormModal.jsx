import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, User, Shield, Check } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { Modal } from '../common/Modal';
import { useModalDismiss } from '../../utils/modalUtils';
import { DEFAULT_WORKER_PERMISSIONS } from '../../services/workers';

export const WorkerFormModal = ({ isOpen, onClose }) => {
  const { createWorker, showToast } = useShop();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState(DEFAULT_WORKER_PERMISSIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useModalDismiss(onClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      showToast("Required Fields Missing", "Please enter full name, email and password.", "warning");
      return;
    }

    if (password.length < 6) {
      showToast("Password Too Short", "Password must be at least 6 characters.", "warning");
      return;
    }

    setIsSubmitting(true);
    const res = await createWorker({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      permissions
    });
    setIsSubmitting(false);

    if (res?.success) {
      onClose();
    }
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const permissionLabels = [
    { key: 'VIEW_REGISTERS', label: 'View Production Registers', category: 'Default' },
    { key: 'VIEW_ASSIGNED_ORDERS', label: 'View Assigned Orders Only', category: 'Default' },
    { key: 'UPDATE_PRODUCTION_STATUS', label: 'Update Production Status', category: 'Default' },
    { key: 'MARK_WORK_COMPLETE', label: 'Mark Assigned Work Complete', category: 'Default' },
    { key: 'VIEW_ALL_ORDERS', label: 'View All Shop Orders', category: 'Elevated' },
    { key: 'VIEW_CUSTOMER_PROFILE', label: 'View Customer Profiles', category: 'Elevated' },
    { key: 'VIEW_CUSTOMER_CONTACT', label: 'View Phone & Address', category: 'Elevated' },
    { key: 'VIEW_PAYMENTS', label: 'View Financial Payments', category: 'Elevated' },
    { key: 'SEND_WHATSAPP', label: 'Dispatch WhatsApp Notifications', category: 'Elevated' },
    { key: 'MANAGE_WORKFLOW', label: 'Manage Production Workflow', category: 'Elevated' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      maxWidthClass="max-w-xl"
      zIndex={10030}
    >
      {/* Header */}
      <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#202020] dark:text-white">Create Worker Account</h3>
            <p className="text-xs text-[#777777]">Provision employee credentials and set initial permissions</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-[#777777] hover:bg-[#EEEEEE] dark:hover:bg-[#282828]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1">Worker Full Name</label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-[#777777] absolute left-3.5" />
              <input
                type="text"
                placeholder="e.g. Master Ramesh"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1">Login Email</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#777777] absolute left-3.5" />
                <input
                  type="email"
                  placeholder="worker@mohittailoring.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-1">Initial Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#777777] absolute left-3.5" />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-bold text-[#202020] dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Granular Permissions Section */}
        <div className="space-y-3 pt-2 border-t border-[#E3E3E3] dark:border-[#333333]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-xs text-[#202020] dark:text-white">Granular Access Permissions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-1">
            {permissionLabels.map((perm) => {
              const isEnabled = permissions[perm.key];
              return (
                <button
                  type="button"
                  key={perm.key}
                  onClick={() => togglePermission(perm.key)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-smooth cursor-pointer ${
                    isEnabled
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                      : 'bg-[#F9FAFB] dark:bg-[#252525] border-[#E5E7EB] dark:border-[#333333] text-[#6B7280]'
                  }`}
                >
                  <span className="text-[11px] font-semibold">{perm.label}</span>
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    isEnabled ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-400'
                  }`}>
                    {isEnabled && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3E3E3] dark:border-[#333333]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#777777] hover:text-[#202020]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Worker...' : 'Create Worker Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
