import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MotionService } from '../../core/motion/motion.service';
import { PointerGlowService } from './pointer-glow.service';

describe('PointerGlowService', () => {
  let listeners: Record<string, EventListener> = {};
  let rafCallbacks: Record<number, FrameRequestCallback> = {};
  let nextFrame = 0;

  function configureMotion(overrides: {
    coarse?: boolean;
    forcedFallback?: boolean;
    reducedMotion?: boolean;
    visible?: boolean;
  } = {}) {
    const coarse = signal(overrides.coarse ?? false);
    const forcedFallback = signal(overrides.forcedFallback ?? false);
    const reducedMotion = signal(overrides.reducedMotion ?? false);
    const visible = signal(overrides.visible ?? true);
    const cursorEffectsEnabled = computed(() =>
      visible() && !reducedMotion() && !forcedFallback() && !coarse()
    );

    TestBed.configureTestingModule({
      providers: [{ provide: MotionService, useValue: { cursorEffectsEnabled } }]
    });

    return { coarse, forcedFallback, reducedMotion, visible };
  }

  beforeEach(() => {
    listeners = {};
    rafCallbacks = {};
    nextFrame = 0;

    spyOn(document, 'addEventListener').and.callFake((type: string, listener: EventListenerOrEventListenerObject) => {
      listeners[type] = listener as EventListener;
    });
    spyOn(document, 'removeEventListener').and.stub();
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      const id = ++nextFrame;
      rafCallbacks[id] = callback;
      return id;
    });
    spyOn(window, 'cancelAnimationFrame').and.callFake((id: number) => {
      delete rafCallbacks[id];
    });
  });

  afterEach(() => {
    document.querySelectorAll('.glass-surface--live').forEach((element) => element.remove());
  });

  it('updates live glass variables only for hovered or nearby elements', () => {
    configureMotion();
    const service = TestBed.inject(PointerGlowService);
    service.start();

    const near = document.createElement('div');
    near.className = 'glass-surface--live';
    near.getBoundingClientRect = () => ({
      x: 80, y: 80, left: 80, top: 80, right: 180, bottom: 180, width: 100, height: 100,
      toJSON: () => ({})
    } as DOMRect);

    const far = document.createElement('div');
    far.className = 'glass-surface--live';
    far.getBoundingClientRect = () => ({
      x: 500, y: 500, left: 500, top: 500, right: 600, bottom: 600, width: 100, height: 100,
      toJSON: () => ({})
    } as DOMRect);

    document.body.append(near, far);
    listeners['pointermove'](new PointerEvent('pointermove', { clientX: 100, clientY: 100, pointerType: 'mouse' }));
    (window.requestAnimationFrame as jasmine.Spy).calls.mostRecent().args[0](0);

    expect(near.style.getPropertyValue('--pointer-x')).toBe('20px');
    expect(near.style.getPropertyValue('--pointer-y')).toBe('20px');
    expect(far.style.getPropertyValue('--pointer-x')).toBe('');
  });

  [
    { label: 'reduced motion', policy: { reducedMotion: true } },
    { label: 'forced fallback', policy: { forcedFallback: true } },
    { label: 'a coarse pointer', policy: { coarse: true } },
    { label: 'a hidden document', policy: { visible: false } }
  ].forEach(({ label, policy }) => {
    it(`does not register pointer tracking for ${label}`, () => {
      configureMotion(policy);
      TestBed.inject(PointerGlowService).start();

      expect(document.addEventListener).not.toHaveBeenCalledWith(
        'pointermove', jasmine.any(Function), jasmine.anything()
      );
    });
  });

  it('cancels a queued frame and clears active CSS variables when policy disables tracking', () => {
    const motion = configureMotion();
    const service = TestBed.inject(PointerGlowService);
    service.start();

    const target = document.createElement('div');
    target.className = 'glass-surface--live';
    target.getBoundingClientRect = () => ({
      x: 80, y: 80, left: 80, top: 80, right: 180, bottom: 180, width: 100, height: 100,
      toJSON: () => ({})
    } as DOMRect);
    document.body.append(target);

    listeners['pointermove'](new PointerEvent('pointermove', { clientX: 100, clientY: 100, pointerType: 'mouse' }));
    (window.requestAnimationFrame as jasmine.Spy).calls.mostRecent().args[0](0);
    listeners['pointermove'](new PointerEvent('pointermove', { clientX: 110, clientY: 110, pointerType: 'mouse' }));
    const queuedFrame = nextFrame;

    motion.visible.set(false);
    TestBed.flushEffects();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(queuedFrame);
    expect(document.removeEventListener).toHaveBeenCalledWith('pointermove', jasmine.any(Function));
    expect(target.style.getPropertyValue('--pointer-active')).toBe('');
    expect(target.style.getPropertyValue('--pointer-x')).toBe('');
    expect(target.style.getPropertyValue('--pointer-y')).toBe('');
  });

  it('removes listener and queued work when its injector is destroyed', () => {
    configureMotion();
    const service = TestBed.inject(PointerGlowService);
    service.start();
    const target = document.createElement('div');
    target.className = 'glass-surface--live';
    target.getBoundingClientRect = () => ({
      x: 80, y: 80, left: 80, top: 80, right: 180, bottom: 180, width: 100, height: 100,
      toJSON: () => ({})
    } as DOMRect);
    document.body.append(target);
    listeners['pointermove'](new PointerEvent('pointermove', { clientX: 100, clientY: 100, pointerType: 'mouse' }));
    (window.requestAnimationFrame as jasmine.Spy).calls.mostRecent().args[0](0);
    listeners['pointermove'](new PointerEvent('pointermove', { clientX: 110, clientY: 110, pointerType: 'mouse' }));
    const queuedFrame = nextFrame;

    TestBed.resetTestingModule();

    expect(document.removeEventListener).toHaveBeenCalledWith('pointermove', jasmine.any(Function));
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(queuedFrame);
    expect(target.style.getPropertyValue('--pointer-active')).toBe('');
    expect(target.style.getPropertyValue('--pointer-x')).toBe('');
    expect(target.style.getPropertyValue('--pointer-y')).toBe('');
  });
});
