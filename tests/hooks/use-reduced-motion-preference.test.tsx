import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference';

function MotionProbe() {
  const reducedMotion = useReducedMotionPreference();
  return <span data-testid="motion-preference">{String(reducedMotion)}</span>;
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: originalMatchMedia,
  });
  vi.restoreAllMocks();
});

describe('useReducedMotionPreference', () => {
  it('uses the conservative reduced-motion server snapshot', () => {
    expect(renderToString(<MotionProbe />)).toContain('true');
  });

  it('reads browser preference changes through useSyncExternalStore', () => {
    let matches = false;
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const mediaQuery = {
      get matches() {
        return matches;
      },
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener);
      },
      removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener);
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => mediaQuery),
    });

    render(<MotionProbe />);
    expect(screen.getByTestId('motion-preference')).toHaveTextContent('false');

    act(() => {
      matches = true;
      const event = new Event('change');
      for (const listener of listeners) {
        if (typeof listener === 'function') listener(event);
        else listener.handleEvent(event);
      }
    });
    expect(screen.getByTestId('motion-preference')).toHaveTextContent('true');
  });
});
