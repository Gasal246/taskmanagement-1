"use client";

import { useSyncExternalStore } from "react";

let now = Date.now();
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const startTicker = () => {
  if (intervalId) return;

  intervalId = setInterval(() => {
    now = Date.now();
    listeners.forEach((listener) => listener());
  }, 1000);
};

const stopTicker = () => {
  if (listeners.size > 0 || !intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  startTicker();

  return () => {
    listeners.delete(listener);
    stopTicker();
  };
};

const getSnapshot = () => now;

export const useNow = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
