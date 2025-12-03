# FileTree Component

A tree view component for displaying hierarchical file/folder structures from text input. Supports both indent-based and CLI `tree` format.

## Features

- ✅ **Universal text parser** - Supports indent tree and CLI tree formats
- ✅ **Auto-detect format** - Automatically detects input format
- ✅ **Smooth animations** - Powered by Radix UI Accordion with height + fade transitions
- ✅ **Radix UI Accordion** - Professional, accessible accordion with built-in animations
- ✅ **File type icons** - Colored border icons based on file extension
- ✅ **Dark & light themes** - Default dark theme with light theme support
- ✅ **Accessibility** - ARIA compliant, respects prefers-reduced-motion preference
- ✅ **TypeScript** - Full type safety
- ✅ **SSR-safe** - Works with Next.js, Remix, etc.
- ✅ **Customizable** - CSS variables for easy theming

## Installation

```bash
npm install tinita-react
# or
pnpm add tinita-react
# or
yarn add tinita-react
```

## Basic Usage

### Indent Tree Format (2 spaces)

```tsx
import { FileTree } from 'tinita-react/ui';

const treeText = `
content/
  1_photography/
    1_animals/
    2_trees/
    album.txt
    photo.jpg
  2_notes/
    notes.txt
`;

function App() {
  return <FileTree text={treeText} />;
}
```

### CLI Tree Format (Windows/Unix)

```tsx
const cliTreeText = `
D:\\PROJECT
├───src
│   └───components
│       ├───Button.tsx
│       └───Input.tsx
└───dist
    └───index.js
`;

<FileTree text={cliTreeText} hideRootName />
```

## Props

### `FileTreeProps`

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | **required** | Text tree input (indent or CLI format) |
| `className` | `string` | `''` | Custom class name |
| `hideRootName` | `boolean` | `false` | Hide root node when only 1 root exists |
| `theme` | `'dark' \| 'light'` | `'light'` | Color theme |
| `indicator` | `boolean` | `true` | Show tree indicator lines |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size/density preset |
| `borderRadius` | `'sm' \| 'md' \| 'lg'` | `'md'` | Border radius for hover state |
| `showArrow` | `boolean` | `false` | Show collapse/expand arrow icons |
| `enableAnimation` | `boolean` | `true` | Enable smooth collapse/expand animations |

### `FileNode`

```typescript
type FileNode = {
  name: string;
  children: FileNode[];
};
```

## Examples

### Hide Root Name

```tsx
// Input has root path like "D:\PROJECT"
// hideRootName will hide the root and show only children
<FileTree
  text={cliTreeText}
  hideRootName={true}
/>
```

### Custom Class Name

```tsx
<FileTree
  text={treeText}
  className="my-custom-tree"
/>
```

### CSS Import (Required)

```tsx
// app.tsx or _app.tsx (Next.js, Remix, etc.)
import 'tinita-react/ui/file-tree/FileTree.css';

function App() {
  return <FileTree text={treeText} />;
}
```

## Animations

### Smooth Collapse/Expand (Powered by Radix UI)

By default, folders animate smoothly using **Radix UI Accordion** with height + fade transitions (250ms, ease-out).

```tsx
<FileTree text={treeText} enableAnimation={true} />
```

**Animation Features:**
- Height animation from 0 to auto (using `--radix-accordion-content-height`)
- Opacity fade (0 to 1)
- Arrow rotation (0° to 90°)
- GPU-accelerated CSS animations
- ARIA-compliant accessibility
- Smooth interruption handling

**Technical Implementation:**
- Uses `@radix-ui/react-accordion` for reliable animations
- CSS keyframes with `data-state` attributes
- No JavaScript timing hacks or complex state management
- Works flawlessly with nested folders

### Disable Animations

```tsx
<FileTree text={treeText} enableAnimation={false} />
```

When disabled, folders expand/collapse instantly without animation.

### Accessibility

The component automatically respects the user's `prefers-reduced-motion` preference:

```css
/* Animations are automatically disabled when user prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .tinita-filetree__accordion-content {
    animation: none !important;
  }
}
```

### Show Arrows

Enable arrow icons to make the collapse/expand behavior more visible:

```tsx
<FileTree text={treeText} showArrow={true} />
```

Arrows rotate 90° when folders expand (CSS transform, GPU-accelerated).

## Input Formats

### Format 1: Indent Tree (2 spaces)

```
root/
  folder1/
    file1.txt
    file2.js
  folder2/
    nested/
      deep.md
```

**Rules:**
- Use 2 spaces for each level
- Folders typically end with `/` (optional)
- Files are leaf nodes

### Format 2: CLI Tree (Windows)

```
D:\PROJECT
├───src
│   ├───components
│   │   └───Button.tsx
│   └───utils
│       └───helpers.ts
└───dist
```

**Characters:**
- `├───` Branch connector
- `└───` Last branch
- `│   ` Vertical line

### Format 3: CLI Tree (Unix/Mac)

```
/home/user/project
├── src
│   ├── components
│   │   └── Button.tsx
│   └── utils
└── dist
```

**Characters:**
- `├──` Branch connector
- `└──` Last branch
- `│  ` Vertical line

## Styling

### CSS Variables

Customize the component by overriding CSS variables:

```css
:root {
  /* Dark theme (default) */
  --tinita-filetree-bg: #0a0a0a;
  --tinita-filetree-text: #e0e0e0;
  --tinita-filetree-hover: rgba(255, 255, 255, 0.05);
  --tinita-filetree-indent: 16px;

  /* Icon colors */
  --tinita-filetree-icon-folder: #666;
  --tinita-filetree-icon-javascript: #facc15;
  --tinita-filetree-icon-markdown: #4b8bea;
  --tinita-filetree-icon-css: #61dafb;
  /* ... more icon colors */
}
```

### Light Theme

```css
[data-theme='light'] {
  --tinita-filetree-bg: #ffffff;
  --tinita-filetree-text: #1a1a1a;
  --tinita-filetree-hover: rgba(0, 0, 0, 0.05);
}
```

```tsx
<div data-theme="light">
  <FileTree text={treeText} />
</div>
```

## File Type Icons

Icons are colored borders based on file extensions:

| Type | Extensions | Color |
|---|---|---|
| **Folder** | (directories) | Gray |
| **README** | `README.*` | Blue |
| **Markdown** | `.md` | Blue |
| **JavaScript** | `.js` | Yellow |
| **CSS** | `.css` | Cyan |
| **HTML** | `.html`, `.htm` | Red |
| **JSON** | `.json` | Yellow |
| **PHP** | `.php` | Purple |
| **Vue** | `.vue` | Green |
| **Git** | `.git*` | Red |
| **Database** | `.yml`, `.yaml` | Blue |
| **Text** | `.txt` | Gray |

## Advanced Usage

### From External Source

```tsx
import { useState, useEffect } from 'react';
import { FileTree } from 'tinita-react/ui';

function DynamicTree() {
  const [treeText, setTreeText] = useState('');

  useEffect(() => {
    // Fetch tree from API or execute CLI command
    fetch('/api/file-structure')
      .then(res => res.text())
      .then(text => setTreeText(text));
  }, []);

  return treeText ? <FileTree text={treeText} /> : <div>Loading...</div>;
}
```

### Execute CLI Tree Command

```bash
# Windows
tree /F /A > tree.txt

# Unix/Mac
tree -a > tree.txt
```

Then read the file content and pass to FileTree.

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- SSR: Full support (Next.js, Remix, Gatsby)

## Performance

- Lightweight parser (~1KB)
- Radix UI Accordion for professional-grade animations
- GPU-accelerated CSS keyframes for smooth transitions
- Minimal dependencies (React + @radix-ui/react-accordion)
- Small bundle size (~6KB minified + gzipped including Radix UI)
- All folders start expanded by default (configurable)
- Respects reduced-motion preference for accessibility
- Zero animation bugs (thanks to Radix UI's battle-tested implementation)

## Accessibility

- ARIA-compliant accordion implementation (Radix UI)
- Full keyboard navigation support (Space, Enter, Arrow keys)
- Screen reader friendly with proper ARIA attributes
- Respects `prefers-reduced-motion` preference (disables animations automatically)
- SSR-safe (Radix UI handles browser environment checks)
- Focus management handled automatically

## TypeScript

Fully typed with TypeScript:

```typescript
import type { FileTreeProps, FileNode } from 'tinita-react/ui';
```

## License

MIT

## Related

- [CSS Guide](../../CSS_GUIDE.md) - Comprehensive CSS customization guide
- [useToggle hook](../../hooks/useToggle.ts) - Toggle hook (not used in this version)
