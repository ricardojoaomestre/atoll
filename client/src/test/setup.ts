import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

Object.defineProperty(document, 'fonts', {
  configurable: true,
  value: { ready: Promise.resolve() },
})

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  measureText: (value: string) => ({ width: value.length }),
  font: '16px monospace',
})) as unknown as typeof HTMLCanvasElement.prototype.getContext

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  document.documentElement.removeAttribute('data-sky')
  localStorage.clear()
})
