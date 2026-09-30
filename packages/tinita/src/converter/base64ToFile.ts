import { base64Decoder } from "../decoder/base64Decoder";

export const base64ToFile = (base64: string, fileName: string) => {
  const { u8arr, type } = base64Decoder(base64);
  if (!u8arr || !type) return null;
  return new File([u8arr], fileName, { type });
};
