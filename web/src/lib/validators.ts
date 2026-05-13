// Vietnamese phone number validator
const VN_PHONE_REGEX = /^(?:\+84|0)(?:3[2-9]|5[2689]|7[0-9]|8[1-9]|9[0-9])[0-9]{7}$/;

export function isValidVNPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '');
  return VN_PHONE_REGEX.test(cleaned);
}

// Format phone to +84
export function formatVNPhone(phone: string): string {
  const cleaned = phone.replace(/[\s.-]/g, '');
  if (cleaned.startsWith('0')) {
    return '+84' + cleaned.slice(1);
  }
  if (cleaned.startsWith('84')) {
    return '+' + cleaned;
  }
  return cleaned;
}

// Display format: 098 123 4567
export function displayVNPhone(phone: string): string {
  const cleaned = phone.replace(/[\s.-]/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('84')) {
    const without84 = cleaned.slice(2);
    return `+84 ${without84.slice(0, 2)} ${without84.slice(2, 5)} ${without84.slice(5)}`;
  }
  return phone;
}

// CMND/CCCD validators
export function isValidCMND(id: string): boolean {
  return /^\d{9}$/.test(id);
}

export function isValidCCCD(id: string): boolean {
  return /^\d{12}$/.test(id);
}

export function isValidIDNumber(id: string): boolean {
  return isValidCMND(id) || isValidCCCD(id);
}
