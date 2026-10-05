import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import 'vitest-axe/extend-expect';

expect.extend(axeMatchers);

function memoryStorage(): Storage {
  const mem = new Map<string, string>();
  return {
    get length() {
      return mem.size;
    },
    clear() {
      mem.clear();
    },
    getItem(key: string) {
      return mem.get(String(key)) ?? null;
    },
    key(index: number) {
      return [...mem.keys()][index] ?? null;
    },
    removeItem(key: string) {
      mem.delete(String(key));
    },
    setItem(key: string, value: string) {
      mem.set(String(key), String(value));
    },
  };
}

if (typeof globalThis.localStorage?.clear !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage() });
}
if (typeof globalThis.sessionStorage?.clear !== 'function') {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: memoryStorage() });
}

beforeAll(() => {
  // axe-core probes canvas for icon ligatures; jsdom has no canvas implementation.
  if (typeof HTMLCanvasElement !== 'undefined') {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      writable: true,
      value: function getContext() {
        return null;
      },
    });
  }

  // jsdom does not implement media element load(); VideoPlayer calls it on src change.
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: function load() {
      /* no-op for unit tests */
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: function play() {
      return Promise.resolve();
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: function pause() {
      /* no-op for unit tests */
    },
  });

  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: () => 'blob:test',
    });
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
