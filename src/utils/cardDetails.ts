// Format raw digits as XXXX XXXX XXXX XXXX ...
export function formatCardNumber(text: string): string {
  return text
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Strip to digits only, capped at maxLen...
export function digitsOnly(text: string, maxLen: number): string {
  return text.replace(/\D/g, '').slice(0, maxLen);
}

// Uppercase, strip non-alphanumeric, insert space before the inward code (last 3 chars)...
export function formatPostcode(raw: string): string {
  const cleaned = raw
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 7);
  if (cleaned.length > 3) {
    return cleaned.slice(0, cleaned.length - 3) + ' ' + cleaned.slice(cleaned.length - 3);
  }
  return cleaned;
}
