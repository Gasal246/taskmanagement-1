"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

// Covers multi-step workflows (for example storage upload + database save)
// whose lifetime extends beyond an individual React Query mutation.
const operations = new Set<symbol>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export const hasPendingAction = () => operations.size > 0;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function useHasPendingAction() {
  return useSyncExternalStore(subscribe, hasPendingAction, () => false);
}
export function useActionPending(pending: boolean) {
  useLayoutEffect(() => {
    if (!pending) return;
    const id = Symbol();
    operations.add(id);
    emit();
    return () => { operations.delete(id); emit(); };
  }, [pending]);
}
