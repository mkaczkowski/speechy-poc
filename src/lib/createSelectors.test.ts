import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { create } from 'zustand';

import { createSelectors } from './createSelectors';

interface TestState {
  count: number;
  name: string;
  increment: () => void;
  setName: (name: string) => void;
}

function createTestStore(initial?: Pick<TestState, 'count' | 'name'>) {
  return create<TestState>()((set) => ({
    count: initial?.count ?? 0,
    name: initial?.name ?? 'test',
    increment: () => set((state) => ({ count: state.count + 1 })),
    setName: (name) => set({ name }),
  }));
}

describe('createSelectors', () => {
  it('creates selector hooks for every store key', () => {
    const useStore = createSelectors(createTestStore());
    const selectors = useStore.use as Record<keyof TestState, () => unknown>;

    const expectedKeys: Array<keyof TestState> = ['count', 'name', 'increment', 'setName'];
    for (const key of expectedKeys) {
      expect(typeof selectors[key]).toBe('function');
    }
  });

  it.each([
    { selector: 'count', expected: 42 },
    { selector: 'name', expected: 'hello' },
  ] as const)('returns state from $selector selector', ({ selector, expected }) => {
    const useStore = createSelectors(createTestStore({ count: 42, name: 'hello' }));

    const { result } = renderHook(() => useStore.use[selector]());
    expect(result.current).toBe(expected);
  });

  it('runs action selectors and updates state', () => {
    const useStore = createSelectors(createTestStore({ count: 0, name: 'initial' }));
    const { result: incrementResult } = renderHook(() => useStore.use.increment());
    const { result: setNameResult } = renderHook(() => useStore.use.setName());

    act(() => {
      incrementResult.current();
      setNameResult.current('updated');
    });

    expect(useStore.getState().count).toBe(1);
    expect(useStore.getState().name).toBe('updated');
  });

  it('keeps core Zustand API behavior intact', () => {
    const useStore = createSelectors(createTestStore());
    let subscribedValue = 0;
    const unsubscribe = useStore.subscribe((state) => {
      subscribedValue = state.count;
    });

    act(() => {
      useStore.setState({ count: 200 });
    });

    expect(useStore.getState().count).toBe(200);
    expect(subscribedValue).toBe(200);
    unsubscribe();
  });
});
