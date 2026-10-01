// Barrel. Plugins are deliberately absent: `entities` and `full` are large opt-in
// tables, and `full` is far too generic a name to put in a package's top-level
// namespace. Import them from their own subpaths.

// Array
export * from './array/createRange';
export * from './array/getArrayValue';
export * from './array/prependUnique';
export * from './array/sortAlphaText';
export * from './array/uniqueArray';

// Converter
export * from './converter/base64ToBlob';
export * from './converter/base64ToBytes';
export * from './converter/base64ToString';
export * from './converter/blobToBase64';
export * from './converter/blobToDataUrl';
export * from './converter/blobToUint8Array';
export * from './converter/bytesToBase64';
export * from './converter/createBlobObjectUrl';
export * from './converter/dataUrlToBlob';
export * from './converter/mapToObject';
export * from './converter/objectToFormData';
export * from './converter/objectToMap';
export * from './converter/parseKeyCombination';

// Date
export * from './date/sortDates';

// File
export * from './file/fileSize';
export * from './file/getFileNameParts';
export * from './file/truncateFileName';
export * from './file/truncateFileNameParts';

// Html
export * from './html/html';
export type { Html, HtmlPlugin, HtmlPluginApi } from './html/types';

// Mime
export * from './mime/mime';
export type { Mime, MimePlugin, MimePluginApi } from './mime/types';

// Object
export * from './object/conditionalEntry';
export * from './object/enumKeys';
export * from './object/omit';
export * from './object/omitEmptyValues';
export * from './object/once';
export * from './object/pick';
export * from './object/sortObjectKeys';

// Print
export * from './print/defaultPrintMargins';
export * from './print/pageSizes';
export * from './print/photoPrintSizes';

// String
export * from './string/collapseWhitespace';
export * from './string/insertTextEveryNWords';
export * from './string/sentenceCase';
export * from './string/snakeToTitleCase';
export * from './string/stringToSelector';
export * from './string/titleCase';

// Unit
export * from './unit/convertLength';
export * from './unit/printPixels';

// Uuid
export * from './uuid/generateUuid';

// Validation
export * from './validation/hasVietnameseDiacritics';
export * from './validation/isAsciiLetters';
export * from './validation/isEmail';
export * from './validation/isNumericString';
export * from './validation/isUrl';
