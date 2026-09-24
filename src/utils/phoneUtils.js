/**
 * Phone number normalization & search matching utility for TailorPOS.
 * Supports default India (+91) formatting and international phone numbers.
 */

// Strip spaces, hyphens, brackets, country codes for search comparison
export const normalizePhone = (phoneStr) => {
  if (!phoneStr) return '';
  let cleaned = String(phoneStr).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned.replace(/\D/g, '');
};

// Check if two phone inputs match (case/format insensitive)
export const isPhoneMatch = (input, storedPhone) => {
  if (!input || !storedPhone) return false;
  const cleanInput = normalizePhone(input);
  const cleanStored = normalizePhone(storedPhone);
  
  if (!cleanInput || cleanInput.length < 3) return false;

  if (cleanStored.includes(cleanInput) || cleanInput.includes(cleanStored)) {
    return true;
  }

  // Also check digits only
  const digitsInput = input.replace(/\D/g, '');
  const digitsStored = storedPhone.replace(/\D/g, '');
  return digitsInput.length >= 3 && (digitsStored.includes(digitsInput) || digitsInput.includes(digitsStored));
};

// Format phone for clean UI display with default +91
export const formatPhoneForDisplay = (phoneStr) => {
  if (!phoneStr) return '';
  const cleaned = String(phoneStr).trim();
  if (cleaned.startsWith('+')) return cleaned;
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
  }
  return cleaned;
};

// Normalize phone into international recipient format (e.g. 919876543210)
export const normalizeWhatsAppPhone = (phoneStr, defaultCountryCode = '+91') => {
  if (!phoneStr) return '';
  const str = String(phoneStr).trim();

  if (str.startsWith('+')) {
    return str.replace(/\D/g, '');
  }

  const digits = str.replace(/\D/g, '');

  if (digits.length === 10) {
    const ccDigits = defaultCountryCode.replace(/\D/g, '') || '91';
    return `${ccDigits}${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  return digits;
};
