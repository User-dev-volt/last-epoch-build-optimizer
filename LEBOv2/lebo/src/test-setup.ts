import '@testing-library/jest-dom'

// Headless UI Listbox uses ResizeObserver internally — not available in jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
