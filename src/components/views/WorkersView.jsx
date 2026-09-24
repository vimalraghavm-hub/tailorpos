import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  Briefcase,
  Check,
  Power,
  Edit3
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { WorkerFormModal } from '../modals/WorkerFormModal';
import { WorkerPermissionsModal } from '../modals/WorkerPermissionsModal';

export const WorkersView = () => {
  const { 
    userRole, 
    workersList, 
    loadWorkersData, 
    toggleWorkerStatus 
  } = useShop();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWorkerForPerms, setSelectedWorkerForPerms] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (userRole !== 'OWNER') {
    return (
      <div className="p-8 text-center space-y-3">
        <Shield className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-xl font-bold text-[#202020] dark:text-white">Access Restricted</h3>
        <p className="text-xs text-[#777777]">Only SHOP OWNER accounts can access Staff & Worker Management.</p>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadWorkersData();
    setIsLoading(false);
  };

  const activeWorkersCount = workersList.filter(w => w.is_active !== false).length;
  const totalAssignedCount = workersList.reduce((sum, w) => sum + (w.assignedCount || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-6xl">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
              Staff & Worker Control Center
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
              OWNER ONLY
            </span>
          </div>
          <p className="text-xs text-[#777777] mt-1">
            Provision worker accounts, set granular access permissions, and manage order assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] text-[#777777] hover:text-[#202020] dark:hover:text-white transition-smooth"
            title="Refresh workers"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-smooth cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add New Worker
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#777777]">Total Workers</span>
            <span className="text-2xl font-bold text-[#202020] dark:text-white block mt-1">{workersList.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#777777]">Active Accounts</span>
            <span className="text-2xl font-bold text-emerald-600 block mt-1">{activeWorkersCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#777777]">Assigned Orders</span>
            <span className="text-2xl font-bold text-blue-600 block mt-1">{totalAssignedCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Workers Grid / List */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-[#202020] dark:text-white">Active Worker Profiles</h3>

        {workersList.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] text-center space-y-2">
            <Users className="w-8 h-8 text-[#777777] mx-auto opacity-50" />
            <p className="text-xs text-[#777777]">No worker profiles provisioned yet. Click "Add New Worker" to create employee accounts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workersList.map((worker) => {
              const isActive = worker.is_active !== false;
              const perms = worker.permissions || {};
              const enabledPermCount = Object.values(perms).filter(Boolean).length;

              return (
                <div key={worker.id} className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {worker.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#202020] dark:text-white flex items-center gap-2">
                          {worker.full_name}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400'
                          }`}>
                            {isActive ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </h4>
                        <span className="text-xs text-[#777777] font-mono">{worker.email}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleWorkerStatus(worker.id, !isActive)}
                      className={`p-2 rounded-xl transition-smooth cursor-pointer ${
                        isActive ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                      title={isActive ? "Disable worker account" : "Enable worker account"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Permissions Summary Badges */}
                  <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#252525] border border-[#E2E8F0] dark:border-[#333333] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#777777]">Permissions ({enabledPermCount}/10 Enabled)</span>
                      <button
                        type="button"
                        onClick={() => setSelectedWorkerForPerms(worker)}
                        className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit Permissions
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {perms.VIEW_REGISTERS && <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-medium border border-purple-200">Registers</span>}
                      {perms.VIEW_ASSIGNED_ORDERS && <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-medium border border-blue-200">Assigned Orders</span>}
                      {perms.UPDATE_PRODUCTION_STATUS && <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200">Update Status</span>}
                      {perms.VIEW_ALL_ORDERS && <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-medium border border-amber-200">All Orders</span>}
                      {perms.VIEW_CUSTOMER_PROFILE && <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium border border-indigo-200">Customer Profiles</span>}
                      {perms.VIEW_PAYMENTS && <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 text-[10px] font-medium border border-teal-200">Payments</span>}
                    </div>
                  </div>

                  {/* Worker Assigned Orders Summary */}
                  <div className="flex items-center justify-between text-xs text-[#777777] pt-1">
                    <span>Active Assigned Orders: <strong className="text-[#202020] dark:text-white font-bold">{worker.assignedCount || 0}</strong></span>
                    <span className="text-[10px] text-purple-600 font-mono">Role: WORKER</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkerFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <WorkerPermissionsModal worker={selectedWorkerForPerms} onClose={() => setSelectedWorkerForPerms(null)} />

    </div>
  );
};
