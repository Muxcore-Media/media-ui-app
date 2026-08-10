import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

beforeAll(() => {
  // jsdom does not implement media element load(); VideoPlayer calls it on src change.
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: function load() {
      /* no-op for unit tests */
    },
  })
})

afterEach(() => {
  cleanup()
})
