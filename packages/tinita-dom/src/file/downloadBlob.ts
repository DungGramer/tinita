export function downloadBlob(
  data: BlobPart | never,
  fileName: string,
  type?: string
) {
  const blob = new Blob([data], { type });
  const link = document.createElement('a');

  link.href = window.URL.createObjectURL(blob);
  link.download = fileName;
  link.click();

  //? For Firefox it is necessary to delay revoking the ObjectURL
  setTimeout(() => {
    window.URL.revokeObjectURL(link.href);
  }, 100);

  return link;
}
