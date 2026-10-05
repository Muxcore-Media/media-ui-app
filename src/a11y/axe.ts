import type { RunOptions } from 'axe-core';

/**
 * jsdom does not apply Tailwind or resolve CSS variables, so axe cannot
 * measure contrast. Landmark coverage is the app shell's <main> in Layout.
 */
export const axeOptions: RunOptions = {
  rules: {
    'color-contrast': { enabled: false },
  },
};
