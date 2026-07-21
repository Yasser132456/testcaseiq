import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LenisService } from '../../core/motion/lenis.service';
import { MotionQualityTier, MotionService } from '../../core/motion/motion.service';
import {
  BackgroundSceneService,
  backgroundSceneAccentNameForRoute,
  backgroundSceneModeForRoute,
  operationAccentEnabledForMotion
} from './background-scene.service';

describe('BackgroundSceneService motion policy', () => {
  function createService({
    forcedFallback = false,
    qualityTier = 'high' as MotionQualityTier,
    reducedMotion = false,
    visible = true
  } = {}) {
    const documentVisible = signal(visible);
    const cursorEffectsEnabled = signal(visible && !reducedMotion && !forcedFallback && qualityTier === 'high');
    const sceneEffectsEnabled = signal(visible && !reducedMotion && !forcedFallback && qualityTier !== 'static');
    const gsap = jasmine.createSpyObj('gsap', ['to', 'quickTo']);
    gsap.quickTo.and.returnValue(() => undefined);
    const motion = {
      cursorEffectsEnabled,
      documentVisible,
      forcedFallback: signal(forcedFallback),
      gsap,
      qualityTier: signal(qualityTier),
      reducedMotion: signal(reducedMotion),
      sceneEffectsEnabled
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LenisService, useValue: { scrollVelocity: () => 0 } },
        { provide: MotionService, useValue: motion }
      ]
    });

    return { documentVisible, gsap, motion, service: TestBed.inject(BackgroundSceneService) };
  }

  function installMinimalHandles(service: BackgroundSceneService): void {
    (service as unknown as { handles: unknown }).handles = {
      camera: { position: { x: 0, y: 0 } },
      cursorDrift: { x: 0, y: 0 },
      cursorLight: { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, enabled: 0 },
      layers: [],
      renderer: { render: jasmine.createSpy('render') },
      resizeObserver: { disconnect: () => undefined },
      scene: {},
      staticRender: false,
      tint: { r: 0, g: 0, b: 0 },
      vignette: { r: 0, g: 0, b: 0 }
    };
    const color = {
      b: 0.4,
      clone() { return this; },
      g: 0.6,
      r: 0.8,
      setRGB: () => undefined
    };
    (service as unknown as { accentPalette: unknown }).accentPalette = {
      cyan: color,
      green: color,
      phosphor: color,
      violet: color
    };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('returns fallback before probing WebGL when fallback is forced', async () => {
    const { service } = createService({ forcedFallback: true });
    const host = document.createElement('div');
    const createElement = spyOn(document, 'createElement').and.callThrough();

    const result = await service.init(host);

    expect(result).toBe('fallback');
    expect(createElement).not.toHaveBeenCalled();
  });

  it('suppresses operation accents while the document is hidden', () => {
    const { gsap, service } = createService({ visible: false });
    installMinimalHandles(service);

    service.setOperationAccent('cyan');

    expect(gsap.to).not.toHaveBeenCalled();
  });

  it('cancels a queued frame on hide and does not schedule another frame while hidden', () => {
    const { documentVisible, motion, service } = createService();
    installMinimalHandles(service);
    const requestFrame = spyOn(window, 'requestAnimationFrame').and.returnValue(41);
    const cancelFrame = spyOn(window, 'cancelAnimationFrame');

    (service as unknown as { animate(): void }).animate();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    documentVisible.set(false);
    motion.sceneEffectsEnabled.set(false);
    TestBed.flushEffects();

    expect(cancelFrame).toHaveBeenCalledWith(41);
    requestFrame.calls.reset();
    (service as unknown as { animate(): void }).animate();
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('applies route accents without queuing GSAP tweens while motion is disabled', () => {
    const { gsap, service } = createService({ visible: false });
    installMinimalHandles(service);

    service.setSceneAccent('cyan');

    expect(gsap.to).not.toHaveBeenCalled();
  });
});

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

describe('operationAccentEnabledForMotion', () => {
  it('allows an operation pulse only on the high motion tier', () => {
    expect(operationAccentEnabledForMotion('high', false)).toBeTrue();
    expect(operationAccentEnabledForMotion('medium', false)).toBeFalse();
    expect(operationAccentEnabledForMotion('static', false)).toBeFalse();
  });

  it('disables the operation pulse for reduced motion', () => {
    expect(operationAccentEnabledForMotion('high', true)).toBeFalse();
  });
});
