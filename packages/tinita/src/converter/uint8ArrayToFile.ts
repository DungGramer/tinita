export function uint8ArrayToFile(
  uint8Array: Uint8Array,
  fileName: string,
  mimeType: string
): File {
  const blob = new Blob([uint8Array], { type: mimeType });
  return new File([blob], fileName);
}
