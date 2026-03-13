import type { StoreApi, UseBoundStore } from 'zustand';

/**
 * Type that extends a Zustand store with auto-generated selectors.
 * Adds a `use` namespace with selector functions for each top-level store key.
 */
type WithSelectors<S> = S extends { getState: () => infer T } ? S & { use: { [K in keyof T]: () => T[K] } } : never;

/**
 * Adds a `use` selector namespace to a Zustand store so every top-level store
 * key (state fields and action functions) can be consumed as `store.use.key()`.
 * Use this when exporting app stores to keep selector usage consistent and
 * avoid repeating inline selectors.
 */
export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(_store: S): WithSelectors<S> {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {} as WithSelectors<S>['use'];

  for (const key of Object.keys(store.getState())) {
    // Actions are included too, so `store.use.someAction()` returns the stable action function.
    (store.use as Record<string, () => unknown>)[key] = () => store((state) => state[key as keyof typeof state]);
  }

  return store;
}
