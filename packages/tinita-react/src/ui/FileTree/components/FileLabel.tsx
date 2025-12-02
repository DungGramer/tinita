/**
 * FileLabel Component
 *
 * Displays file/folder name with icon using lucide-react icons
 */

import React from 'react';
import {
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileCode2,
  FileType,
  Database,
  FileQuestion,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

/**
 * FileLabel component props
 *
 * @internal
 */
export interface FileLabelProps {
  /** File or folder name to display */
  name: string;
  /** Type of node: 'file' or 'folder' */
  type: 'file' | 'folder';
  /** Icon type identifier */
  iconType: string;
  /**
   * Whether the folder is expanded/open.
   * Only applies to folders.
   *
   * @default false
   */
  isExpanded?: boolean;
  /**
   * Whether to show arrow icon for folders.
   *
   * @default false
   */
  showArrow?: boolean;
}

/**
 * Get the appropriate icon component based on file type
 */
const getFileIcon = (iconType: string) => {
  const iconProps = { className: 'tinita-filetree__icon', size: 16 };

  switch (iconType) {
    case 'javascript':
      return <FileCode {...iconProps} />;
    case 'code':
    case 'json':
      return <FileJson {...iconProps} />;
    case 'text':
    case 'readme':
    case 'markdown':
      return <FileText {...iconProps} />;
    case 'html':
    case 'css':
      return <FileType {...iconProps} />;
    case 'database':
    case 'yml':
    case 'yaml':
      return <Database {...iconProps} />;
    case 'git':
      return <FileQuestion {...iconProps} />;
    case 'php':
    case 'vue':
      return <FileCode2 {...iconProps} />;
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage {...iconProps} />;
    case 'video':
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'webm':
      return <FileVideo {...iconProps} />;
    case 'audio':
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <FileAudio {...iconProps} />;
    case 'spreadsheet':
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet {...iconProps} />;
    case 'archive':
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz':
      return <FileArchive {...iconProps} />;
    default:
      return <File {...iconProps} />;
  }
};

export const FileLabel: React.FC<FileLabelProps> = ({
  name,
  type,
  iconType,
  isExpanded = false,
  showArrow = false,
}) => {
  const renderIcon = () => {
    if (type === 'folder') {
      return isExpanded ? (
        <FolderOpen className="tinita-filetree__icon" size={16} />
      ) : (
        <Folder className="tinita-filetree__icon" size={16} />
      );
    }
    return getFileIcon(iconType);
  };

  const renderArrow = () => {
    if (type === 'folder' && showArrow) {
      return isExpanded ? (
        <ChevronDown className="tinita-filetree__arrow" size={14} />
      ) : (
        <ChevronRight className="tinita-filetree__arrow" size={14} />
      );
    }
    return null;
  };

  return (
    <span
      className={`tinita-filetree__label tinita-filetree__label--${type}`}
      data-icon={iconType}
    >
      {renderArrow()}
      {renderIcon()}
      <span className="tinita-filetree__label-text">{name}</span>
    </span>
  );
};
