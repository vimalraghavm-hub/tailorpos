import React from 'react';
import { Scissors, Package, CheckCircle2, Truck } from 'lucide-react';

export const StatusBadge = ({ status, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'Cutting':
        return {
          label: 'Cutting',
          bg: 'bg-amber-500/10 text-[#C89B3C] border-amber-500/20',
          icon: Scissors
        };
      case 'Stitching':
        return {
          label: 'Stitching',
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          icon: Scissors
        };
      case 'Packing':
        return {
          label: 'Packing',
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          icon: Package
        };
      case 'Ready':
        return {
          label: 'Ready',
          bg: 'bg-[#5F8F68]/15 text-[#5F8F68] border-[#5F8F68]/30',
          icon: CheckCircle2
        };
      case 'Delivered':
        return {
          label: 'Delivered',
          bg: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
          icon: Truck
        };
      default:
        return {
          label: status || 'Pending',
          bg: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
          icon: CheckCircle2
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] gap-1' 
    : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span className={`inline-flex items-center font-semibold rounded-lg border ${config.bg} ${sizeClasses} select-none`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
};
