import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const WhatsAppModal = ({ invoice, onClose }) => {
  const { settings, showToast } = useShop();
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const formattedPhone = invoice.phone.startsWith('+91') ? invoice.phone : `+91${invoice.phone}`;

  const messageText = `*${settings.shopName.toUpperCase()}*
Receipt & Order Update

Dear ${invoice.customerName},
Your tailoring order *${invoice.id}* has been generated.

📋 *Order Details:*
${invoice.services.map(s => `• ${s.name} x${s.qty} - ₹${s.amount}`).join('\n')}

💰 *Payment Summary:*
• Total: ₹${invoice.total}
• Advance Paid: ₹${invoice.advancePaid}
• *Balance Due: ₹${invoice.balance}*

📅 *Expected Due Date:* ${invoice.dueDate}
📍 *Shop Address:* ${settings.address}

Thank you for choosing us!
Reply to this message for any queries.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast("Message Copied", "WhatsApp text copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encodedMessage = encodeURIComponent(messageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    window.open(waUrl, '_blank');
    showToast("WhatsApp Launched", `Opening WhatsApp chat with ${invoice.customerName}`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-[#E3E3E3] dark:border-[#333333] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Send Invoice via WhatsApp</h3>
              <p className="text-xs opacity-90">Customer: {invoice.customerName} ({formattedPhone})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-2">
              WhatsApp Message Preview
            </label>
            <div className="p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-mono whitespace-pre-line text-[#202020] dark:text-[#F5F5F5] leading-relaxed max-h-[250px] overflow-y-auto">
              {messageText}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
            <Send className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>This will open WhatsApp Web or Desktop App with the customer phone pre-filled.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Text"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs text-[#777777] hover:text-[#202020]"
            >
              Close
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-smooth"
            >
              <Send className="w-4 h-4" />
              Launch WhatsApp Demo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
