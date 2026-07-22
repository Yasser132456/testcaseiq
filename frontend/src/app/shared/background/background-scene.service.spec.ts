import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LenisService } from '../../core/motion/lenis.service';
import { MotionQualityTier, MotionService } from '../../core/motion/motion.service';
import {
  BackgroundSceneService,
  backgroundSceneAccentNameForRoute,
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
    const forcedFallbackState = signal(forcedFallback);
    const qualityTierState = signal<MotionQualityTier>(qualityTier);
    const reducedMotionState = signal(reducedMotion);
    const sceneEffectsEnabled = computed(() =>
      documentVisible()
      && !reducedMotionState()
      && !forcedFallbackState()
      && qualityTierState() !== 'static'
    );
    const cursorEffectsEnabled = computed(() => sceneEffectsEnabled());
    const gsap = jasmine.createSpyObj('gsap', ['to', 'quickTo']);
    const quickTo = (() => undefined) as (() => void) & { tween: { kill(): void } };
    quickTo.tween = { kill: () => undefined };
    gsap.quickTo.and.returnValue(quickTo);
    const motion = {
      cursorEffectsEnabled,
      documentVisible,
      forcedFallback: forcedFallbackState,
      gsap,
      qualityTier: qualityTierState,
      reducedMotion: reducedMotionState,
      sceneEffectsEnabled
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LenisService, useValue: { scrollVelocity: () => 0 } },
        { provide: MotionService, useValue: motion }
      ]
    });

    return {
      documentVisible,
      gsap,
      motion,
      qualityTier: qualityTierState,
      service: TestBed.inject(BackgroundSceneService)
    };
  }

  function installMinimalHandles(service: BackgroundSceneService): void {
    (service as unknown as { handles: unknown }).handles = {
      camera: { position: { x: 0, y: 0 } },
      cursorDrift: { x: 0, y: 0 },
      cursorLight: { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, enabled: 0 },
      layers: [],
      renderer: {
        dispose: jasmine.createSpy('dispose'),
        domElement: { remove: jasmine.createSpy('remove') },
        render: jasmine.createSpy('render')
      },
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

  it('kills a high-tier operation pulse when quality drops to medium without disabling the scene', () => {
    const { gsap, motion, qualityTier, service } = createService();
    installMinimalHandles(service);
    const kill = jasmine.createSpy('killOperationPulse');
    gsap.to.and.returnValue({ kill });

    service.setOperationAccent('cyan');
    expect(motion.sceneEffectsEnabled()).toBeTrue();

    qualityTier.set('medium');
    TestBed.flushEffects();

    expect(motion.sceneEffectsEnabled()).toBeTrue();
    expect(kill).toHaveBeenCalled();
  });

  it('kills pointer, accent, and operation GSAP activity on dispose', () => {
    const { gsap, service } = createService();
    installMinimalHandles(service);
    const kills = Array.from({ length: 5 }, (_, index) => jasmine.createSpy(`killTween${index}`));
    const quickX = (() => undefined) as (() => void) & { tween: { kill(): void } };
    const quickY = (() => undefined) as (() => void) & { tween: { kill(): void } };
    quickX.tween = { kill: kills[0] };
    quickY.tween = { kill: kills[1] };
    gsap.quickTo.and.returnValues(quickX, quickY);
    gsap.to.and.returnValues(
      { kill: kills[2] },
      { kill: kills[3] },
      { kill: kills[4] }
    );

    (service as unknown as { bindPointerInteraction(): void }).bindPointerInteraction();
    service.setSceneAccent('violet');
    service.setOperationAccent('cyan');
    service.dispose();

    kills.forEach((kill) => expect(kill).toHaveBeenCalled());
  });

  it('returns fallback before probing WebGL on the static quality tier', async () => {
    const { service } = createService({ qualityTier: 'static' });
    const host = document.createElement('div');
    const createElement = spyOn(document, 'createElement').and.callThrough();

    expect(await service.init(host)).toBe('fallback');
    expect(createElement).not.toHaveBeenCalled();
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
