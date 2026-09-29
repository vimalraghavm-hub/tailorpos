import React, { useState } from 'react';
import { ShieldCheck, User, LogOut, Building2, AlertCircle, Mail, Lock } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { Modal } from '../common/Modal';
import { useModalDismiss } from '../../utils/modalUtils';

export const AuthModal = ({ isOpen, onClose }) => {
  const { user, userRole, userProfile, login, logout, showToast } = useShop();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useModalDismiss(onClose, isOpen);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Invalid email or password.');
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res && res.success) {
      showToast("Authentication Successful", `Welcome back! Signed in as ${res.profile?.role || 'User'}`, "success");
      onClose();
    } else {
      setErrorMessage(res?.error || 'Invalid email or password.');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300';
      default:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      maxWidthClass="max-w-md"
      zIndex={10040}
    >
      {/* Header */}
      <div className="p-5 border-b border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#202020] text-white dark:bg-white dark:text-[#202020]">
            <ShieldCheck className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#202020] dark:text-white leading-tight">
              User Profile & Security
            </h3>
            <p className="text-xs text-[#777777]">
              Supabase Security Portal
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5 text-xs">
        {user ? (
          /* LOGGED IN USER PROFILE SUMMARY */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E3E3E3] dark:border-[#333333] pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-sm text-[#202020] dark:text-white">
                    {userProfile?.full_name || user.email}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${getRoleBadgeClass(userRole)}`}>
                  {userRole}
                </span>
              </div>

              <div className="space-y-1 text-xs text-[#777777]">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-mono text-[#202020] dark:text-white">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shop:</span>
                  <span className="font-bold text-[#202020] dark:text-white flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-emerald-600" /> Mohit Tailoring
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                onClose();
                await logout();
              }}
              className="w-full py-3 rounded-2xl bg-[#B85C5C] hover:bg-red-700 text-white font-bold text-xs transition-smooth shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#777777] absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  placeholder="owner@mohittailoring.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#777777] absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 transition-smooth shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
