/**
 * Generate a UUID v4 with fallback support
 *
 * Uses crypto.randomUUID() if available (modern browsers, Node.js 16+),
 * falls back to crypto.getRandomValues(), and finally to Math.random()
 * as a last resort for maximum compatibility.
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 *
 * @example
 * generateUUID() // => "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID(): string {
  // Primary: Use crypto.randomUUID() if available (modern browsers, Node.js 16+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // Fall through to fallback if randomUUID() throws
      console.warn('crypto.randomUUID() failed, using fallback:', error);
    }
  }

  // Fallback: Generate UUID v4 manually using crypto.getRandomValues()
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    try {
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where x is any hexadecimal digit and y is one of 8, 9, A, or B
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);

      // Set version (4) and variant bits
      bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // Version 4
      bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // Variant 10

      // Convert to UUID string format
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
      ].join('-');
    } catch (error) {
      // Fall through to last resort fallback
      console.warn('crypto.getRandomValues() failed, using last resort fallback:', error);
    }
  }

  // Last resort: Use Math.random() (less secure but works everywhere)
  // This is not cryptographically secure but provides uniqueness
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
