import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const Toast = () => {
  const { toasts, removeToast } = useShop();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xl animate-fade-in transition-smooth"
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#5F8F68] shrink-0 mt-0.5" />}
            {isError && <AlertCircle className="w-5 h-5 text-[#B85C5C] shrink-0 mt-0.5" />}
            {isInfo && <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-[#202020] dark:text-white leading-tight">
                {toast.title}
              </h4>
              <p className="text-xs text-[#777777] dark:text-[#9E9E9E] mt-1 leading-normal">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-[#777777] hover:text-[#202020] dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
