import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../../utils/modalUtils';

// Global active open modals counter to manage body scroll locking
let activeOpenModalCount = 0;

export const Modal = ({
  isOpen = true,
  onClose,
  children,
  size = 'md', // 'sm' (480px), 'md' (640px/672px), 'lg' (768px/900px), 'xl' (1100px)
  maxWidthClass,
  zIndex = 9990,
  closeOnBackdropClick = true,
  className = ''
}) => {
  // ESC key dismissal hook
  useModalDismiss(onClose, isOpen);

  // Body scroll locking management
  useEffect(() => {
    if (!isOpen) return;

    activeOpenModalCount++;
    if (activeOpenModalCount === 1) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      activeOpenModalCount = Math.max(0, activeOpenModalCount - 1);
      if (activeOpenModalCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Preset max-width classes mapping
  const sizeMap = {
    sm: 'max-w-md',    // ~480px
    md: 'max-w-2xl',   // ~672px
    lg: 'max-w-3xl',   // ~768px / 900px
    xl: 'max-w-5xl',   // ~1100px
  };

  const resolvedWidthClass = maxWidthClass || sizeMap[size] || 'max-w-2xl';
  const overlayZ = zIndex;
  const modalContainerZ = zIndex + 10;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      if (closeOnBackdropClick && typeof onClose === 'function') {
        onClose();
      }
    }
  };

  const modalNode = (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 w-screen h-screen flex items-center justify-center p-4 sm:p-6 animate-backdrop-in no-print-backdrop"
      style={{
        zIndex: overlayZ,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${resolvedWidthClass} max-h-[calc(100vh-48px)] bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] flex flex-col overflow-hidden m-0 animate-modal-in ${className}`}
        style={{ zIndex: modalContainerZ }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
