import React from 'react';
import { Scissors, RefreshCw } from 'lucide-react';

export const ApplicationLoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F5F5F5] dark:bg-[#141414] text-[#202020] dark:text-white transition-colors duration-200">
      <div className="flex flex-col items-center space-y-5 p-8 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-lg max-w-sm w-full text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-[#202020] text-white flex items-center justify-center shadow-md">
          <Scissors className="w-8 h-8 text-emerald-400 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#202020] dark:text-white">
            Mohit Tailoring POS
          </h1>
          <p className="text-xs text-[#777777] font-mono mt-1">
            Loading database session & shop state...
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold pt-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Synchronizing Supabase PostgreSQL
        </div>
      </div>
    </div>
  );
};
