export function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
