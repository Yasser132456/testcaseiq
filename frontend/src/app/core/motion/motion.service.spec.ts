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
  cores?: number;
  mobile?: boolean;
  reduced?: boolean;
}

describe('MotionService', () => {
  let reducedQuery: MediaQueryListStub;

  function createService({
    cores = 8,
    mobile = false,
    reduced = false
  }: MotionEnvironment = {}): MotionService {
    reducedQuery = new MediaQueryListStub('(prefers-reduced-motion: reduce)', reduced);
    const mobileQuery = new MediaQueryListStub('(max-width: 760px), (pointer: coarse)', mobile);

    spyOn(window, 'matchMedia').and.callFake((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return reducedQuery.asMediaQueryList();
      }
      if (query === '(max-width: 760px), (pointer: coarse)') {
        return mobileQuery.asMediaQueryList();
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

  it('updates reduced motion when the media query changes', () => {
    const service = createService({ reduced: false });

    reducedQuery.setMatches(true);

    expect(service.reducedMotion()).toBeTrue();
  });

  it('exposes shared GSAP and ScrollTrigger instances', () => {
    const service = createService();
    const secondInjection = TestBed.inject(MotionService);

    expect(secondInjection.gsap).toBe(service.gsap);
    expect(secondInjection.ScrollTrigger).toBe(service.ScrollTrigger);
  });
});

