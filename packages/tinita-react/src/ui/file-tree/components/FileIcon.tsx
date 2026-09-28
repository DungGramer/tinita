/**
 * Icon theo loại file.
 *
 * Đây là chỗ DUY NHẤT trong package phụ thuộc `lucide-react`, và nó là optional
 * peer. `Tree` không đụng tới nó - primitive nhận icon dạng `ReactNode` nên nó
 * không biết gì về thư viện icon nào cả.
 */

import React from 'react';
import {
  Database,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileCode2,
  FileImage,
  FileJson,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { variantAttributes } from '../../../utils/variantAttributes';
import type { FileIconType } from '../types';
import styles from '../FileTree.module.css';

export interface FileIconProps {
  iconType: FileIconType;
  /** Thư mục đang mở thì đổi sang icon mở. */
  open?: boolean;
}

export const FileIcon: React.FC<FileIconProps> = ({ iconType, open = false }) => {
  // `data-icon` là thứ CSS dùng để tô màu theo loại, và cũng là thứ `iconColors`
  // nhắm tới qua biến `--tnt-filetree-icon-*`.
  const props = { className: styles.icon, size: 16, ...variantAttributes({ icon: iconType }) };

  if (iconType === 'folder') {
    return open ? <FolderOpen {...props} /> : <Folder {...props} />;
  }

  switch (iconType) {
    case 'javascript':
      return <FileCode {...props} />;
    case 'code':
    case 'json':
      return <FileJson {...props} />;
    case 'text':
    case 'readme':
    case 'markdown':
      return <FileText {...props} />;
    case 'html':
    case 'css':
      return <FileType {...props} />;
    case 'database':
      return <Database {...props} />;
    case 'git':
      return <FileQuestion {...props} />;
    case 'php':
    case 'vue':
      return <FileCode2 {...props} />;
    case 'image':
      return <FileImage {...props} />;
    case 'video':
      return <FileVideo {...props} />;
    case 'audio':
      return <FileAudio {...props} />;
    case 'spreadsheet':
      return <FileSpreadsheet {...props} />;
    case 'archive':
      return <FileArchive {...props} />;
    default:
      return <File {...props} />;
  }
};
