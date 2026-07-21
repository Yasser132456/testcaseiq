import { backgroundSceneAccentNameForRoute, backgroundSceneModeForRoute } from './background-scene.service';

describe('backgroundSceneAccentNameForRoute', () => {
  it('maps primary route contexts to scene accents', () => {
    expect(backgroundSceneAccentNameForRoute('/dashboard')).toBe('phosphor');
    expect(backgroundSceneAccentNameForRoute('/stories/42')).toBe('violet');
    expect(backgroundSceneAccentNameForRoute('/test-suites')).toBe('cyan');
    expect(backgroundSceneAccentNameForRoute('/review-board')).toBe('green');
  });

  it('maps analysis contexts to violet and generation contexts to cyan', () => {
    expect(backgroundSceneAccentNameForRoute('/projects/7/analysis')).toBe('violet');
    expect(backgroundSceneAccentNameForRoute('/test-generation')).toBe('cyan');
  });
});

describe('backgroundSceneModeForRoute', () => {
  it('uses the cinematic welcome mode only on the public brand-register route', () => {
    expect(backgroundSceneModeForRoute('/')).toBe('welcome');
    expect(backgroundSceneModeForRoute('/?bg=fallback')).toBe('welcome');
    expect(backgroundSceneModeForRoute('/login')).toBe('ambient');
    expect(backgroundSceneModeForRoute('/register')).toBe('ambient');
    expect(backgroundSceneModeForRoute('/dashboard')).toBe('ambient');
  });
});
