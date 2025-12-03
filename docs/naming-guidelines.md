
# Codebase Naming & Component Design Guidelines

**Audience:** Engineers and AI code generators  
**Scope:** TypeScript/JavaScript projects (React/Next.js or similar SPA frameworks)  
**Goal:** Consistent naming and component design that keeps modules plug-and-play, self-contained, and easy to move across projects.

These rules are aligned with widely used style guides (Airbnb, Google, common React/TypeScript practices).

---

## 1. Design Goals

When naming and structuring code, always optimize for:

1. **Readability** – developers can guess behavior from names.
2. **Predictability** – same idea ⇒ same pattern everywhere.
3. **Low coupling** – each folder behaves like a small package.
4. **Portability** – a component folder can be moved with minimal changes.
5. **Stable public APIs** – use barrel exports to hide internals.

Whenever you generate new code, prefer **consistency over personal preference**.

---

## 2. Directory & File Naming

### 2.1 Directory naming

- Use **kebab-case** for directories.
- Name by **domain / purpose**, not by technology (avoid `components`, `hooks`, `types` as top-level segment names whenever you can).

**Rules**

- Directories MUST use `kebab-case`, e.g.:
  - `file-tree`, `user-profile`, `project-settings`
- Directories SHOULD express business or UI intent:
  - ✅ `file-tree`, `auth-panel`, `billing-summary`
  - ❌ `components`, `common`, `utils` (too generic at higher levels)

**Examples**

```text
shared/
  ui/
    file-tree/
    user-avatar/
  lib/
    date-format/
    http-client/
features/
  auth/
    login-form/
    reset-password/
```

---

### 2.2 File naming

Use file names that reflect the **primary export**:

1. **React components:** `PascalCase.tsx`
2. **Custom hooks:** same as hook name, usually `camelCase.ts`
3. **Utilities / libs:** `kebab-case.ts`
4. **Types / interfaces:** suffix `.types.ts` (or `.d.ts` for ambient declarations)
5. **Constants:** suffix `.constants.ts` if they are grouped
6. **Barrel files:** `index.ts` / `index.tsx`
7. **Tests:** `<name>.test.ts[x]` or `<name>.spec.ts[x]`
8. **Stories (Storybook):** `<Component>.stories.tsx`

**Examples**

```text
file-tree/
  FileTree.tsx            // main component
  TreeNode.tsx            // child component
  useFileTree.ts          // custom hook
  file-tree.types.ts      // shared types for this feature
  file-tree.constants.ts  // constants for this feature
  file-tree.utils.ts      // helpers local to this folder
  file-tree.test.tsx      // tests for FileTree
  index.ts                // barrel: public API for this folder
```

---

## 3. Component Design & Folder Structure

Components should be **plug-and-play**:

- All logic, styles, and helpers live nearby.
- External code imports them via a **small public API** (barrel).
- Internals remain private to the folder.

### 3.1 Component folder as a unit

For any non-trivial component, place it in its own folder:

```text
file-tree/
  FileTree.tsx
  TreeNode.tsx
  useFileTree.ts
  file-tree.types.ts
  file-tree.constants.ts
  file-tree.utils.ts
  file-tree.module.scss   // optional styling
  index.ts
```

- `FileTree.tsx` is the **main component**.
- `index.ts` exposes only the public surface:

```ts
// file-tree/index.ts
export { FileTree } from './FileTree';
export type { FileTreeProps } from './file-tree.types';
```

Outside consumers must import via the folder:

```ts
import { FileTree } from '@/shared/ui/file-tree';
```

Never import deep internals like `@/shared/ui/file-tree/file-tree.utils`.

### 3.2 Public vs private inside a folder

- **Public:** main component, public types, and hooks that are safe to reuse.
- **Private:** small helpers, internal components, internal constants.

Rule of thumb:

- If other features should not rely on it directly, **do not export it from `index.ts`**.

---

## 4. Barrel Exports (Category & Local)

Barrel exports help keep imports short, stable, and decoupled.

### 4.1 Local barrel (folder-level)

Each self-contained folder SHOULD provide a local barrel:

```ts
// file-tree/index.ts
export { FileTree } from './FileTree';
export type { FileTreeProps } from './file-tree.types';
```

Consumers use:

```ts
import { FileTree } from '@/shared/ui/file-tree';
```

Benefits:

- Hides file layout.
- Allows internal refactors without changing call sites.

### 4.2 Category barrel (group-level)

Higher-level “category barrels” can re-export from multiple folders:

```ts
// shared/ui/index.ts
export * from './file-tree';
export * from './user-avatar';
export * from './button';
```

Then:

```ts
import { FileTree, UserAvatar } from '@/shared/ui';
```

**Guidelines**

- Category barrels SHOULD only export **stable** components and types.
- Avoid re-exporting deeply nested internal helpers from category barrels.
- Prefer **explicit re-exports** over wildcard when you want strict control:

```ts
// Prefer (explicit)
export { FileTree } from './file-tree';
export { UserAvatar } from './user-avatar';

// Use with caution
export * from './file-tree';
```

### 4.3 Avoiding circular dependencies

- Barrels MUST NOT import from modules that import the same barrel.
- Leaf modules (`FileTree.tsx` etc.) SHOULD NOT import category barrels; they should import siblings directly.

Bad (circular risk):

```ts
// shared/ui/index.ts
export * from './file-tree';

// shared/ui/file-tree/FileTree.tsx
import { UserAvatar } from '../index'; // BAD, creates back edge
```

Good:

```ts
// shared/ui/file-tree/FileTree.tsx
import { UserAvatar } from '../user-avatar';
```

---

## 5. Identifier Naming (Variables, Functions, Types)

These rules follow widely used JavaScript/TypeScript guidance.

### 5.1 General principles

- Names MUST be **descriptive, not cryptic**.
- Avoid single-letter names in most code:
  - ✅ `user`, `filePath`, `selectedNode`
  - ❌ `u`, `fp`, `n`
- Names SHOULD reflect intent and domain, not data structure:
  - ✅ `fileTree`, `activeNodeId`
  - ❌ `arr`, `obj`, `data1`

### 5.2 Case rules by kind

- **Variables & functions:** `camelCase`
- **React components & classes:** `PascalCase`
- **Types & interfaces:** `PascalCase`
- **Enums:** `PascalCase` for enum name; `PascalCase` members or `UPPER_SNAKE_CASE` (pick one pattern and stick with it)
- **Top-level constants:** `UPPER_SNAKE_CASE`

Examples:

```ts
// camelCase for variables & functions
const fileTreeState = useFileTreeState();
function fetchUserProfile(userId: string) {}

// PascalCase for components, classes, types, interfaces
type FileNode = {
  id: string;
  name: string;
  isFolder: boolean;
};

interface FileTreeProps {
  nodes: FileNode[];
}

class HttpClient {
  // ...
}

const FileTree: React.FC<FileTreeProps> = (props) => { /* ... */ };

// Enums
enum FileStatus {
  Idle,
  Loading,
  Error,
}

// Top-level constants
const API_BASE_URL = '/api';
const FILE_TREE_MAX_DEPTH = 8;
```

---

### 5.3 Booleans

- Booleans SHOULD be prefixed with `is`, `has`, `can`, `should`, `needs`, etc.

Examples:

```ts
const isOpen = true;
const hasChildren = node.children.length > 0;
const canExpand = !isLeafNode;
const shouldLazyLoad = depth > 2;
```

Avoid:

```ts
const open = true;  // less clear than isOpen
const child = true; // unclear boolean meaning
```

---

### 5.4 React components & hooks

React community converges on these patterns: components in `PascalCase`, hooks with `use` prefix in `camelCase`.

**Components**

- MUST use `PascalCase`:
  - `FileTree`, `UserAvatar`, `ProjectSettingsPanel`
- File name MUST match component name:
  - Component `FileTree` ⇒ file `FileTree.tsx`

**Hooks**

- MUST start with `use` and use `camelCase`:
  - `useFileTree`, `useAuth`, `useClickOutside`
- Hook file name SHOULD equal hook name:
  - `useFileTree.ts` exports `useFileTree`.

Example:

```ts
// useFileTree.ts
export function useFileTree() {
  // ...
}

// FileTree.tsx
import { useFileTree } from './useFileTree';

export const FileTree: React.FC<FileTreeProps> = (props) => {
  const { nodes, selectedNodeId } = useFileTree(props);
  // ...
};
```

---

### 5.5 Props & state

- Props names SHOULD be semantic and domain-driven:
  - ✅ `nodes`, `selectedNodeId`, `onNodeSelect`
  - ❌ `data`, `value`, `onClick2`

Common patterns:

```ts
type FileTreeProps = {
  nodes: FileNode[];
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
  isDisabled?: boolean;
};
```

**Event handlers**

- Props that accept callbacks SHOULD be prefixed with `on`:
  - `onSubmit`, `onChange`, `onNodeSelect`
- Internal handler functions SHOULD be prefixed with `handle`:
  - `handleSubmit`, `handleNodeSelect`

```ts
// inside component
const handleNodeSelect = (id: string) => {
  onNodeSelect?.(id);
};
```

---

## 6. Example: Self-Contained UI Component

A complete example of a **plug-and-play, low-coupling component folder**:

```text
shared/ui/file-tree/
  FileTree.tsx
  TreeNode.tsx
  useFileTree.ts
  file-tree.types.ts
  file-tree.constants.ts
  file-tree.utils.ts
  file-tree.module.scss
  index.ts
```

**file-tree.types.ts**

```ts
export type FileNode = {
  id: string;
  name: string;
  isFolder: boolean;
  children?: FileNode[];
};

export interface FileTreeProps {
  nodes: FileNode[];
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
  isDisabled?: boolean;
}
```

**file-tree.constants.ts**

```ts
export const FILE_TREE_MAX_DEPTH = 8;
```

**useFileTree.ts**

```ts
import { useState } from 'react';
import type { FileTreeProps } from './file-tree.types';

export function useFileTree(props: FileTreeProps) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleNode = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  return {
    expandedNodeIds,
    toggleNode,
    selectedNodeId: props.selectedNodeId,
  };
}
```

**FileTree.tsx**

```tsx
import React from 'react';
import type { FileTreeProps } from './file-tree.types';
import { useFileTree } from './useFileTree';
import { TreeNode } from './TreeNode';

export const FileTree: React.FC<FileTreeProps> = (props) => {
  const { expandedNodeIds, toggleNode, selectedNodeId } = useFileTree(props);

  return (
    <div className="file-tree">
      {props.nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          expandedNodeIds={expandedNodeIds}
          onToggle={toggleNode}
          selectedNodeId={selectedNodeId}
          onNodeSelect={props.onNodeSelect}
        />
      ))}
    </div>
  );
};
```

**index.ts**

```ts
export { FileTree } from './FileTree';
export type { FileTreeProps, FileNode } from './file-tree.types';
```

Consumers only need:

```ts
import { FileTree } from '@/shared/ui/file-tree';
```

You can move `shared/ui/file-tree` to another project, adjust the import alias, and everything continues to work.

---

## 7. Checklist for AI Code Generation

When generating or modifying code:

1. **Choose directory name**
   - Use `kebab-case`, domain-driven (`file-tree`, `user-profile`).

2. **Create files with correct naming**
   - Main component: `PascalCase.tsx` (e.g., `FileTree.tsx`).
   - Hook: `useSomething.ts`.
   - Utilities: `kebab-case.ts`.
   - Types: `<feature>.types.ts`.
   - Barrel: `index.ts`.

3. **Export public API**
   - Always create `index.ts` for a reusable folder.
   - Re-export only stable components & types.

4. **Use consistent identifier names**
   - `camelCase` variables/functions, `PascalCase` components/types.
   - Boolean names with `is/has/can/should`.
   - Top-level constants in `UPPER_SNAKE_CASE`.

5. **Keep components plug-and-play**
   - Keep helpers and types inside the same folder.
   - Do not rely on deep imports from other features.
   - Import other components via their barrels, not internal paths.

Following these rules ensures that code remains consistent with conventions used across large codebases and can be safely shared between multiple projects and architectures.
