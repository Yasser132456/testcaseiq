import { TestBed } from '@angular/core/testing';
import { PointerGlowService } from './pointer-glow.service';

describe('PointerGlowService', () => {
  let listeners: Record<string, EventListener> = {};
  let mediaQueries: Record<string, MediaQueryList>;
  let rafCallback: FrameRequestCallback | undefined;

  beforeEach(() => {
    listeners = {};
    rafCallback = undefined;
    mediaQueries = {};

    spyOn(document, 'addEventListener').and.callFake((type: string, listener: EventListenerOrEventListenerObject) => {
      listeners[type] = listener as EventListener;
    });
    spyOn(document, 'removeEventListener').and.stub();
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    });
    spyOn(window, 'matchMedia').and.callFake((query: string) => {
      const list = {
        matches: !query.includes('prefers-reduced-motion') && !query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true
      } as MediaQueryList;
      mediaQueries[query] = list;
      return list;
    });
  });

  afterEach(() => {
    document.querySelectorAll('.glass-surface--live').forEach((element) => element.remove());
  });

  it('updates live glass variables only for hovered or nearby elements', () => {
    TestBed.configureTestingModule({});
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
    rafCallback?.(0);

    expect(near.style.getPropertyValue('--pointer-x')).toBe('20px');
    expect(near.style.getPropertyValue('--pointer-y')).toBe('20px');
    expect(far.style.getPropertyValue('--pointer-x')).toBe('');
  });

  it('does not register pointer tracking when reduced motion is requested', () => {
    TestBed.configureTestingModule({});
    (window.matchMedia as jasmine.Spy).and.callFake((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true
    } as MediaQueryList));

    const service = TestBed.inject(PointerGlowService);
    service.start();

    expect(document.addEventListener).not.toHaveBeenCalledWith('pointermove', jasmine.any(Function), jasmine.anything());
  });
});
