'use client';

import { useRequiredContext } from '../../hooks/useRequiredContext';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { cn } from '../../utils/cn';
import { variantAttributes } from '../../utils/variantAttributes';
import type { TreeNode, TreeNodeRenderContext, TreeProps, TreeSort } from './types';
import { createTreeStore, useNodeState, type TreeStore } from './store';
import styles from './Tree.module.css';

/**
 * Inline SVG, no icon library: `Tree` must work without one.
 *
 * Geometry matches lucide (viewBox 24, stroke 2, linecap round) so the strokes
 * line up when a caller mixes these with lucide icons in the same row.
 */
const ChevronIcon = () => (
  <svg
    className={styles.arrow}
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const HelpIcon = () => (
  <svg
    className={styles.descriptionMark}
    viewBox="0 0 24 24"
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

/** Natural compare: `file2` comes before `file10`, not after. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const isFolderNode = (node: TreeNode) => node.children !== undefined;

/**
 * The label as the user reads it, `nameSuffix` included.
 *
 * Sort and type-ahead must use this rather than `node.name`: with `Button.tsx`
 * split into `name: 'Button'` + `nameSuffix: '.tsx'`, comparing `node.name` alone
 * orders `'Button'` against `'Button.test'` and silently changes the result.
 */
const labelOf = (node: TreeNode) => node.name + (node.nameSuffix ?? '');

function sortNodes(nodes: TreeNode[], sort: TreeSort): TreeNode[] {
  if (sort === 'none') return nodes;

  const compare =
    typeof sort === 'function'
      ? sort
      : sort === 'name'
        ? (a: TreeNode, b: TreeNode) => collator.compare(labelOf(a), labelOf(b))
        : (a: TreeNode, b: TreeNode) => {
            const byType = Number(isFolderNode(b)) - Number(isFolderNode(a));
            return byType !== 0 ? byType : collator.compare(labelOf(a), labelOf(b));
          };

  // `toSorted` needs Node 20, and an in-place sort would mutate the caller's array.
  return [...nodes]
    .sort(compare)
    .map((node) => (node.children ? { ...node, children: sortNodes(node.children, sort) } : node));
}

/** Every folder id, so `defaultExpanded: true` can open all of them. */
function collectFolderIds(nodes: TreeNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children) {
      out.push(node.id);
      collectFolderIds(node.children, out);
    }
  }
  return out;
}

/** Currently VISIBLE nodes, in screen order. This is the keyboard's axis. */
function flattenVisible(
  nodes: TreeNode[],
  expanded: Set<string>,
  level = 0,
  ancestors: string[] = [],
  out: Array<{ node: TreeNode; level: number; ancestors: string[] }> = []
) {
  for (const node of nodes) {
    out.push({ node, level, ancestors });
    if (node.children && expanded.has(node.id)) {
      flattenVisible(node.children, expanded, level + 1, [...ancestors, node.id], out);
    }
  }
  return out;
}

function resolveDescriptionScope(showDescriptions: TreeProps['showDescriptions']): {
  all: boolean;
  prefixes: string[];
} {
  if (showDescriptions === true) return { all: true, prefixes: [] };
  if (!showDescriptions) return { all: false, prefixes: [] };
  return {
    all: false,
    prefixes: Array.isArray(showDescriptions) ? showDescriptions : [showDescriptions],
  };
}

export const Tree = React.forwardRef<HTMLDivElement, TreeProps>(function Tree(
  {
    nodes,
    defaultExpanded = true,
    expanded: expandedProp,
    onExpandedChange,
    selected,
    onSelectedChange,
    sort = 'none',
    showDescriptions = false,
    renderNode,
    overflow = 'scroll',
    indicator = true,
    size = 'md',
    borderRadius = 'md',
    showArrow = false,
    enableAnimation = true,
    theme,
    className,
    ...rest
  },
  forwardedRef
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element;
      if (typeof forwardedRef === 'function') forwardedRef(element);
      else if (forwardedRef) forwardedRef.current = element;
    },
    [forwardedRef]
  );

  const sorted = useMemo(() => sortNodes(nodes, sort), [nodes, sort]);

  const [uncontrolled, setUncontrolled] = useState<string[]>(() => {
    if (Array.isArray(defaultExpanded)) return defaultExpanded;
    return defaultExpanded ? collectFolderIds(nodes) : [];
  });

  const isControlled = expandedProp !== undefined;
  const expandedList = isControlled ? expandedProp : uncontrolled;
  const expandedSet = useMemo(() => new Set(expandedList), [expandedList]);

  const visible = useMemo(() => flattenVisible(sorted, expandedSet), [sorted, expandedSet]);

  const [activeId, setActiveId] = useState<string | null>(null);
  // The Tab target is the active row, or the first row if there is none. Roving
  // tabindex - the whole tree is ONE tab stop, per the ARIA tree pattern.
  const tabbableId =
    (activeId && visible.some((v) => v.node.id === activeId) ? activeId : visible[0]?.node.id) ??
    null;

  /** Per-id subscription store, so a toggle re-renders one row. See `store.ts`. */
  const store = useRef<TreeStore>(undefined as unknown as TreeStore);
  if (!store.current) store.current = createTreeStore();

  const latest = useRef({ expandedList, isControlled, onExpandedChange });
  latest.current = { expandedList, isControlled, onExpandedChange };

  // Sync before the browser paints, otherwise a just-expanded node lags one frame.
  useEffect(() => {
    store.current.sync({ expanded: expandedSet, selected, tabbable: tabbableId });
  }, [expandedSet, selected, tabbableId]);

  /**
   * `toggle` and `focusRow` must be stable by identity: they reach every item
   * through context, and a new identity per toggle would defeat the `React.memo`
   * on `TreeItem`. That is why the latest state is read from a ref rather than
   * listed as a dependency.
   */
  const toggle = useCallback((id: string, force?: boolean) => {
    const {
      expandedList: list,
      isControlled: controlled,
      onExpandedChange: notify,
    } = latest.current;
    const isOpen = list.includes(id);
    const shouldOpen = force ?? !isOpen;
    if (shouldOpen === isOpen) return;
    const next = shouldOpen ? [...list, id] : list.filter((x) => x !== id);
    if (!controlled) setUncontrolled(next);
    notify?.(next);
  }, []);

  const commitExpanded = useCallback((next: string[]) => {
    const { isControlled: controlled, onExpandedChange: notify } = latest.current;
    if (!controlled) setUncontrolled(next);
    notify?.(next);
  }, []);

  const focusRow = useCallback((id: string) => {
    setActiveId(id);
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-tree-row][data-id="${CSS.escape(id)}"]`)
      ?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tree-row]');
      const id = target?.dataset.id;
      if (!id) return;

      const index = visible.findIndex((v) => v.node.id === id);
      if (index === -1) return;
      const current = visible[index];
      const isFolder = current.node.children !== undefined;
      const isOpen = expandedSet.has(id);

      // RTL swaps the meaning of left/right arrows. Read the computed `direction`
      // instead of guessing from a prop: `dir` may sit on any ancestor.
      const rtl =
        typeof window !== 'undefined' && rootRef.current
          ? getComputedStyle(rootRef.current).direction === 'rtl'
          : false;
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft';

      const move = (to: number) => {
        const next = visible[Math.max(0, Math.min(visible.length - 1, to))];
        if (next) focusRow(next.node.id);
      };

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          move(index + 1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          move(index - 1);
          return;
        case 'Home':
          event.preventDefault();
          move(0);
          return;
        case 'End':
          event.preventDefault();
          move(visible.length - 1);
          return;
        case forward:
          event.preventDefault();
          if (isFolder && !isOpen) toggle(id, true);
          else if (isFolder && isOpen) move(index + 1);
          return;
        case backward:
          event.preventDefault();
          if (isFolder && isOpen) {
            toggle(id, false);
          } else {
            const parentId = current.ancestors[current.ancestors.length - 1];
            if (parentId) focusRow(parentId);
          }
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (isFolder) toggle(id);
          onSelectedChange?.(current.node);
          return;
        case '*': {
          // ARIA pattern: expand every sibling at the focused node's level.
          event.preventDefault();
          const siblings = visible
            .filter(
              (v) =>
                v.level === current.level &&
                v.ancestors[v.ancestors.length - 1] ===
                  current.ancestors[current.ancestors.length - 1] &&
                v.node.children
            )
            .map((v) => v.node.id);
          commitExpanded([...new Set([...expandedList, ...siblings])]);
          return;
        }
        default:
          break;
      }

      // Type-ahead: type a letter to jump to the next node starting with it.
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const lower = event.key.toLowerCase();
        const order = [...visible.slice(index + 1), ...visible.slice(0, index + 1)];
        const hit = order.find((v) => labelOf(v.node).toLowerCase().startsWith(lower));
        if (hit) {
          event.preventDefault();
          focusRow(hit.node.id);
        }
      }
    },
    [visible, expandedSet, expandedList, toggle, focusRow, onSelectedChange, commitExpanded]
  );

  const descriptionScope = useMemo(
    () => resolveDescriptionScope(showDescriptions),
    [showDescriptions]
  );

  const reducedMotion = usePrefersReducedMotion();
  const animate = enableAnimation && !reducedMotion;

  /**
   * The context value changes only when a prop changes, never on a toggle - the
   * precondition for `React.memo` on `TreeItem` to contain a re-render.
   */
  const context = useMemo(
    () => ({
      store: store.current,
      descriptionScope,
      showArrow,
      overflow,
      animate,
      renderNode,
      onToggle: toggle,
      onSelectedChange,
      onActivate: setActiveId,
    }),
    [descriptionScope, showArrow, overflow, animate, renderNode, toggle, onSelectedChange]
  );

  return (
    <div
      {...rest}
      ref={setRefs}
      className={cn(styles.root, className)}
      {...variantAttributes({
        theme,
        indicator,
        size,
        borderRadius,
        showArrow,
        overflow,
        animation: animate,
      })}
      role="tree"
      onKeyDown={onKeyDown}
    >
      <TreeContext.Provider value={context}>
        <TreeLevel nodes={sorted} level={0} ancestors={EMPTY_ANCESTORS} />
      </TreeContext.Provider>
    </div>
  );
});

/** Local copy of the hook in CarouselTicker. Promote to `src/hooks/` on third use. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Context carries only what does not change on a toggle.
 *
 * Expanded / selected / tabbable deliberately do not travel here: a new context
 * value re-renders every consumer. They go through `store` instead.
 */
interface TreeContextValue {
  store: TreeStore;
  descriptionScope: { all: boolean; prefixes: string[] };
  showArrow: boolean;
  overflow: NonNullable<TreeProps['overflow']>;
  animate: boolean;
  renderNode?: TreeProps['renderNode'];
  onToggle: (id: string, force?: boolean) => void;
  onSelectedChange?: (node: TreeNode) => void;
  onActivate: (id: string) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);
TreeContext.displayName = '<Tree>';
const EMPTY_ANCESTORS: string[] = [];

// Delegates to the package's own hook rather than hand-rolling the same check. The
// version this replaced threw its own `Error` with a differently shaped message - one
// idea, two implementations, in one package.
const useTreeContext = (): TreeContextValue => useRequiredContext(TreeContext, 'TreeItem');

interface TreeLevelProps {
  nodes: TreeNode[];
  level: number;
  ancestors: string[];
}

const TreeLevel: React.FC<TreeLevelProps> = ({ nodes, level, ancestors }) => (
  <ul
    className={styles.list}
    role={level === 0 ? 'none' : 'group'}
    {...variantAttributes({ level })}
  >
    {nodes.map((node, index) => (
      <TreeItem
        key={node.id}
        node={node}
        level={level}
        ancestors={ancestors}
        positionInSet={index + 1}
        setSize={nodes.length}
      />
    ))}
  </ul>
);

interface TreeItemProps {
  node: TreeNode;
  level: number;
  ancestors: string[];
  positionInSet: number;
  setSize: number;
}

/**
 * `memo` here is what stops a render from spreading across the tree. Its props are
 * all stable across a toggle; changing state arrives through `useNodeState`, which
 * wakes only the node involved.
 */
const TreeItem = React.memo(function TreeItem({
  node,
  level,
  ancestors,
  positionInSet,
  setSize,
}: TreeItemProps) {
  const {
    store,
    descriptionScope,
    showArrow,
    overflow,
    renderNode,
    onToggle,
    onSelectedChange,
    onActivate,
  } = useTreeContext();
  const state = useNodeState(store, node.id);

  const isFolder = node.children !== undefined;
  const isExpanded = isFolder && state.isExpanded;
  const isSelected = state.isSelected;

  /** Ancestor array for the children. Must be stable or `memo` below is void. */
  const childAncestors = useMemo(() => [...ancestors, node.id], [ancestors, node.id]);

  const inlineDescription =
    node.description !== undefined &&
    (descriptionScope.all ||
      descriptionScope.prefixes.some(
        (prefix) => node.id === prefix || node.id.startsWith(`${prefix}/`)
      ));

  const describedById = node.description !== undefined ? `tnt-desc-${node.id}` : undefined;

  const defaultContent = (
    <>
      {showArrow && (
        <span className={styles.arrowSlot} aria-hidden="true">
          {isFolder && <ChevronIcon />}
        </span>
      )}
      {(isExpanded ? (node.expandedIcon ?? node.icon) : node.icon) && (
        <span className={styles.iconSlot} aria-hidden="true">
          {isExpanded ? (node.expandedIcon ?? node.icon) : node.icon}
        </span>
      )}
      {/**
       * `name` and `nameSuffix` share one `.label` wrapper rather than sitting as
       * two flex items of `.row`, which has a `gap` that would otherwise appear
       * between `Button` and `.tsx`.
       *
       * `dir="auto"` keeps RTL file names from being reversed in an LTR interface,
       * and ASCII names from being reversed in an RTL one.
       */}
      <span
        className={styles.label}
        dir="auto"
        // Only truncate loses characters; a `title` on every row would mean
        // tooltips popping up all over on hover.
        title={overflow === 'truncate' ? labelOf(node) : undefined}
      >
        <span className={styles.name}>{node.name}</span>
        {node.nameSuffix !== undefined && node.nameSuffix !== '' && (
          <span className={styles.extension}>{node.nameSuffix}</span>
        )}
      </span>
      {node.description !== undefined &&
        (inlineDescription ? (
          <span className={styles.description} dir="auto">
            {node.description}
          </span>
        ) : (
          <HelpIcon />
        ))}
    </>
  );

  const context: TreeNodeRenderContext = {
    node,
    level,
    isExpanded,
    isSelected,
    isFolder,
    ancestors,
    defaultContent,
    toggle: () => onToggle(node.id),
    select: () => onSelectedChange?.(node),
  };

  const body = (
    <li
      className={styles.item}
      role="treeitem"
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isSelected || undefined}
      aria-level={level + 1}
      aria-posinset={positionInSet}
      aria-setsize={setSize}
      aria-disabled={node.disabled || undefined}
    >
      <div
        {...variantAttributes({ treeRow: true, id: node.id })}
        className={styles.row}
        tabIndex={node.disabled ? -1 : state.isTabbable ? 0 : -1}
        aria-describedby={!inlineDescription ? describedById : undefined}
        title={!inlineDescription ? node.description : undefined}
        onFocus={() => onActivate(node.id)}
        onClick={() => {
          if (node.disabled) return;
          if (isFolder) onToggle(node.id);
          onSelectedChange?.(node);
        }}
        {...variantAttributes({ selected: isSelected || undefined, folder: isFolder })}
      >
        {renderNode ? renderNode(node, context) : defaultContent}
      </div>

      {/* The description must reach screen readers even when it lives in a
          tooltip; `title` alone is not reliably announced. */}
      {node.description !== undefined && !inlineDescription && (
        <span id={describedById} className={styles.srOnly}>
          {node.description}
        </span>
      )}

      {isFolder && (
        <Collapsible.Panel className={styles.group}>
          <div className={styles.groupInner}>
            <TreeLevel nodes={node.children ?? []} level={level + 1} ancestors={childAncestors} />
          </div>
        </Collapsible.Panel>
      )}
    </li>
  );

  /**
   * Base UI's `Collapsible`, one per folder.
   *
   * Collapsible and not Accordion: an Accordion is a list of sibling panels with
   * roving focus between triggers, so a tree would need one `Accordion.Root` per
   * level, each with its own measurement pass - expanding one deep folder then
   * triggers a chain of measurements up the ancestry. A Collapsible is a single
   * open/close unit, which is the shape of a tree node.
   *
   * Do not use `Collapsible.Trigger`: it renders `<button aria-expanded>`, but
   * inside `role="tree"` the `aria-expanded` belongs on the `treeitem`, and
   * declaring it twice makes screen readers announce the wrong thing. Only Root
   * and Panel are borrowed; ARIA and keyboard handling follow the ARIA tree
   * pattern.
   */
  if (!isFolder) return body;

  return (
    <Collapsible.Root
      open={isExpanded}
      onOpenChange={(open) => onToggle(node.id, open)}
      disabled={node.disabled}
      render={body}
    />
  );
});
