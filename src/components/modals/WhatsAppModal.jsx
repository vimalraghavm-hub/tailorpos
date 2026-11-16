import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, ExternalLink, Loader2, FileText, Download, Eye } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useModalDismiss } from '../../utils/modalUtils';
import { Modal } from '../common/Modal';
import { normalizeWhatsAppPhone } from '../../utils/phoneUtils';
import { shareOrderInvoiceOnWhatsApp, generateOrderInvoicePdf, fetchOrderInvoiceData } from '../../services/pdfInvoice';

export const WhatsAppModal = ({ 
  invoice, 
  type = 'INVOICE', 
  onClose,
  onConfirmStatusUpdate,
  zIndex = 10080
}) => {
  const { settings, showToast, userRole, hasWorkerPermission } = useShop();
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [pdfDetails, setPdfDetails] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useModalDismiss(onClose, Boolean(invoice));

  useEffect(() => {
    if (!invoice) return;

    const custName = invoice.customerName || invoice.customer_name || 'Customer';
    const invId = invoice.id || invoice.invoice_number || 'Order';
    const shopName = settings?.shopName || 'Mohit Tailoring';

    if (type === 'ORDER_READY') {
      const defaultText = `Hello ${custName}, your order #${invId} is ready. Thank you, ${shopName}.`;
      setMessageText(defaultText);
    } else if (type === 'RECEIPT') {
      const defaultText = `*${shopName.toUpperCase()}*\n🧾 *PAYMENT RECEIPT ACKNOWLEDGEMENT*\n\nDear ${custName},\nThank you for your payment towards order *${invId}*.\n\n💰 *Payment Breakdown:*\n• Total Amount: ₹${invoice.total || 0}\n• Amount Paid: ₹${invoice.advancePaid || 0} (${invoice.paymentMode || 'Cash'})\n• *Remaining Balance: ₹${invoice.balance || 0}*\n\n📅 *Delivery Date:* ${invoice.dueDate || 'N/A'}\n📍 *Shop Address:* ${settings?.address || 'Local Shop'}\n\nThank you for choosing ${shopName}!`;
      setMessageText(defaultText);
    } else {
      // Default INVOICE / BILL SHARE
      const defaultText = `Hello ${custName}, your invoice #${invId} from ${shopName} is ready! Total: ₹${invoice.total || 0}, Paid: ₹${invoice.advancePaid || 0}, Balance: ₹${invoice.balance || 0}. Delivery Date: ${invoice.dueDate || 'N/A'}. Thank you!`;
      setMessageText(defaultText);
    }
  }, [invoice, type, settings]);

  // Pre-generate PDF for preview and instant download
  useEffect(() => {
    let isMounted = true;
    async function loadPdf() {
      if (!invoice) return;
      setIsGeneratingPdf(true);
      try {
        const invData = await fetchOrderInvoiceData(
          invoice.id || invoice.dbId || invoice,
          invoice.customerId || invoice.customer_id,
          { settings, invoice }
        );
        if (!isMounted) return;
        const result = generateOrderInvoicePdf(invData);
        if (!isMounted) return;
        setPdfDetails(result);
      } catch (err) {
        console.warn('PDF generation preview notice:', err);
      } finally {
        if (isMounted) setIsGeneratingPdf(false);
      }
    }
    loadPdf();
    return () => { isMounted = false; };
  }, [invoice, settings]);

  if (!invoice) return null;

  const phoneStr = invoice.phone || invoice.customer_phone || '';
  const recipientNumber = normalizeWhatsAppPhone(phoneStr);
  const formattedDisplayPhone = phoneStr.startsWith('+91') ? phoneStr : (phoneStr ? `+91 ${phoneStr}` : 'N/A');
  const custName = invoice.customerName || invoice.customer_name || 'Customer';

  let headerTitle = "Send Invoice via WhatsApp";
  if (type === 'ORDER_READY') {
    headerTitle = "Send Order-Ready Notification";
  } else if (type === 'RECEIPT') {
    headerTitle = "Send Payment Receipt via WhatsApp";
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast("Message Copied", "WhatsApp text copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (!pdfDetails?.url) return;
    const a = document.createElement('a');
    a.href = pdfDetails.url;
    a.download = pdfDetails.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("PDF Downloaded", `Downloaded ${pdfDetails.filename}`, "success");
  };

  const handlePreviewPdf = () => {
    if (!pdfDetails?.url) return;
    window.open(pdfDetails.url, '_blank');
  };

  const handleSendCloudApi = async () => {
    if (isSending) return;

    if (!hasWorkerPermission('SEND_WHATSAPP')) {
      showToast("Access Restricted", "Your account does not have SEND_WHATSAPP permission.", "warning");
      if (onConfirmStatusUpdate) onConfirmStatusUpdate();
      onClose();
      return;
    }

    setIsSending(true);
    try {
      const res = await shareOrderInvoiceOnWhatsApp(
        invoice.id || invoice.dbId || invoice,
        invoice.customerId || invoice.customer_id,
        {
          messageText,
          type,
          settings,
          showToast,
          useCloudApi: true
        }
      );

      if (res?.success) {
        if (onConfirmStatusUpdate) onConfirmStatusUpdate();
        onClose();
      }
    } catch (err) {
      console.error('WhatsApp send error:', err);
      showToast("Dispatch Error", "Failed to dispatch WhatsApp message.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenManualWhatsApp = async () => {
    try {
      await shareOrderInvoiceOnWhatsApp(
        invoice.id || invoice.dbId || invoice,
        invoice.customerId || invoice.customer_id,
        {
          messageText,
          type,
          settings,
          showToast,
          useCloudApi: false
        }
      );
      if (onConfirmStatusUpdate) onConfirmStatusUpdate();
      onClose();
    } catch (err) {
      console.error("Manual WhatsApp share error:", err);
    }
  };

  const handleSkipWhatsApp = () => {
    if (onConfirmStatusUpdate) onConfirmStatusUpdate();
    onClose();
  };

  const isReadyWorkflow = type === 'ORDER_READY' || Boolean(onConfirmStatusUpdate);

  return (
    <Modal
      isOpen={Boolean(invoice)}
      onClose={onClose}
      size="sm"
      maxWidthClass="max-w-lg"
      zIndex={zIndex}
    >
      {/* Modal Header */}
      <div className="p-3.5 sm:p-5 bg-emerald-600 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base">{headerTitle}</h3>
            <p className="text-[11px] sm:text-xs opacity-90">Customer: {custName} ({formattedDisplayPhone})</p>
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
      <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
        {/* PDF Attachment Preview Card */}
        <div className="p-3.5 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#202020] dark:text-white truncate">
                    {pdfDetails?.filename || `MohitTailoring_${invoice.id || 'INV'}.pdf`}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 uppercase">
                    PDF
                  </span>
                </div>
                <p className="text-[11px] text-[#777777]">
                  {isGeneratingPdf ? 'Generating PDF document...' : 'Branded A4 invoice with items & payment status'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {pdfDetails?.url && (
                <>
                  <button
                    type="button"
                    onClick={handlePreviewPdf}
                    className="p-1.5 rounded-lg border border-[#E3E3E3] dark:border-[#333333] hover:bg-[#EEEEEE] dark:hover:bg-[#282828] text-[#777777] hover:text-[#202020] dark:hover:text-white transition-smooth cursor-pointer"
                    title="Preview PDF Invoice"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[11px] font-semibold transition-smooth cursor-pointer"
                    title="Download PDF Invoice"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#777777] uppercase tracking-wider mb-2">
            Editable WhatsApp Message
          </label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={5}
            className="w-full p-4 rounded-2xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#E3E3E3] dark:border-[#333333] text-xs font-mono text-[#202020] dark:text-[#F5F5F5] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Type your WhatsApp message here..."
          />
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Sends message with generated PDF invoice attached.</span>
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
      <div className="p-3.5 sm:p-4 border-t border-[#E3E3E3] dark:border-[#333333] flex items-center justify-between gap-2.5 flex-wrap shrink-0 bg-white dark:bg-[#1E1E1E]">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] transition-smooth cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Text"}
        </button>

        <div className="flex items-center gap-2">
          {isReadyWorkflow && (
            <button
              onClick={handleSkipWhatsApp}
              className="px-3.5 py-2.5 rounded-xl border border-[#E3E3E3] dark:border-[#333333] font-semibold text-xs text-[#202020] dark:text-white hover:bg-[#EEEEEE] dark:hover:bg-[#282828] cursor-pointer transition-smooth"
            >
              Skip / Continue without WhatsApp
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2.5 rounded-xl font-semibold text-xs text-[#777777] hover:text-[#202020] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSendCloudApi}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-smooth cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dispatching...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;
