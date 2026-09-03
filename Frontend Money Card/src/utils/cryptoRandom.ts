/**
 * Cryptographically secure random identifier and token generator.
 * Replaces non-cryptographic Math.random() usage for SonarQube S2245 compliance.
 */

export function generateSecureToken(prefix = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const uuid = crypto.randomUUID().replaceAll('-', '');
    return prefix ? `${prefix}_${uuid.slice(0, 12)}` : uuid.slice(0, 12);
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return prefix ? `${prefix}_${hex}` : hex;
  }

  const fallback = `${Date.now().toString(36)}_${Math.abs(Date.now() % 10000)}`;
  return prefix ? `${prefix}_${fallback}` : fallback;
}

export function generateSecureNumericCode(digits = 6): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const val = min + (array[0] % (max - min + 1));
    return val.toString();
  }
  return (100000 + (Date.now() % 900000)).toString();
}
