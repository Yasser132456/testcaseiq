import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareBundleStats,
  summarizeInitialJavaScript,
} from './compare-bundle-stats.mjs';

const stats = (mainBytes = 1_000) => ({
  outputs: {
    'main-A.js': {
      bytes: mainBytes,
      entryPoint: 'src/main.ts',
      imports: [{ path: 'lazy-A.js', kind: 'dynamic-import' }],
    },
    'polyfills-A.js': {
      bytes: 100,
      entryPoint: 'angular:polyfills:angular:polyfills',
      imports: [],
    },
    'lazy-A.js': {
      bytes: 500,
      entryPoint: 'src/app/lazy.ts',
      imports: [],
    },
    'styles-A.css': {
      bytes: 250,
      entryPoint: 'angular:styles/global:styles',
      imports: [],
    },
  },
});

test('summarizeInitialJavaScript totals only initial JavaScript entry points', () => {
  assert.deepEqual(summarizeInitialJavaScript(stats()), {
    bytes: 1_100,
    outputs: ['main-A.js', 'polyfills-A.js'],
  });
});

test('compareBundleStats passes at 5% growth and fails at 5.01%', () => {
  assert.equal(compareBundleStats(stats(), stats(1_055), 5).passed, true);
  assert.equal(compareBundleStats(stats(), stats(1_055.11), 5).passed, false);
});
