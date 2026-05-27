/**
 * Vitest 测试设置文件
 */
import '@testing-library/jest-dom';

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

// Node 22 exposes localStorage through a getter that warns unless a storage file is
// configured. Inspect the descriptor instead of reading the property during setup.
if (!localStorageDescriptor || localStorageDescriptor.get) {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
}
