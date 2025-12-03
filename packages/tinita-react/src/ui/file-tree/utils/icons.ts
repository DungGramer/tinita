/**
 * File Icon Type Detection
 *
 * Detects icon type based on filename and extension
 */

/**
 * Get icon type for a file
 */
export function getIconType(filename: string): string {
  // README / LICENSE
  if (/^(readme|license)\.?/i.test(filename)) return 'readme';

  // Extract extension
  const extMatch = filename.match(/\.([^.]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';

  const mapping: Record<string, string[]> = {
    javascript: ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx'],
    css: ['css', 'scss', 'sass', 'less', 'styl'],
    database: ['yml', 'yaml', 'sql', 'db', 'sqlite'],
    html: ['html', 'htm', 'xhtml'],
    font: ['woff', 'woff2', 'ttf', 'otf', 'eot'],
    code: ['json'],
    markdown: ['md', 'mdown', 'markdown'],
    git: ['git', 'gitattributes', 'gitignore', 'gitmodules'],
    php: ['php', 'phtml'],
    text: ['txt', 'log'],
    vue: ['vue'],
    // Image types
    image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'],
    // Video types
    video: ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv', 'wmv', 'm4v'],
    // Audio types
    audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
    // Spreadsheet types
    spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
    // Archive types
    archive: ['zip', 'rar', 'tar', 'gz', 'bz2', '7z', 'xz'],
  };

  for (const [type, exts] of Object.entries(mapping)) {
    if (exts.includes(ext)) return type;
  }

  return 'file';
}
