export function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const base64String = event.target.result as string;
      resolve(base64String);
    };

    reader.onerror = (error) => {
      reject(error);
    };
  });
}
