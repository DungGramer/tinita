export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to convert Blob to Data URL'));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read Blob'));
    };

    reader.onabort = () => {
      reject(new Error('File reading was aborted'));
    };

    reader.readAsDataURL(blob);
  });
