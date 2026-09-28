import { useSyncExternalStore } from 'react';

/**
 * Store đăng ký THEO TỪNG NODE cho trạng thái mở / chọn / focus.
 *
 * VÌ SAO CẦN: bản đầu giữ `Set` các id đang mở trong state của `Tree` và truyền
 * xuống. Mỗi lần toggle sinh một `Set` mới, nên MỌI `TreeItem` render lại. Đo được
 * 2026-09-28 trên cây 1364 dòng: một lần đóng node gốc làm đứng luồng chính
 * **242ms**, và số dòng trong DOM lúc đó vẫn nguyên 1364 - tức chi phí nằm ở React
 * render lại, không phải ở việc gỡ DOM. Đó là cú giật "cây càng to càng giật".
 *
 * Ở đây mỗi node chỉ nghe đúng id của mình. Mở một thư mục thì chỉ node đó đổi
 * snapshot, nên chỉ nó render lại - chi phí O(1) thay vì O(số dòng).
 *
 * `useSyncExternalStore` trả về BOOLEAN. React tự bỏ qua render khi giá trị không
 * đổi, nên không cần so sánh gì thêm.
 */
export interface TreeStore {
  isExpanded: (id: string) => boolean;
  isSelected: (id: string) => boolean;
  isTabbable: (id: string) => boolean;
  subscribe: (id: string, listener: () => void) => () => void;
  /** Đặt trạng thái mới và chỉ đánh thức những id thật sự đổi. */
  sync: (next: { expanded: Set<string>; selected?: string; tabbable: string | null }) => void;
}

export function createTreeStore(): TreeStore {
  let expanded = new Set<string>();
  let selected: string | undefined;
  let tabbable: string | null = null;
  const listeners = new Map<string, Set<() => void>>();

  const wake = (id: string) => {
    const set = listeners.get(id);
    if (!set) return;
    for (const listener of set) listener();
  };

  return {
    isExpanded: (id) => expanded.has(id),
    isSelected: (id) => selected === id,
    isTabbable: (id) => tabbable === id,

    subscribe(id, listener) {
      let set = listeners.get(id);
      if (!set) {
        set = new Set();
        listeners.set(id, set);
      }
      set.add(listener);
      return () => {
        set!.delete(listener);
        if (set!.size === 0) listeners.delete(id);
      };
    },

    sync(next) {
      const previousExpanded = expanded;
      const previousSelected = selected;
      const previousTabbable = tabbable;
      expanded = next.expanded;
      selected = next.selected;
      tabbable = next.tabbable;

      // Chỉ đánh thức phần đối xứng của hai tập, không phải cả cây.
      for (const id of next.expanded) if (!previousExpanded.has(id)) wake(id);
      for (const id of previousExpanded) if (!next.expanded.has(id)) wake(id);

      if (previousSelected !== selected) {
        if (previousSelected) wake(previousSelected);
        if (selected) wake(selected);
      }
      if (previousTabbable !== tabbable) {
        if (previousTabbable) wake(previousTabbable);
        if (tabbable) wake(tabbable);
      }
    },
  };
}

export function useNodeState(store: TreeStore, id: string) {
  const subscribe = (listener: () => void) => store.subscribe(id, listener);
  return {
    isExpanded: useSyncExternalStore(
      subscribe,
      () => store.isExpanded(id),
      () => false
    ),
    isSelected: useSyncExternalStore(
      subscribe,
      () => store.isSelected(id),
      () => false
    ),
    isTabbable: useSyncExternalStore(
      subscribe,
      () => store.isTabbable(id),
      () => false
    ),
  };
}
