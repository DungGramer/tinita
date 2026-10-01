# Phân loại 66 file theo runtime

Sinh 2026-10-01. Cột **Đích** là nơi file phải nằm theo luật ở `plan.md`.
In đậm = phải di chuyển hoặc xoá.

| Package hiện tại | File                                | Đích              | Lý do                                           |
| ---------------- | ----------------------------------- | ----------------- | ----------------------------------------------- |
| `tinita`         | `converter/fileToBlob.ts`           | **XOÁ**           | file rỗng 0 byte                                |
| `tinita`         | `decoder/base64Decoder.ts`          | **XOÁ**           | trùng logic base64ToBlob; window.atob -> atob   |
| `tinita`         | `array/createRange.ts`              | tinita            | thuần JS                                        |
| `tinita`         | `array/getArrayVal.ts`              | tinita            | thuần JS                                        |
| `tinita`         | `array/sortAlphaText.ts`            | tinita            | thuần JS                                        |
| `tinita`         | `array/uniqueArray.ts`              | tinita            | thuần JS                                        |
| `tinita`         | `array/uniquePushArray.ts`          | tinita            | thuần JS                                        |
| `tinita`         | `constant/HTML_entities_map.ts`     | tinita            | thuần JS                                        |
| `tinita`         | `constant/mime_to_extension.ts`     | tinita            | thuần JS                                        |
| `tinita`         | `constant/print_size.ts`            | tinita            | thuần JS                                        |
| `tinita`         | `constant/print_type.ts`            | tinita            | thuần JS                                        |
| `tinita`         | `converter/HTMLEntitiesToString.ts` | tinita            | thuần JS                                        |
| `tinita`         | `converter/MIMEToFileExtension.ts`  | tinita            | thuần JS                                        |
| `tinita`         | `converter/acceptTypeToRegex.ts`    | tinita            | thuần JS                                        |
| `tinita`         | `converter/base64ToBlob.ts`         | tinita            | web standard, có ở Node 18+                     |
| `tinita`         | `converter/base64ToString.ts`       | tinita            | web standard, có ở Node 18+                     |
| `tinita`         | `converter/blobToBase64.ts`         | tinita            | viết lại bằng blob.arrayBuffer(), bỏ FileReader |
| `tinita`         | `converter/blobToURL.ts`            | tinita            | web standard, có ở Node 18+                     |
| `tinita`         | `converter/fileExtensionToMIME.ts`  | tinita            | thuần JS                                        |
| `tinita`         | `converter/fileToBase64.ts`         | tinita            | nhận Blob (File là Blob), dùng arrayBuffer()    |
| `tinita`         | `converter/fileToUint8Array.ts`     | tinita            | nhận Blob, dùng arrayBuffer()                   |
| `tinita`         | `converter/mapToObject.ts`          | tinita            | thuần JS                                        |
| `tinita`         | `converter/objectToFormData.ts`     | tinita            | guard typeof FileList !== "undefined"           |
| `tinita`         | `converter/objectToMap.ts`          | tinita            | thuần JS                                        |
| `tinita`         | `converter/stringToBase64.ts`       | tinita            | web standard, có ở Node 18+                     |
| `tinita`         | `converter/stringToEventCode.ts`    | tinita            | thuần JS                                        |
| `tinita`         | `converter/stringToHTMLEntities.ts` | tinita            | thuần JS                                        |
| `tinita`         | `converter/stringToSelector.ts`     | tinita            | thuần JS                                        |
| `tinita`         | `converter/text.ts`                 | tinita            | thuần JS                                        |
| `tinita`         | `date/sortDate.ts`                  | tinita            | thuần JS                                        |
| `tinita`         | `object/conditionObj.ts`            | tinita            | thuần JS                                        |
| `tinita`         | `object/filterValidValue.ts`        | tinita            | thuần JS                                        |
| `tinita`         | `object/omit.ts`                    | tinita            | thuần JS                                        |
| `tinita`         | `object/once.ts`                    | tinita            | thuần JS                                        |
| `tinita`         | `object/pick.ts`                    | tinita            | thuần JS                                        |
| `tinita`         | `object/sortObjectKey.ts`           | tinita            | thuần JS                                        |
| `tinita`         | `regex/index.ts`                    | tinita            | thuần JS                                        |
| `tinita`         | `typescript/enumKey.ts`             | tinita            | thuần JS                                        |
| `tinita`         | `validation/isAlphabet.ts`          | tinita            | thuần JS                                        |
| `tinita`         | `validation/isEmail.ts`             | tinita            | thuần JS                                        |
| `tinita`         | `validation/isNumber.ts`            | tinita            | thuần JS                                        |
| `tinita`         | `validation/isURL.ts`               | tinita            | thuần JS                                        |
| `tinita`         | `validation/isVietnamese.ts`        | tinita            | thuần JS                                        |
| `tinita`         | `converter/base64ToFile.ts`         | **tinita (QĐ-A)** | cần File global = Node 20+                      |
| `tinita`         | `converter/blobToFile.ts`           | **tinita (QĐ-A)** | cần File global = Node 20+                      |
| `tinita`         | `converter/uint8ArrayToFile.ts`     | **tinita (QĐ-A)** | cần File global = Node 20+                      |
| `tinita`         | `converter/JSONToHTML.ts`           | **tinita-dom**    | cần HTMLElement,document                        |
| `tinita`         | `converter/elementToJSON.ts`        | **tinita-dom**    | nhận DOM Element                                |
| `tinita`         | `converter/htmlToJSON.ts`           | **tinita-dom**    | cần DOMParser                                   |
| `tinita`         | `converter/unit-converter.ts`       | **tinita-dom**    | cần document                                    |
| `tinita`         | `detect/checkBrowser.ts`            | **tinita-dom**    | cần navigator                                   |
| `tinita`         | `detect/checkMobile.ts`             | **tinita-dom**    | cần document,navigator,window                   |
| `tinita`         | `detect/checkOS.ts`                 | **tinita-dom**    | cần navigator,window                            |
| `tinita`         | `detect/isBlockTag.ts`              | **tinita-dom**    | cần document                                    |
| `tinita`         | `download/DownloadFile.ts`          | **tinita-dom**    | cần document,window                             |
| `tinita`         | `image/resizeImage.ts`              | **tinita-dom**    | cần document                                    |
| `tinita`         | `storage/cookieStorage.ts`          | **tinita-dom**    | cần document                                    |
| `tinita`         | `storage/localStorage.ts`           | **tinita-dom**    | cần localStorage                                |
| `tinita`         | `storage/sessionStorage.ts`         | **tinita-dom**    | cần sessionStorage                              |
| `tinita`         | `style/CSSVariable.ts`              | **tinita-dom**    | cần document                                    |
| `tinita-dom`     | `dimension/getScrollbarSize.ts`     | tinita-dom        | cần document                                    |
| `tinita-react`   | `context/createContextHook.ts`      | tinita-react      | thuần JS                                        |
| `tinita-react`   | `hooks/useDoubleTap.ts`             | tinita-react      | thuần JS                                        |
| `tinita-react`   | `hooks/usePagination.ts`            | tinita-react      | thuần JS                                        |
| `tinita-react`   | `hooks/useRefreshComponent.ts`      | tinita-react      | thuần JS                                        |
| `tinita-react`   | `hooks/useWindowSize.ts`            | tinita-react      | cần window                                      |
| `tinita-react`   | `utils/jsxJoin.tsx`                 | tinita-react      | thuần JS                                        |
