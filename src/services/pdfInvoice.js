import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, isSupabaseConfigured, resolveOrderId } from '../lib/supabase/client.js';
import { defaultShopSettings } from '../data/demoData.js';
import { normalizeWhatsAppPhone } from '../utils/phoneUtils.js';
import { messagingService } from './messaging.js';

/**
 * Format currency amount in clean INR standard (e.g. "Rs. 1,250.00")
 * Ensures 100% standard font compatibility in all PDF viewers.
 */
export function formatInr(amount) {
  const num = parseFloat(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Clean and format dates safely to DD/MM/YYYY
 */
export function formatDate(dateVal) {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateVal);
  }
}

/**
 * Fetch authoritative order, items, customer, payments, and shop info from Supabase
 * with graceful fallback to provided in-memory state.
 */
export async function fetchOrderInvoiceData(orderIdOrRef, customerId = null, fallbackData = {}) {
  const result = {
    order: null,
    items: [],
    customer: null,
    payments: [],
    shop: null,
    subtotal: 0,
    discount: 0,
    totalAmount: 0,
    totalPaid: 0,
    remainingBalance: 0,
    isPaidInFull: false,
    invoiceNumber: 'INV-0000'
  };

  const shopId = fallbackData.shopId || 'a1000000-0000-0000-0000-000000000001';

  // 1. Resolve canonical order UUID if available
  let orderUuid = null;
  if (isSupabaseConfigured && supabase && orderIdOrRef) {
    try {
      orderUuid = await resolveOrderId(shopId, orderIdOrRef);
    } catch (e) {
      console.warn('Notice resolving order ID in fetchOrderInvoiceData:', e);
    }
  }

  // 2. Fetch Order from Supabase
  let dbOrder = null;
  if (isSupabaseConfigured && supabase && (orderUuid || orderIdOrRef)) {
    try {
      let query = supabase.from('orders').select('*');
      if (orderUuid) {
        query = query.eq('id', orderUuid);
      } else {
        query = query.or(`id.eq.${orderIdOrRef},invoice_number.eq.${orderIdOrRef}`);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        dbOrder = data;
        orderUuid = data.id;
      }
    } catch (e) {
      console.warn('Notice fetching order from Supabase:', e);
    }
  }

  const order = dbOrder || fallbackData.order || fallbackData.invoice || (typeof orderIdOrRef === 'object' ? orderIdOrRef : null) || {};
  result.order = order;
  result.invoiceNumber = order.invoice_number || order.id || fallbackData.invoiceNumber || 'INV-0000';

  // 3. Fetch Order Items from Supabase
  let dbItems = [];
  if (isSupabaseConfigured && supabase && orderUuid) {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderUuid)
        .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        dbItems = data;
      }
    } catch (e) {
      console.warn('Notice fetching order items from Supabase:', e);
    }
  }

  // Fallback to services in order/invoice
  if (dbItems.length > 0) {
    result.items = dbItems.map((item, idx) => ({
      index: idx + 1,
      name: item.service_name_snapshot || item.name || item.description || 'Service',
      quantity: parseFloat(item.quantity) || 1,
      rate: parseFloat(item.unit_price) || 0,
      amount: parseFloat(item.line_total) || ((parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0))
    }));
  } else if (Array.isArray(order.services) && order.services.length > 0) {
    result.items = order.services.map((s, idx) => ({
      index: idx + 1,
      name: s.name || s.service_name_snapshot || 'Service',
      quantity: parseFloat(s.qty !== undefined ? s.qty : s.quantity) || 1,
      rate: parseFloat(s.rate !== undefined ? s.rate : s.unit_price) || 0,
      amount: parseFloat(s.amount !== undefined ? s.amount : s.line_total) || 0
    }));
  } else if (Array.isArray(order.items) && order.items.length > 0) {
    result.items = order.items.map((s, idx) => ({
      index: idx + 1,
      name: s.name || s.service_name_snapshot || 'Service',
      quantity: parseFloat(s.qty !== undefined ? s.qty : s.quantity) || 1,
      rate: parseFloat(s.rate !== undefined ? s.rate : s.unit_price) || 0,
      amount: parseFloat(s.amount !== undefined ? s.amount : s.line_total) || 0
    }));
  } else {
    // Single fallback row
    result.items = [{
      index: 1,
      name: order.garmentType || 'Custom Tailoring & Stitching',
      quantity: 1,
      rate: parseFloat(order.total_amount || order.total) || 0,
      amount: parseFloat(order.total_amount || order.total) || 0
    }];
  }

  // 4. Fetch Customer from Supabase
  const targetCustId = customerId || order.customer_id || order.customerId;
  let dbCustomer = null;
  if (isSupabaseConfigured && supabase && targetCustId) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', targetCustId)
        .maybeSingle();
      if (!error && data) {
        dbCustomer = data;
      }
    } catch (e) {
      console.warn('Notice fetching customer from Supabase:', e);
    }
  }

  result.customer = {
    id: dbCustomer?.id || targetCustId || '',
    name: dbCustomer?.name || order.customerName || order.customer_name || fallbackData.customerName || 'Valued Customer',
    phone: dbCustomer?.phone || order.phone || order.customer_phone || fallbackData.phone || '',
    address: dbCustomer?.address || order.address || fallbackData.address || ''
  };

  // 5. Fetch Cumulative Payments from Supabase
  let dbPayments = [];
  if (isSupabaseConfigured && supabase && orderUuid) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderUuid)
        .order('paid_at', { ascending: true });
      if (!error && data) {
        dbPayments = data;
      }
    } catch (e) {
      console.warn('Notice fetching payments from Supabase:', e);
    }
  }
  result.payments = dbPayments;

  // 6. Fetch Shop Details & Settings dynamically from Supabase & Settings
  let localSavedSettings = {};
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tailorpos_shop_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') localSavedSettings = parsed;
      }
    }
  } catch (e) {}

  let dbShop = null;
  let dbShopSettings = {};
  if (isSupabaseConfigured && supabase) {
    try {
      const [shopRes, settingsRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId).maybeSingle(),
        supabase.from('shop_settings').select('*').eq('shop_id', shopId)
      ]);
      if (!shopRes.error && shopRes.data) {
        dbShop = shopRes.data;
      }
      if (!settingsRes.error && Array.isArray(settingsRes.data)) {
        settingsRes.data.forEach(item => {
          if (item.setting_key && item.setting_value) {
            if (typeof item.setting_value === 'object') {
              dbShopSettings = { ...dbShopSettings, ...item.setting_value };
            } else {
              dbShopSettings[item.setting_key] = item.setting_value;
            }
          }
        });
      }
    } catch (e) {
      console.warn('Notice fetching shop info from Supabase:', e);
    }
  }

  // Authoritative settings priority: explicit settings argument > localSavedSettings > dbShopSettings > dbShop
  const activeSettings = {
    ...dbShopSettings,
    ...localSavedSettings,
    ...(fallbackData.settings || {})
  };

  const dynamicShopName = activeSettings.shopName || activeSettings.name || dbShopSettings.shopName || dbShopSettings.name || dbShop?.name || 'Mohit Tailoring';
  const dynamicPhone = activeSettings.phone !== undefined ? activeSettings.phone : (dbShopSettings.phone || dbShop?.phone || '');
  const dynamicAddress = activeSettings.address !== undefined ? activeSettings.address : (dbShopSettings.address || dbShop?.address || '');
  const dynamicEmail = activeSettings.email !== undefined ? activeSettings.email : (dbShopSettings.email || dbShop?.email || '');
  const dynamicGst = activeSettings.gstNumber !== undefined ? activeSettings.gstNumber : (dbShopSettings.gstNumber || '');
  const dynamicLogo = activeSettings.logo || activeSettings.logoUrl || dbShopSettings.logo || '';
  const dynamicTagline = activeSettings.tagline || dbShopSettings.tagline || '';

  result.shop = {
    name: dynamicShopName,
    phone: dynamicPhone,
    address: dynamicAddress,
    email: dynamicEmail,
    gstNumber: dynamicGst,
    logo: dynamicLogo,
    tagline: dynamicTagline
  };

  // 7. Authoritative Financial Calculations
  const calculatedSubtotal = result.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const rawSubtotal = parseFloat(order.subtotal) || calculatedSubtotal;
  const rawDiscount = parseFloat(order.discount) || 0;
  const totalAmount = Math.max(0, parseFloat(order.total_amount || order.total) || Math.max(0, rawSubtotal - rawDiscount));

  // Cumulative paid payments sum
  const cumulativePaymentsSum = dbPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const fallbackPaid = parseFloat(order.total_paid || order.advancePaid || order.advance_paid || 0);
  const totalPaid = Math.max(0, cumulativePaymentsSum > 0 ? cumulativePaymentsSum : fallbackPaid);

  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const isPaidInFull = (remainingBalance <= 0 || Math.abs(remainingBalance) < 0.01) || (order.status || '').toUpperCase() === 'DELIVERED';

  result.subtotal = rawSubtotal;
  result.discount = rawDiscount;
  result.totalAmount = totalAmount;
  result.totalPaid = isPaidInFull ? totalAmount : totalPaid;
  result.remainingBalance = isPaidInFull ? 0 : remainingBalance;
  result.isPaidInFull = isPaidInFull;

  return result;
}

/**
 * Generate a clean, professional, branded PDF invoice using jsPDF and jspdf-autotable.
 * Matches Mohit Tailoring aesthetics, typography, and page guidelines.
 */
export function generateOrderInvoicePdf(invoiceData) {
  const {
    shop,
    order,
    customer,
    items,
    payments,
    subtotal,
    discount,
    totalAmount,
    totalPaid,
    remainingBalance,
    isPaidInFull,
    invoiceNumber
  } = invoiceData;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Top Emerald Accent Brand Bar
  doc.setFillColor(4, 120, 87); // #047857 emerald-700
  doc.rect(0, 0, pageWidth, 8, 'F');

  // 2. Header: Shop Branding (Left)
  let cursorY = 46;

  // Render logo if provided
  let logoOffset = 0;
  if (shop.logo && typeof shop.logo === 'string' && shop.logo.trim() !== '') {
    try {
      if (shop.logo.startsWith('data:image')) {
        const format = shop.logo.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(shop.logo, format, margin, cursorY - 14, 38, 38);
        logoOffset = 46;
      }
    } catch (logoErr) {
      console.warn('Notice adding shop logo to PDF:', logoErr);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // slate-800
  const shopNameStr = (shop.name || 'MOHIT TAILORING').toUpperCase();
  doc.text(shopNameStr, margin + logoOffset, cursorY);

  cursorY += 16;

  if (shop.tagline && String(shop.tagline).trim() !== '') {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(shop.tagline).trim(), margin + logoOffset, cursorY);
    cursorY += 12;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

  if (shop.address && String(shop.address).trim() !== '') {
    const splitAddress = doc.splitTextToSize(String(shop.address).trim(), 280);
    doc.text(splitAddress, margin, cursorY);
    cursorY += (splitAddress.length * 11);
  }

  const contactParts = [];
  if (shop.phone && String(shop.phone).trim() !== '') contactParts.push(`Ph: ${String(shop.phone).trim()}`);
  if (shop.email && String(shop.email).trim() !== '') contactParts.push(String(shop.email).trim());
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  |  '), margin, cursorY);
    cursorY += 12;
  }

  if (shop.gstNumber && String(shop.gstNumber).trim() !== '') {
    doc.text(`GSTIN: ${String(shop.gstNumber).trim()}`, margin, cursorY);
    cursorY += 12;
  }

  // 3. Header: Invoice Title & Meta (Right Aligned)
  const rightX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('INVOICE', rightX, 46, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(invoiceNumber, rightX, 64, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const orderDateStr = formatDate(order.order_date || order.date || order.created_at);
  const dueDateStr = formatDate(order.due_date || order.dueDate);
  const genDateStr = formatDate(new Date().toISOString());

  doc.text(`Invoice Date: ${genDateStr}`, rightX, 78, { align: 'right' });
  doc.text(`Order Date: ${orderDateStr}`, rightX, 90, { align: 'right' });
  if (order.due_date || order.dueDate) {
    doc.text(`Delivery Date: ${dueDateStr}`, rightX, 102, { align: 'right' });
  }

  // 4. Subtle Horizontal Divider
  cursorY = Math.max(cursorY + 6, 118);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(margin, cursorY, rightX, cursorY);

  // 5. Customer "Bill To" & Status Pill
  cursorY += 16;
  const billToY = cursorY;

  // Left: Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO:', margin, billToY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(customer.name || 'Valued Customer', margin, billToY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  let custY = billToY + 26;
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, margin, custY);
    custY += 12;
  }
  if (customer.address) {
    const splitCustAddr = doc.splitTextToSize(`Address: ${customer.address}`, 260);
    doc.text(splitCustAddr, margin, custY);
    custY += (splitCustAddr.length * 11);
  }

  // Right: Payment Status Badge Pill
  const pillWidth = 140;
  const pillHeight = 24;
  const pillX = rightX - pillWidth;
  const pillY = billToY + 4;

  if (isPaidInFull) {
    // Green Pill
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text('PAID IN FULL', pillX + (pillWidth / 2), pillY + 16, { align: 'center' });
  } else {
    // Amber / Red Pill
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
    doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`DUE: ${formatInr(remainingBalance)}`, pillX + (pillWidth / 2), pillY + 16, { align: 'center' });
  }

  // Current Order Status text under pill
  const orderStatusStr = (order.status || order.overall_status || 'PENDING').toUpperCase();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Order Status: ${orderStatusStr}`, rightX, pillY + 36, { align: 'right' });

  cursorY = Math.max(custY + 10, pillY + 44);

  // 6. Line Items Table using jspdf-autotable
  const tableRows = items.map((item, idx) => [
    String(idx + 1),
    item.name || 'Particulars',
    String(item.quantity || 1),
    formatInr(item.rate || 0),
    formatInr(item.amount || 0)
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['#', 'Service / Particulars', 'Quantity', 'Rate', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [4, 120, 87], // emerald-700
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 55 },
      3: { halign: 'right', cellWidth: 90 },
      4: { halign: 'right', cellWidth: 95 }
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    didDrawPage: (data) => {
      // Footer page numbering on every page
      const currentPg = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`${shop.name || 'Mohit Tailoring'} — Page ${currentPg}`, margin, pageHeight - 20);
      doc.text('Computer Generated Invoice', rightX, pageHeight - 20, { align: 'right' });
    }
  });

  let afterTableY = (doc.lastAutoTable?.finalY || cursorY + 120) + 14;

  // Check if we have space for summary, otherwise add a new page
  if (afterTableY > pageHeight - 160) {
    doc.addPage();
    afterTableY = 40;
  }

  // 7. Payment Summary & Notes Box (Two Column Layout)
  const summaryBoxWidth = 220;
  const summaryBoxX = rightX - summaryBoxWidth;

  // Notes Box (Left Side)
  const notesWidth = contentWidth - summaryBoxWidth - 25;
  if (order.notes && String(order.notes).trim().length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, afterTableY, notesWidth, 68, 6, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ORDER NOTES & INSTRUCTIONS:', margin + 10, afterTableY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitNotes = doc.splitTextToSize(String(order.notes).trim(), notesWidth - 20);
    doc.text(splitNotes.slice(0, 4), margin + 10, afterTableY + 28);
  }

  // Financial Summary Box (Right Side)
  let sumY = afterTableY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryBoxX, sumY);
  doc.text(formatInr(subtotal), rightX, sumY, { align: 'right' });

  if (discount > 0) {
    sumY += 14;
    doc.setTextColor(4, 120, 87);
    doc.text('Discount:', summaryBoxX, sumY);
    doc.text(`-${formatInr(discount)}`, rightX, sumY, { align: 'right' });
  }

  sumY += 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(summaryBoxX, sumY - 4, rightX, sumY - 4);

  // Total Order Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Total Order Amount:', summaryBoxX, sumY + 4);
  doc.text(formatInr(totalAmount), rightX, sumY + 4, { align: 'right' });

  // Cumulative Paid
  sumY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('Total Amount Paid:', summaryBoxX, sumY);
  doc.text(formatInr(totalPaid), rightX, sumY, { align: 'right' });

  // Remaining Balance Due
  sumY += 18;
  if (isPaidInFull || remainingBalance === 0) {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(summaryBoxX - 6, sumY - 11, summaryBoxWidth + 6, 20, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(4, 120, 87);
    doc.text('Balance Due:', summaryBoxX, sumY + 3);
    doc.text('Rs. 0.00 (PAID)', rightX, sumY + 3, { align: 'right' });
  } else {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(summaryBoxX - 6, sumY - 11, summaryBoxWidth + 6, 20, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text('Balance Remaining Due:', summaryBoxX, sumY + 3);
    doc.text(formatInr(remainingBalance), rightX, sumY + 3, { align: 'right' });
  }

  // 8. Thank you note bottom
  const thankYouY = Math.max(afterTableY + 95, sumY + 35);
  if (thankYouY < pageHeight - 35) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Thank you for choosing ${shop.name || 'Mohit Tailoring'}! We appreciate your business.`, pageWidth / 2, thankYouY, { align: 'center' });
  }

  // Format clean standardized filename: MohitTailoring_INV-1001.pdf
  const sanitizedInv = String(invoiceNumber).replaceAll(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `MohitTailoring_${sanitizedInv}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const base64 = doc.output('datauristring').split(',')[1];
  const url = (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') ? URL.createObjectURL(blob) : '';

  return {
    doc,
    blob,
    file,
    filename,
    base64,
    url
  };
}

/**
 * Universal WhatsApp sharing function supporting Mobile Web Share API,
 * Desktop automated download + WhatsApp Web chat, and Cloud API if configured.
 *
 * @param {string|object} orderIdOrInvoice - Order UUID, invoice number, or loaded invoice object
 * @param {string} [customerId] - Customer ID
 * @param {object} [options] - Additional parameters (message, type, onProgress, settings, etc.)
 */
export async function shareOrderInvoiceOnWhatsApp(orderIdOrInvoice, customerId = null, options = {}) {
  const {
    messageText: customMessage = '',
    type = 'INVOICE',
    settings = {},
    showToast = (title, msg, type) => console.log(`[Toast ${type}] ${title}: ${msg}`),
    onProgress = () => {}
  } = options;

  onProgress({ status: 'loading', message: 'Fetching latest invoice data from Supabase...' });

  // 1. Fetch authoritative order & payments details
  const invoiceData = await fetchOrderInvoiceData(orderIdOrInvoice, customerId, {
    order: typeof orderIdOrInvoice === 'object' ? orderIdOrInvoice : null,
    settings
  });

  if (!invoiceData || !invoiceData.order) {
    const errorMsg = 'Could not load order details for PDF invoice generation.';
    showToast('Invoice Error', errorMsg, 'error');
    return { success: false, error: errorMsg };
  }

  // 2. Generate PDF Invoice dynamically
  onProgress({ status: 'generating', message: 'Generating professional PDF invoice...' });
  const pdfResult = generateOrderInvoicePdf(invoiceData);
  const { file, filename, base64 } = pdfResult;

  // 3. Prepare accompanying WhatsApp message text
  const custName = invoiceData.customer.name || 'Customer';
  const invId = invoiceData.invoiceNumber;
  const shopName = invoiceData.shop.name || 'Mohit Tailoring';
  const totalStr = formatInr(invoiceData.totalAmount);
  const paidStr = formatInr(invoiceData.totalPaid);
  const balStr = formatInr(invoiceData.remainingBalance);
  const dueDateStr = formatDate(invoiceData.order.due_date || invoiceData.order.dueDate);

  let messageBody = customMessage;
  if (!messageBody || messageBody.trim().length === 0) {
    if (type === 'ORDER_READY') {
      messageBody = `Hello ${custName}, your order #${invId} from ${shopName} is READY for delivery! Total: ${totalStr}, Paid: ${paidStr}, Balance: ${balStr}. Please find your invoice attached. Thank you!`;
    } else if (type === 'RECEIPT') {
      messageBody = `*${shopName.toUpperCase()}*\nPAYMENT RECEIPT ACKNOWLEDGEMENT\n\nDear ${custName},\nThank you for your payment towards order *${invId}*.\n\nPayment Breakdown:\n• Total Order: ${totalStr}\n• Amount Paid: ${paidStr}\n• Balance Due: ${balStr}\n\nDelivery Date: ${dueDateStr}\nYour official invoice is attached. Thank you!`;
    } else {
      messageBody = `Hello ${custName}, your invoice #${invId} from ${shopName} is ready! Total: ${totalStr}, Paid: ${paidStr}, Balance: ${balStr}. Delivery Due: ${dueDateStr}. Please find your attached invoice document. Thank you!`;
    }
  }

  // 4. Resolve clean recipient phone digits (e.g. 919876543210)
  const rawPhone = invoiceData.customer.phone || '';
  const cleanDigits = String(rawPhone).replaceAll(/\D/g, '');
  const recipientPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  // 5. Check if WhatsApp Cloud API is configured and operational
  if (options.useCloudApi) {
    onProgress({ status: 'cloud_api', message: 'Dispatching via WhatsApp Cloud API...' });
    try {
      const res = await messagingService.sendNotification({
        shopId: invoiceData.order.shop_id || 'a1000000-0000-0000-0000-000000000001',
        customerId: invoiceData.customer.id,
        orderId: invoiceData.order.id,
        type: type,
        recipient: recipientPhone,
        message: messageBody,
        documentBase64: base64,
        filename: filename
      });

      if (res?.success && res.mode === 'production') {
        showToast('WhatsApp Dispatched', `Invoice PDF sent to ${custName} (${recipientPhone}) via WhatsApp Cloud API`, 'success');
        return { success: true, mode: 'cloud_api', filename, provider_message_id: res.provider_message_id };
      } else if (res?.mode === 'unconfigured' || res?.requiresManualFallback) {
        showToast('WhatsApp Cloud API Unconfigured', 'Meta WhatsApp Cloud API credentials are not configured in Supabase secrets. Automatic PDF attachment via Meta requires credentials. Please use Manual Chat to download the PDF and send via WhatsApp.', 'warning');
        return { success: false, mode: 'unconfigured', requiresManualFallback: true, error: res?.error };
      } else {
        const errMsg = res?.error || 'Failed to dispatch via WhatsApp Cloud API.';
        showToast('Dispatch Failed', errMsg, 'error');
        return { success: false, error: errMsg };
      }
    } catch (e) {
      console.warn('Cloud API delivery notice:', e);
      showToast('Dispatch Error', (e && e.message) || 'Failed to connect to WhatsApp Cloud API.', 'error');
      return { success: false, error: (e && e.message) || 'Dispatch error' };
    }
  }

  // 6. Native Mobile Web Share API Sharing
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      onProgress({ status: 'sharing', message: 'Opening native share sheet...' });
      await navigator.share({
        files: [file],
        title: `${shopName} Invoice ${invId}`,
        text: messageBody
      });

      showToast('Invoice Shared', `Invoice ${filename} shared successfully on WhatsApp!`, 'success');
      return { success: true, mode: 'web_share', filename };
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled the share dialog
        return { success: false, cancelled: true };
      }
      console.warn('Web Share API notice, using fallback download & chat:', err);
    }
  }

  // 7. Desktop Fallback: Download PDF & Launch WhatsApp Web with prefilled message
  onProgress({ status: 'downloading', message: 'Downloading invoice PDF and launching WhatsApp...' });

  // Trigger file download
  const downloadLink = document.createElement('a');
  downloadLink.href = pdfResult.url;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // Open WhatsApp chat
  const encodedText = encodeURIComponent(messageBody);
  const waUrl = recipientPhone ? `https://wa.me/${recipientPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
  window.open(waUrl, '_blank');

  showToast(
    'PDF Downloaded & WhatsApp Opened',
    `Downloaded ${filename}. Please attach it to your WhatsApp chat with ${custName}.`,
    'info'
  );

  return {
    success: true,
    mode: 'download_and_chat',
    filename,
    pdfBlob: pdfResult.blob
  };
}
