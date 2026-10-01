export function createBlobObjectUrl(obj: Blob | MediaSource): string {
  return URL.createObjectURL(obj);
}
