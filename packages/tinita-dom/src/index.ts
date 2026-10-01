// Barrel. The recommended import is a specific subpath (`tinita-dom/smooth-scroll`) -
// the barrel is here so bundler users do not have to think about it, NOT as an
// encouragement.
//
// Everything here is browser-only by design: importing the barrel is safe anywhere,
// but calling any of it needs a document.

export * from './dimension/getScrollbarSize';
export * from './file/downloadBlob';
export * from './html/elementToJson';
export * from './html/htmlToJson';
export * from './html/isBlockLevelHtml';
export * from './html/jsonToHtml';
export * from './image/resizeImage';
export * from './smooth-scroll';
export * from './storage/cookieJar';
export * from './storage/createJsonStore';
export * from './storage/localStorageJson';
export * from './storage/sessionStorageJson';
export type { JsonStore } from './storage/types';
export * from './style/setCssVariables';
export * from './unit/toDevicePixels';
export * from './validation/browser';
export * from './validation/isCoarsePointer';
export * from './validation/isTouchDevice';
export * from './validation/platform';
export * from './wheel-source';
export * from './converter/base64ToFile';
export * from './converter/blobToFile';
export * from './converter/uint8ArrayToFile';
