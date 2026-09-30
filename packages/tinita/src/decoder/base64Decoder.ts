export const base64Decoder = (base64: string) => {
  if (!base64) return null;
  const arr = base64.split(',');
  const type = arr[0].match(/:(.*?);/)?.[1];
  const bstr = window.atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return { u8arr, type };
};
