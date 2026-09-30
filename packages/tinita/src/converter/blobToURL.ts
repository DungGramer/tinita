export function blobToURL(obj: Blob | MediaSource): string {
  return URL.createObjectURL(obj);
}
