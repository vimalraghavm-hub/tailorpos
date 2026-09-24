import { useEffect } from 'react';

// Stack of active modal/popup onClose handlers
const modalStack = [];

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length > 0) {
      const topCloseHandler = modalStack[modalStack.length - 1];
      if (topCloseHandler) {
        e.stopPropagation();
        e.preventDefault();
        topCloseHandler();
      }
    }
  }, true);
}

/**
 * Custom React hook for modal ESC key listener with nested stack support.
 * Closes only the topmost active layer when ESC is pressed.
 */
export const useModalDismiss = (onClose, isOpen = true) => {
  useEffect(() => {
    if (!isOpen || typeof onClose !== 'function') return;

    const handler = onClose;
    modalStack.push(handler);

    return () => {
      const idx = modalStack.lastIndexOf(handler);
      if (idx !== -1) {
        modalStack.splice(idx, 1);
      }
    };
  }, [onClose, isOpen]);
};
