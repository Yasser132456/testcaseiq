import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyWelcomeStats } from './verify-welcome-chunk.mjs';

function stats({ initialBytes = 100, welcomeBytes = 50, welcomeInputs = {} } = {}) {
  return {
    inputs: {},
    outputs: {
      'main-AAA.js': {
        bytes: initialBytes,
        entryPoint: 'src/main.ts',
        inputs: { 'src/main.ts': { bytesInOutput: 10 } }
      },
      'chunk-WELCOME.js': {
        bytes: welcomeBytes,
        entryPoint: 'src/app/pages/welcome/welcome-page.component.ts',
        inputs: {
          'src/app/pages/welcome/welcome-page.component.ts': { bytesInOutput: 20 },
          ...welcomeInputs
        }
      }
    }
  };
}

test('accepts a lazy welcome chunk without initial growth or Three.js', () => {
  const result = verifyWelcomeStats(stats(), stats({ welcomeBytes: 55 }));

  assert.equal(result.initial.deltaBytes, 0);
  assert.equal(result.welcome.deltaBytes, 5);
  assert.equal(result.welcome.threeModuleCount, 0);
  assert.equal(result.welcome.lazy, true);
});

test('rejects shared main-bundle growth', () => {
  assert.throws(
    () => verifyWelcomeStats(stats(), stats({ initialBytes: 101 })),
    /Shared main bundle grew by 1 byte/
  );
});

test('rejects Three.js in the welcome chunk', () => {
  assert.throws(
    () => verifyWelcomeStats(stats(), stats({
      welcomeInputs: { 'node_modules/three/build/three.module.js': { bytesInOutput: 30 } }
    })),
    /Three\.js is present in the welcome chunk/
  );
});
