import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type Lenis from 'lenis';
import type { LenisOptions } from 'lenis';
import { MotionQualityTier, MotionService } from './motion.service';
import { LENIS_FACTORY, LenisService } from './lenis.service';

describe('LenisService', () => {
  let reducedMotion: ReturnType<typeof signal<boolean>>;
  let qualityTier: ReturnType<typeof signal<MotionQualityTier>>;
  let lenis: jasmine.SpyObj<Lenis>;
  let factory: jasmine.Spy<(options: LenisOptions) => Lenis>;
  let unsubscribe: jasmine.Spy;
  let tickerCallback: ((time: number) => void) | undefined;
  let motion: {
    reducedMotion: typeof reducedMotion;
    qualityTier: typeof qualityTier;
    gsap: {
      ticker: {
        add: jasmine.Spy;
        remove: jasmine.Spy;
        lagSmoothing: jasmine.Spy;
      };
    };
    ScrollTrigger: { update: jasmine.Spy };
  };

  beforeEach(() => {
    reducedMotion = signal(false);
    qualityTier = signal<MotionQualityTier>('high');
    unsubscribe = jasmine.createSpy('unsubscribe');
    lenis = jasmine.createSpyObj<Lenis>('Lenis', ['on', 'raf', 'destroy']);
    lenis.on.and.returnValue(unsubscribe);
    factory = jasmine.createSpy('lenisFactory').and.returnValue(lenis);
    motion = {
      reducedMotion,
      qualityTier,
      gsap: {
        ticker: {
          add: jasmine.createSpy('ticker.add').and.callFake((callback: (time: number) => void) => {
            tickerCallback = callback;
          }),
          remove: jasmine.createSpy('ticker.remove'),
          lagSmoothing: jasmine.createSpy('ticker.lagSmoothing')
        }
      },
      ScrollTrigger: { update: jasmine.createSpy('ScrollTrigger.update') }
    };

    TestBed.configureTestingModule({
      providers: [
        LenisService,
        { provide: MotionService, useValue: motion },
        { provide: LENIS_FACTORY, useValue: factory }
      ]
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('attaches Lenis to the supplied wrapper and content', () => {
    const wrapper = document.createElement('section');
    const content = document.createElement('div');
    const service = TestBed.inject(LenisService);

    service.attach(wrapper, content);
    TestBed.flushEffects();

    expect(factory).toHaveBeenCalledWith(jasmine.objectContaining({
      wrapper,
      content,
      autoRaf: false,
      anchors: true,
      allowNestedScroll: true
    }));
    expect(lenis.on as jasmine.Spy).toHaveBeenCalledWith('scroll', jasmine.any(Function));
    expect(motion.gsap.ticker.add).toHaveBeenCalled();
    expect(motion.gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0);

    tickerCallback?.(1.25);
    expect(lenis.raf).toHaveBeenCalledWith(1250);
  });

  it('exposes the current Lenis scroll velocity as a signal', () => {
    let scrollCallback: ((event: { velocity: number }) => void) | undefined;
    lenis.on.and.callFake(((_: string, callback: (event: { velocity: number }) => void) => {
      scrollCallback = callback;
      return unsubscribe;
    }) as unknown as typeof lenis.on);

    const service = TestBed.inject(LenisService);
    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    scrollCallback?.({ velocity: 3.2 });

    expect(service.scrollVelocity()).toBe(3.2);
    expect(motion.ScrollTrigger.update).toHaveBeenCalled();
  });

  it('does not construct Lenis for the static quality tier', () => {
    qualityTier.set('static');
    const service = TestBed.inject(LenisService);

    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    expect(factory).not.toHaveBeenCalled();
  });

  it('destroys Lenis when reduced motion becomes active', () => {
    const service = TestBed.inject(LenisService);
    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    reducedMotion.set(true);
    TestBed.flushEffects();

    expect(unsubscribe).toHaveBeenCalled();
    expect(motion.gsap.ticker.remove).toHaveBeenCalledWith(tickerCallback);
    expect(lenis.destroy).toHaveBeenCalled();
  });

  it('cleans up synchronization when detached', () => {
    const service = TestBed.inject(LenisService);
    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    service.detach();

    expect(unsubscribe).toHaveBeenCalled();
    expect(motion.gsap.ticker.remove).toHaveBeenCalledWith(tickerCallback);
    expect(lenis.destroy).toHaveBeenCalled();
  });
});
