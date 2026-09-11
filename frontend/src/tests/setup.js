/**
 * Vitest global setup — runs before each test file
 */
import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = String(v) },
    removeItem: (k)    => { delete store[k] },
    clear:      ()     => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Simple framer-motion mock — renders children directly as div
vi.mock('framer-motion', () => {
  const React = require('react')

  const createMotion = (tag) =>
    React.forwardRef(({ children, ...rest }, ref) => {
      // Strip framer-specific props so they don't reach the DOM
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, whileFocus, whileDrag,
        layout, layoutId, style, ...domProps
      } = rest
      return React.createElement(tag, { ...domProps, style, ref }, children)
    })

  const motionProxy = new Proxy({}, {
    get: (_, tag) => createMotion(tag),
  })

  return {
    motion:         motionProxy,
    AnimatePresence: ({ children }) => children,
    useAnimation:   () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValue: (v) => ({ get: () => v, set: vi.fn() }),
    useTransform:   (v, _i, _o) => v,
    useSpring:      (v) => v,
  }
})
