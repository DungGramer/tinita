/**
 * @example
 * isBlockLevelHtml('<p>This is a paragraph</p>'): true
 * isBlockLevelHtml('<span>This is inline text</span>'): false
 */
export function isBlockLevelHtml(content: string) {
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = content.trim();

  const firstChild = tempContainer.firstElementChild;

  if (!firstChild) return false;

  const blockTags = [
    'ADDRESS',
    'ARTICLE',
    'ASIDE',
    'BLOCKQUOTE',
    'DETAILS',
    'DIALOG',
    'DIV',
    'DL',
    'FIELDSET',
    'FIGCAPTION',
    'FIGURE',
    'FOOTER',
    'FORM',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'HEADER',
    'HR',
    'LI',
    'MAIN',
    'NAV',
    'OL',
    'P',
    'PRE',
    'SECTION',
    'TABLE',
    'UL',
  ];

  return blockTags.includes(firstChild.nodeName);
}
