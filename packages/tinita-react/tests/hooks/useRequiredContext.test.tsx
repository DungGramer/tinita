import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createContext } from 'react';
import { useRequiredContext } from '../../src/hooks/useRequiredContext';

describe('useRequiredContext', () => {
  it('returns the value when a Provider is above it', () => {
    const Ctx = createContext<{ id: number } | null>(null);
    const { result } = renderHook(() => useRequiredContext(Ctx, 'useThing'), {
      wrapper: ({ children }) => <Ctx value={{ id: 7 }}>{children}</Ctx>,
    });
    expect(result.current).toEqual({ id: 7 });
  });

  it('THROWS a message naming the hook and the Provider', () => {
    // The whole value over plain useContext. Without it a missing Provider surfaces
    // as `Cannot read properties of null` inside the consumer, naming neither.
    const Ctx = createContext<{ id: number } | null>(null);
    Ctx.displayName = 'ThingProvider';

    expect(() => renderHook(() => useRequiredContext(Ctx, 'useThing'))).toThrow(
      'useThing must be used within a ThingProvider'
    );
  });

  it('falls back to the providerName argument when displayName is unset', () => {
    const Ctx = createContext<number | null>(null);
    expect(() => renderHook(() => useRequiredContext(Ctx, 'useCount', 'CountProvider'))).toThrow(
      'useCount must be used within a CountProvider'
    );
  });

  it('passes falsy-but-present values through instead of throwing', () => {
    // Only `null` means "no Provider". 0, '' and false are values a caller means.
    for (const value of [0, '', false] as const) {
      const Ctx = createContext<typeof value | null>(null);
      const { result } = renderHook(() => useRequiredContext(Ctx), {
        wrapper: ({ children }) => <Ctx value={value}>{children}</Ctx>,
      });
      expect(result.current).toBe(value);
    }
  });
});
