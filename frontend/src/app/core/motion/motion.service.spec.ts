import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { MotionService } from './motion.service';

class MediaQueryListStub {
  readonly media: string;
  onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null;
  private readonly listeners = new Set<(event: MediaQueryListEvent) => void>();

  constructor(media: string, public matches: boolean) {
    this.media = media;
  }

  addEventListener(_: 'change', listener: (event: MediaQueryListEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_: 'change', listener: (event: MediaQueryListEvent) => void): void {
    this.listeners.delete(listener);
  }

  addListener(listener: (event: MediaQueryListEvent) => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: (event: MediaQueryListEvent) => void): void {
    this.listeners.delete(listener);
  }

  dispatchEvent(): boolean {
    return true;
  }

  setMatches(matches: boolean): void {
    this.matches = matches;
    const event = { matches, media: this.media } as MediaQueryListEvent;
    this.listeners.forEach((listener) => listener(event));
    this.onchange?.call(this as unknown as MediaQueryList, event);
  }

  asMediaQueryList(): MediaQueryList {
    return this as unknown as MediaQueryList;
  }
}

interface MotionEnvironment {
  coarse?: boolean;
  cores?: number;
  fine?: boolean;
  hover?: boolean;
  mobile?: boolean;
  reduced?: boolean;
}

describe('MotionService', () => {
  let reducedQuery: MediaQueryListStub;
  let visibilityState: DocumentVisibilityState;

  function createService({
    coarse = false,
    cores = 8,
    fine = true,
    hover = true,
    mobile = false,
    reduced = false
  }: MotionEnvironment = {}): MotionService {
    reducedQuery = new MediaQueryListStub('(prefers-reduced-motion: reduce)', reduced);
    const mobileQuery = new MediaQueryListStub('(max-width: 760px), (pointer: coarse)', mobile);
    const fineQuery = new MediaQueryListStub('(pointer: fine)', fine);
    const hoverQuery = new MediaQueryListStub('(hover: hover)', hover);
    const coarseQuery = new MediaQueryListStub('(pointer: coarse)', coarse);

    spyOn(window, 'matchMedia').and.callFake((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return reducedQuery.asMediaQueryList();
      }
      if (query === '(max-width: 760px), (pointer: coarse)') {
        return mobileQuery.asMediaQueryList();
      }
      if (query === '(pointer: fine)') {
        return fineQuery.asMediaQueryList();
      }
      if (query === '(hover: hover)') {
        return hoverQuery.asMediaQueryList();
      }
      if (query === '(pointer: coarse)') {
        return coarseQuery.asMediaQueryList();
      }
      return new MediaQueryListStub(query, false).asMediaQueryList();
    });
    spyOnProperty(navigator, 'hardwareConcurrency', 'get').and.returnValue(cores);

    TestBed.configureTestingModule({});
    return TestBed.inject(MotionService);
  }

  afterEach(() => {
    history.replaceState({}, '', location.pathname);
    TestBed.resetTestingModule();
    document.documentElement.removeAttribute('data-motion-paused');
  });

  beforeEach(() => {
    visibilityState = 'visible';
    spyOnProperty(document, 'visibilityState', 'get').and.callFake(() => visibilityState);
  });

  it('selects high quality for a capable desktop device', () => {
    expect(createService({ cores: 8, mobile: false }).qualityTier()).toBe('high');
  });

  it('selects medium quality for a mobile or coarse-pointer device', () => {
    expect(createService({ cores: 8, mobile: true }).qualityTier()).toBe('medium');
  });

  it('selects static quality for a two-core device', () => {
    expect(createService({ cores: 2, mobile: false }).qualityTier()).toBe('static');
  });

  it('selects static quality when the background fallback query parameter is present', () => {
    history.replaceState({}, '', '?bg=fallback');

    expect(createService({ cores: 8, mobile: false }).qualityTier()).toBe('static');
  });

  it('disables cursor and scene effects when fallback is forced', () => {
    history.replaceState({}, '', '?bg=fallback');

    const service = createService();

    expect(service.forcedFallback()).toBeTrue();
    expect(service.cursorEffectsEnabled()).toBeFalse();
    expect(service.sceneEffectsEnabled()).toBeFalse();
  });

  it('enables cursor effects only for a fine pointer that supports hover', () => {
    expect(createService({ fine: true, hover: true, coarse: false }).cursorEffectsEnabled()).toBeTrue();
  });

  it('pauses motion while the document is hidden and restores it when visible', () => {
    const service = createService();

    visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));

    expect(service.documentVisible()).toBeFalse();
    expect(service.motionEnabled()).toBeFalse();
    expect(document.documentElement.dataset['motionPaused']).toBe('true');

    visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));

    expect(service.documentVisible()).toBeTrue();
    expect(service.motionEnabled()).toBeTrue();
    expect(document.documentElement.dataset['motionPaused']).toBe('false');
  });

  it('removes its visibility listener when destroyed', () => {
    const removeListener = spyOn(document, 'removeEventListener').and.callThrough();
    createService();

    TestBed.resetTestingModule();

    expect(removeListener).toHaveBeenCalledWith('visibilitychange', jasmine.any(Function));
  });

  it('supports a partial browser environment without matchMedia', () => {
    const partialDocument = {
      defaultView: {
        location: { search: '' },
        navigator: { hardwareConcurrency: 8 }
      },
      visibilityState: 'visible',
      documentElement: document.documentElement,
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener')
    } as unknown as Document;
    TestBed.configureTestingModule({
      providers: [
        MotionService,
        { provide: DOCUMENT, useValue: partialDocument }
      ]
    });

    expect(() => TestBed.inject(MotionService)).not.toThrow();
  });

  it('updates reduced motion when the media query changes', () => {
    const service = createService({ reduced: false });

    reducedQuery.setMatches(true);

    expect(service.reducedMotion()).toBeTrue();
  });

  it('exposes a shared GSAP core instance and memoized ScrollTrigger loader', async () => {
    const service = createService();
    const secondInjection = TestBed.inject(MotionService);

    expect(secondInjection.gsap).toBe(service.gsap);
    const firstLoad = service.loadScrollTrigger();
    const secondLoad = service.loadScrollTrigger();
    expect(secondLoad).toBe(firstLoad);
    expect(await firstLoad).toBe(await secondLoad);
  });
});

