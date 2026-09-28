/**
 * Per-file-type icons.
 *
 * This is the ONLY place in the package that depends on `lucide-react`, and that
 * dependency is an optional peer. `Tree` never touches it - the primitive takes
 * icons as `ReactNode`, so it knows nothing about any icon library.
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
  /** Switch to the open-folder icon when the folder is expanded. */
  open?: boolean;
}

export const FileIcon: React.FC<FileIconProps> = ({ iconType, open = false }) => {
  // `data-icon` is what the CSS colours by type, and what `iconColors` targets
  // through the `--tnt-filetree-icon-*` variables.
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
