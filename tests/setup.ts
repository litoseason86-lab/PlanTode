import '@testing-library/jest-dom/vitest';
import {createElement, forwardRef, type ComponentProps} from 'react';
import {vi} from 'vitest';

const TEST_ELEMENT_WIDTH = 1024;
const TEST_ELEMENT_HEIGHT = 768;

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  const ResponsiveContainer = forwardRef<HTMLDivElement, ComponentProps<typeof actual.ResponsiveContainer>>((props, ref) => {
    return createElement(actual.ResponsiveContainer, {
      ...props,
      ref,
      initialDimension: props.initialDimension ?? {
        width: TEST_ELEMENT_WIDTH,
        height: TEST_ELEMENT_HEIGHT,
      },
    });
  });

  ResponsiveContainer.displayName = 'TestResponsiveContainer';

  return {
    ...actual,
    ResponsiveContainer,
  };
});

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    const contentRect = target.getBoundingClientRect();
    const entry = {
      target,
      contentRect,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as unknown as ResizeObserverEntry;

    this.callback([entry], this as unknown as ResizeObserver);
  }

  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value() {
    return {
      width: TEST_ELEMENT_WIDTH,
      height: TEST_ELEMENT_HEIGHT,
      top: 0,
      left: 0,
      right: TEST_ELEMENT_WIDTH,
      bottom: TEST_ELEMENT_HEIGHT,
      x: 0,
      y: 0,
      toJSON() {
        return this;
      },
    };
  },
});

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    return TEST_ELEMENT_WIDTH;
  },
});

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    return TEST_ELEMENT_HEIGHT;
  },
});

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get() {
    return TEST_ELEMENT_WIDTH;
  },
});

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() {
    return TEST_ELEMENT_HEIGHT;
  },
});
