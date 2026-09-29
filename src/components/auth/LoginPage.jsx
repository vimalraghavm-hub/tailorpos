import React, { useState } from 'react';
import { Scissors, Mail, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const LoginPage = () => {
  const { login, showToast } = useShop();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Invalid email or password.');
      return;
    }

    setLoading(true);
    const res = await login(email.trim(), password.trim());
    setLoading(false);

    if (!res || !res.success) {
      setErrorMessage(res?.error || 'Invalid email or password.');
    }
  };

  const handleForgotPassword = () => {
    if (showToast) {
      showToast(
        "Password Reset",
        "Please contact your shop administrator to reset your password.",
        "info"
      );
    } else {
      alert("Please contact your shop administrator to reset your password.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F5F5] dark:bg-[#141414] text-[#202020] dark:text-white p-4 transition-colors duration-200 select-none">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xl space-y-6 animate-fade-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] flex items-center justify-center shadow-md">
            <Scissors className="w-8 h-8 text-emerald-400 dark:text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#202020] dark:text-white">
              Mohit Tailoring POS
            </h1>
            <p className="text-xs text-[#777777] dark:text-[#9E9E9E] mt-1 font-medium">
              Login
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider">
              Email
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#777777] absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-medium text-[#202020] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider">
              Password
            </label>
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
            className="w-full py-3.5 rounded-2xl bg-[#202020] dark:bg-white text-white dark:text-[#202020] font-bold text-xs hover:opacity-90 transition-smooth shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Footer Actions */}
        <div className="pt-2 text-center border-t border-[#E3E3E3] dark:border-[#333333]">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-xs font-semibold text-[#777777] hover:text-[#202020] dark:hover:text-white transition-colors cursor-pointer"
          >
            Forgot Password
          </button>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
