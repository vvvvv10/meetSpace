import { useSyncExternalStore } from 'react';

/** 会议室预订的三种视图：现代版 / 经典版 / 日历版 */
export type ViewMode = 'modern' | 'classic' | 'calendar';

const VIEW_KEY = 'meetspace.view.v1';

function read(): ViewMode {
  const raw = localStorage.getItem(VIEW_KEY);
  return raw === 'classic' || raw === 'calendar' || raw === 'modern'
    ? raw
    : 'modern';
}

let viewMode: ViewMode = read();
const listeners = new Set<() => void>();

export const getViewMode = () => viewMode;

export function setViewMode(mode: ViewMode) {
  viewMode = mode;
  localStorage.setItem(VIEW_KEY, mode);
  listeners.forEach((fn) => {
    fn();
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useViewMode(): ViewMode {
  return useSyncExternalStore(subscribe, getViewMode, getViewMode);
}
