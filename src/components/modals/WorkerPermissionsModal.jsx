import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Save } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { Modal } from '../common/Modal';
import { useModalDismiss } from '../../utils/modalUtils';

export const WorkerPermissionsModal = ({ worker, onClose }) => {
  const { updateWorkerPermissions, showToast } = useShop();
  const [permissions, setPermissions] = useState(worker?.permissions || {});
  const [isSaving, setIsSaving] = useState(false);

  useModalDismiss(onClose, Boolean(worker));

  useEffect(() => {
    if (worker) {
      setPermissions(worker.permissions || {});
    }
  }, [worker]);

  if (!worker) return null;

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateWorkerPermissions(worker.id, permissions);
    setIsSaving(false);

    if (res?.success) {
      onClose();
    }
  };

  const permissionList = [
    { key: 'VIEW_REGISTERS', label: 'View Production Registers', desc: 'Allows worker to see registers grid view' },
    { key: 'VIEW_ASSIGNED_ORDERS', label: 'View Assigned Orders Only', desc: 'Restrict order list strictly to orders assigned to this worker' },
    { key: 'UPDATE_PRODUCTION_STATUS', label: 'Update Production Status', desc: 'Allows worker to move order items between CUTTING, STITCHING, etc.' },
    { key: 'MARK_WORK_COMPLETE', label: 'Mark Assigned Work Complete', desc: 'Allows worker to mark garment ready or finished' },
    { key: 'VIEW_ALL_ORDERS', label: 'View All Shop Orders', desc: 'Grants access to view orders assigned to other workers' },
    { key: 'VIEW_CUSTOMER_PROFILE', label: 'View Customer Profiles', desc: 'Allows worker to open customer measurement cards & profiles' },
    { key: 'VIEW_CUSTOMER_CONTACT', label: 'View Phone & Address', desc: 'Unmasks customer contact details on orders and profile cards' },
    { key: 'VIEW_PAYMENTS', label: 'View Financial Payments', desc: 'Displays order totals, advances, balances and payment histories' },
    { key: 'SEND_WHATSAPP', label: 'Dispatch WhatsApp Notifications', desc: 'Allows worker to trigger WhatsApp customer messages' },
    { key: 'MANAGE_WORKFLOW', label: 'Manage Production Workflow', desc: 'Allows worker to reorder/configure global status pipeline' }
  ];

  return (
    <Modal
      isOpen={Boolean(worker)}
      onClose={onClose}
      size="md"
      maxWidthClass="max-w-xl"
      zIndex={10030}
    >
      {/* Header */}
      <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#202020] dark:text-white">
              Edit Permissions: {worker.full_name}
            </h3>
            <p className="text-xs text-[#777777]">Configure granular access rights for {worker.email}</p>
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
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
          {permissionList.map((perm) => {
            const isEnabled = Boolean(permissions[perm.key]);
            return (
              <div
                key={perm.key}
                onClick={() => togglePermission(perm.key)}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-smooth ${
                  isEnabled
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                    : 'bg-[#F9FAFB] dark:bg-[#252525] border-[#E5E7EB] dark:border-[#333333] text-[#6B7280]'
                }`}
              >
                <div>
                  <span className="font-bold text-xs block">{perm.label}</span>
                  <span className="text-[11px] opacity-75">{perm.desc}</span>
                </div>
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                  isEnabled ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-400'
                }`}>
                  {isEnabled && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E3E3E3] dark:border-[#333333]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#777777] hover:text-[#202020]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
