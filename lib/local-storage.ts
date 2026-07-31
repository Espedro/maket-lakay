"use client";

export function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(key: string, value: T, eventName?: string) {
  window.localStorage.setItem(key, JSON.stringify(value));
  if (eventName) {
    window.dispatchEvent(new Event(eventName));
  }
}

export function removeLocalValue(key: string, eventName?: string) {
  window.localStorage.removeItem(key);
  if (eventName) {
    window.dispatchEvent(new Event(eventName));
  }
}
