'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { variantAttributes } from '../../utils/variantAttributes';
import type { TreeNode, TreeNodeRenderContext, TreeProps, TreeSort } from './types';
import { createTreeStore, useNodeState, type TreeStore } from './store';
import styles from './Tree.module.css';

/**
 * Icon vẽ tay, KHÔNG dùng thư viện.
 *
 * `Tree` là primitive nên nó phải chạy được mà không kéo theo `lucide-react`.
 * `FileTree` mới là chỗ dùng lucide cho icon theo phần mở rộng file. Hai SVG này
 * lấy đúng hình học của lucide (viewBox 24, stroke 2, linecap round) để nét khớp
 * với icon file khi hai bên đứng cạnh nhau.
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

/** So sánh tự nhiên: `file2` đứng trước `file10`, không phải sau. */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const isFolderNode = (node: TreeNode) => node.children !== undefined;

/**
 * Nhãn như người dùng ĐỌC nó, gồm cả `nameSuffix`.
 *
 * Sort và gõ-để-nhảy phải dùng cái này, không phải `node.name`. `FileTree` tách
 * `Button.tsx` thành `name: 'Button'` + `nameSuffix: '.tsx'`, nên sort theo
 * `node.name` sẽ so `'Button'` với `'Button.test'` - thứ tự đổi mà không ai đổi gì.
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

  // `toSorted` chưa có ở Node 18, và sort tại chỗ sẽ sửa mảng của người gọi.
  return [...nodes]
    .sort(compare)
    .map((node) => (node.children ? { ...node, children: sortNodes(node.children, sort) } : node));
}

/** Mọi id thư mục, để `defaultExpanded: true` mở được toàn bộ. */
function collectFolderIds(nodes: TreeNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children) {
      out.push(node.id);
      collectFolderIds(node.children, out);
    }
  }
  return out;
}

/** Node hiện đang NHÌN THẤY, theo thứ tự trên màn hình. Đây là trục của bàn phím. */
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
  // Hàng nhận Tab là hàng đang active, hoặc hàng đầu nếu chưa có. Roving tabindex -
  // cả cây là MỘT điểm dừng Tab, đúng chuẩn ARIA tree.
  const tabbableId =
    (activeId && visible.some((v) => v.node.id === activeId) ? activeId : visible[0]?.node.id) ??
    null;

  /**
   * Store nghe theo TỪNG id. Xem `store.ts` để biết vì sao.
   *
   * Tóm lại: giữ `Set` trong state và truyền xuống làm mọi `TreeItem` render lại
   * mỗi lần toggle - đo được 242ms đứng luồng trên cây 1364 dòng.
   */
  const store = useRef<TreeStore>(undefined as unknown as TreeStore);
  if (!store.current) store.current = createTreeStore();

  const latest = useRef({ expandedList, isControlled, onExpandedChange });
  latest.current = { expandedList, isControlled, onExpandedChange };

  // Đồng bộ trước khi trình duyệt vẽ, nếu không node vừa mở sẽ trễ một frame.
  useEffect(() => {
    store.current.sync({ expanded: expandedSet, selected, tabbable: tabbableId });
  }, [expandedSet, selected, tabbableId]);

  /**
   * `toggle` và `focusRow` phải ỔN ĐỊNH về identity.
   *
   * Chúng đi xuống qua context tới mọi item. Nếu identity đổi mỗi lần toggle thì
   * `React.memo` ở `TreeItem` vô hiệu và ta quay lại đúng chỗ cũ - vì vậy trạng
   * thái mới nhất đọc từ ref chứ không nằm trong dependency.
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

      // RTL đảo nghĩa của mũi tên trái/phải. Đọc `direction` đã tính chứ không đoán
      // theo prop: người dùng có thể đặt `dir` ở bất kỳ tổ tiên nào.
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
          // Chuẩn ARIA: mở mọi anh em cùng cấp với node đang focus.
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

      // Type-ahead: gõ chữ để nhảy tới node kế tiếp bắt đầu bằng chữ đó.
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
   * Giá trị context chỉ đổi khi PROP đổi, không đổi khi toggle. Đó là điều kiện để
   * `React.memo` ở `TreeItem` thật sự chặn được render lan ra cả cây.
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
      className={[styles.root, className].filter(Boolean).join(' ')}
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

/**
 * Bản sao thu nhỏ của hook trong CarouselTicker.
 *
 * Không export ra ngoài: thêm một public subpath là phải thêm `exports`,
 * `typesVersions`, ca L1 và một story. Khi có component thứ ba cần nó thì nâng lên
 * `src/hooks/`.
 */
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
 * Context mang những thứ KHÔNG đổi khi toggle.
 *
 * Trạng thái đổi liên tục (mở / chọn / tabbable) KHÔNG đi qua đây - context đổi giá
 * trị là mọi consumer render lại, đúng cái ta đang tránh. Chúng đi qua `store`,
 * nơi mỗi node chỉ nghe id của mình.
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
const EMPTY_ANCESTORS: string[] = [];

function useTreeContext(): TreeContextValue {
  const value = useContext(TreeContext);
  if (!value) throw new Error('TreeItem phải nằm trong <Tree>');
  return value;
}

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
 * `memo` ở đây là thứ chặn render lan ra cả cây.
 *
 * Props của nó đều ổn định qua một lần toggle: `node` đến từ mảng đã memo, `level`
 * và `setSize` là số, `ancestors` được memo ở cấp cha. Trạng thái đổi thì đến từ
 * `useNodeState`, và nó chỉ đánh thức đúng node liên quan.
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
    animate,
    renderNode,
    onToggle,
    onSelectedChange,
    onActivate,
  } = useTreeContext();
  const state = useNodeState(store, node.id);

  const isFolder = node.children !== undefined;
  const isExpanded = isFolder && state.isExpanded;
  const isSelected = state.isSelected;

  /** Mảng tổ tiên cho con. Phải ổn định, nếu không `memo` ở cấp dưới vô hiệu. */
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
       * `name` và `nameSuffix` nằm trong MỘT bọc `.label`, không phải hai flex item
       * của `.row`. `.row` có `gap: var(--tnt-tree-gap)` = 6px, nên để rời ra thì
       * `Button` và `.tsx` cách nhau 6px - nhãn đứt làm hai.
       *
       * `dir="auto"` để tên file tiếng Ả Rập hay Do Thái không bị đảo ngược trong
       * giao diện LTR, và tên ASCII không bị đảo trong giao diện RTL.
       */}
      <span
        className={styles.label}
        dir="auto"
        // Chỉ ở chế độ truncate mới cần tooltip: các chế độ khác không mất ký tự
        // nào, và `title` trên MỌI hàng là tooltip nhảy ra khắp nơi khi rê chuột.
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

      {/* Chú thích vẫn phải tới được trình đọc màn hình kể cả khi nó nằm trong
          tooltip. `title` một mình là không đủ - hỗ trợ của nó rất chắp vá. */}
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
   * `Collapsible` của Base UI, MỘT cái cho MỖI thư mục - không phải một cái cho mỗi
   * cấp.
   *
   * Vì sao Collapsible chứ không phải Accordion: Accordion là danh sách panel ngang
   * hàng có roving focus giữa các trigger. Dùng nó cho cây thì mỗi cấp phải là một
   * `Accordion.Root` riêng - đo được 17 Root cho cây 19 dòng ở bản đầu, mỗi Root một
   * bộ đo riêng, nên mở một thư mục sâu kích hoạt chuỗi đo dọc lên trên. Collapsible
   * là một đơn vị đóng/mở độc lập, đúng hình dạng của một node cây.
   *
   * KHÔNG dùng `Collapsible.Trigger`: nó render `<button aria-expanded>`, mà trong
   * `role="tree"` thì `aria-expanded` thuộc về `treeitem`. Khai hai lần là trình đọc
   * màn hình đọc sai. Ở đây chỉ mượn Root + Panel; ARIA và bàn phím vẫn theo chuẩn
   * ARIA tree.
   *
   * `render` là cách compose của Base UI, thay cho `asChild` của Radix.
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
