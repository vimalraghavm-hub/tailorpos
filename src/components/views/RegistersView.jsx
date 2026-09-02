import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Check, 
  Clock, 
  Calendar, 
  Scissors, 
  CheckCircle2, 
  Eye, 
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../common/StatusBadge';

export const RegistersView = () => {
  const { invoices, toggleStage, navigateTo } = useShop();

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All'); // All, Pending, Cutting, Stitching, Packing, Ready, Delivered
  const [timeFilter, setTimeFilter] = useState('All'); // All, Today, Tomorrow, Overdue

  // Filter logic
  const filteredInvoices = invoices.filter(inv => {
    // Search match
    const matchesSearch = 
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.phone.includes(searchTerm);

    if (!matchesSearch) return false;

    // Stage filter
    if (stageFilter === 'Pending' && inv.status === 'Delivered') return false;
    if (stageFilter !== 'All' && stageFilter !== 'Pending' && inv.status !== stageFilter) return false;

    // Time filter
    if (timeFilter === 'Today' && !inv.dueDate.includes('05 Sep')) return false; // Demo relative check
    if (timeFilter === 'Tomorrow' && !inv.dueDate.includes('06 Sep')) return false;
    if (timeFilter === 'Overdue' && (inv.status !== 'Delivered' && (inv.dueDate.includes('01 Sep') || inv.dueDate.includes('02 Sep') || inv.dueDate.includes('30 Aug')))) return true;
    if (timeFilter === 'Overdue') return false;

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs">
        <div>
          <h2 className="text-2xl font-bold text-[#202020] dark:text-white tracking-tight">
            Production Registers
          </h2>
          <p className="text-xs text-[#777777] mt-1">
            Excel-style interactive shopfloor tracking matrix. Click stage checkmarks to advance order status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#202020] text-white text-xs font-bold">
            {filteredInvoices.length} Orders Listed
          </span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bill #, customer or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs text-[#202020] dark:text-white focus:outline-none"
            />
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F5F5F5] dark:bg-[#282828] border border-[#E3E3E3] dark:border-[#333333] self-start md:self-auto">
            {['All', 'Today', 'Tomorrow', 'Overdue'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-smooth ${
                  timeFilter === tf
                    ? 'bg-[#202020] text-white dark:bg-white dark:text-[#202020]'
                    : 'text-[#777777] hover:text-[#202020] dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <span className="text-[11px] font-bold text-[#777777] uppercase tracking-wider mr-2 shrink-0">
            Stage Filter:
          </span>
          {['All', 'Pending', 'Cutting', 'Stitching', 'Packing', 'Ready', 'Delivered'].map((stg) => (
            <button
              key={stg}
              onClick={() => setStageFilter(stg)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-smooth ${
                stageFilter === stg
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-[#F5F5F5] dark:bg-[#282828] text-[#777777] hover:bg-[#EEEEEE] hover:text-[#202020] dark:hover:text-white'
              }`}
            >
              {stg}
            </button>
          ))}
        </div>

      </div>

      {/* Production Register Excel-Style Grid Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#1E1E1E] border border-[#E3E3E3] dark:border-[#333333] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-[#E3E3E3] dark:border-[#333333] text-[#777777] uppercase text-[10px] tracking-wider bg-[#F5F5F5]/60 dark:bg-[#252525]/60">
                <th className="py-3 px-4 font-bold">Invoice #</th>
                <th className="py-3 px-4 font-bold">Customer Name</th>
                <th className="py-3 px-4 font-bold">Phone</th>
                <th className="py-3 px-4 font-bold">Due Date</th>
                <th className="py-3 px-4 font-bold text-center">Cutting</th>
                <th className="py-3 px-4 font-bold text-center">Stitching</th>
                <th className="py-3 px-4 font-bold text-center">Packing</th>
                <th className="py-3 px-4 font-bold">Current Status</th>
                <th className="py-3 px-4 text-right font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3E3] dark:divide-[#333333]">
              {filteredInvoices.map((inv) => (
                <tr 
                  key={inv.id}
                  className="hover:bg-[#F5F5F5] dark:hover:bg-[#282828] transition-smooth group"
                >
                  {/* Invoice ID */}
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">
                    {inv.id}
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4 font-semibold text-[#202020] dark:text-white">
                    {inv.customerName}
                  </td>

                  {/* Phone */}
                  <td className="py-3.5 px-4 text-[#777777] dark:text-[#9E9E9E] font-mono">
                    {inv.phone}
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 font-bold text-[#202020] dark:text-white">
                    {inv.dueDate}
                  </td>

                  {/* Cutting Clickable Control */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleStage(inv.id, 'cutting')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-smooth inline-flex items-center gap-1 border ${
                        inv.cutting
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : 'bg-gray-100 dark:bg-[#2A2A2A] text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                      title="Click to toggle cutting stage"
                    >
                      Cutting {inv.cutting ? '✓' : '○'}
                    </button>
                  </td>

                  {/* Stitching Clickable Control */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleStage(inv.id, 'stitching')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-smooth inline-flex items-center gap-1 border ${
                        inv.stitching
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                          : 'bg-gray-100 dark:bg-[#2A2A2A] text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                      title="Click to toggle stitching stage"
                    >
                      Stitching {inv.stitching ? '✓' : '○'}
                    </button>
                  </td>

                  {/* Packing Clickable Control */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleStage(inv.id, 'packing')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-smooth inline-flex items-center gap-1 border ${
                        inv.packing
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30'
                          : 'bg-gray-100 dark:bg-[#2A2A2A] text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                      title="Click to toggle packing stage"
                    >
                      Packing {inv.packing ? '✓' : '○'}
                    </button>
                  </td>

                  {/* Overall Status */}
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inv.status} size="sm" />
                  </td>

                  {/* Action link */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => navigateTo('invoice-detail', { invoiceId: inv.id })}
                      className="p-1.5 rounded-lg text-[#777777] hover:text-[#202020] dark:hover:text-white hover:bg-white dark:hover:bg-[#1E1E1E] transition-smooth"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
