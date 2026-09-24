import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';
import { normalizeWhatsAppPhone } from '../../utils/phoneUtils';
import { messagingService } from '../../services/messaging';

export const WhatsAppModal = ({ invoice, type = 'INVOICE', onClose }) => {
  const { settings, showToast, userRole, hasWorkerPermission } = useShop();
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useModalDismiss(onClose, Boolean(invoice));

  if (!invoice) return null;

  const recipientNumber = normalizeWhatsAppPhone(invoice.phone);
  const formattedDisplayPhone = invoice.phone.startsWith('+91') ? invoice.phone : `+91 ${invoice.phone}`;

  let headerTitle = "Send Invoice via WhatsApp";
  let messageText = "";

  if (type === 'ORDER_READY') {
    headerTitle = "Send Order-Ready Notification";
    messageText = `*${settings.shopName.toUpperCase()}*
🎉 *YOUR ORDER IS READY FOR PICKUP!*

Dear ${invoice.customerName},
Good news! Your tailoring order *${invoice.id}* is fully completed and packed.

📋 *Order Details:*
• Garment: ${invoice.garmentType || 'Custom Stitching'}
${(invoice.services || []).map(s => `• ${s.name} - ₹${s.amount}`).join('\n')}

💰 *Payment Details:*
• Total: ₹${invoice.total}
• Balance Due: *₹${invoice.balance}*

📍 *Pick Up Address:* ${settings.address}
📞 *Shop Contact:* ${settings.phone}

Please visit our shop to collect your completed order. Thank you!`;
  } else if (type === 'RECEIPT') {
    headerTitle = "Send Payment Receipt via WhatsApp";
    messageText = `*${settings.shopName.toUpperCase()}*
🧾 *PAYMENT RECEIPT ACKNOWLEDGEMENT*

Dear ${invoice.customerName},
Thank you for your payment towards order *${invoice.id}*.

💰 *Payment Breakdown:*
• Total Amount: ₹${invoice.total}
• Amount Paid: ₹${invoice.advancePaid} (${invoice.paymentMode || 'Cash'})
• *Remaining Balance: ₹${invoice.balance}*

📅 *Delivery Date:* ${invoice.dueDate}
📍 *Shop Address:* ${settings.address}

Thank you for choosing ${settings.shopName}!`;
  } else {
    // Default INVOICE
    headerTitle = "Send Invoice via WhatsApp";
    messageText = `*${settings.shopName.toUpperCase()}*
Receipt & Order Update

Dear ${invoice.customerName},
Your tailoring order *${invoice.id}* has been generated.

👗 *Garment & Material:*
• Garment: ${invoice.garmentType || 'Custom Tailoring'}
• Material: ${invoice.material || 'Customer Fabric'}

📋 *Order Details:*
${(invoice.services || []).map(s => `• ${s.name} x${s.qty} - ₹${s.amount}`).join('\n')}

💰 *Payment Summary:*
• Total: ₹${invoice.total}
• Advance Paid: ₹${invoice.advancePaid}
• *Balance Due: ₹${invoice.balance}*

📅 *Expected Due Date:* ${invoice.dueDate}
📍 *Shop Address:* ${settings.address}

Thank you for choosing us!
Reply to this message for any queries.`;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast("Message Copied", "WhatsApp text copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendCloudApi = async () => {
    if (isSending) return;

    if (!hasWorkerPermission('SEND_WHATSAPP')) {
      showToast("Access Restricted", "Your account does not have SEND_WHATSAPP permission.", "warning");
      return;
    }

    setIsSending(true);
    try {
      const res = await messagingService.sendNotification({
        shopId: invoice.shop_id || 'a1000000-0000-0000-0000-000000000001',
        customerId: invoice.customerId,
        orderId: invoice.dbId || invoice.id,
        type: type,
        recipient: recipientNumber,
        message: messageText
      });

      if (res?.success) {
        if (res.mode === 'demo') {
          showToast("Demo Mode Active", "WhatsApp Cloud API secrets unconfigured. Launching manual chat.", "info");
          handleOpenManualWhatsApp();
        } else {
          showToast("Message Dispatched", `Official WhatsApp message sent to ${invoice.customerName} (${recipientNumber})`, "success");
          onClose();
        }
      } else {
        showToast("Messaging Error", res.error || "Failed to send WhatsApp message via Cloud API.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Dispatch Error", "Failed to connect to WhatsApp Cloud API.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenManualWhatsApp = () => {
    const encodedMessage = encodeURIComponent(messageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${recipientNumber}&text=${encodedMessage}`;
    window.open(waUrl, '_blank');
    showToast("WhatsApp Opened", `Opened manual WhatsApp chat with ${invoice.customerName}`, "info");
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(invoice)}
      onClose={onClose}
      size="sm"
      maxWidthClass="max-w-lg"
      zIndex={9990}
    >
        
        {/* Modal Header */}
        <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">{headerTitle}</h3>
              <p className="text-xs opacity-90">Customer: {invoice.customerName} ({formattedDisplayPhone})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-smooth cursor-pointer"
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

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Sends official Meta Cloud API message & logs notification status.</span>
            </div>
            <button
              onClick={handleOpenManualWhatsApp}
              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
            >
              Manual Chat <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Text"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs text-[#777777] hover:text-[#202020] cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSendCloudApi}
              disabled={isSending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-smooth cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Official WhatsApp
                </>
              )}
            </button>
          </div>
        </div>
    </Modal>
  );
};
