import { base64Decoder } from "../decoder/base64Decoder";

export const base64ToBlob = (base64: string) => {
  const { u8arr, type } = base64Decoder(base64);
  if (!u8arr || !type) return null;
  return new Blob([u8arr], { type });
};
