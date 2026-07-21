import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type Lenis from 'lenis';
import type { LenisOptions } from 'lenis';
import { MotionService } from './motion.service';
import { LENIS_FACTORY, LenisService } from './lenis.service';

describe('LenisService', () => {
  let documentVisible: ReturnType<typeof signal<boolean>>;
  let motionEnabled: ReturnType<typeof signal<boolean>>;
  let lenis: jasmine.SpyObj<Lenis>;
  let factory: jasmine.Spy<(options: LenisOptions) => Lenis>;
  let unsubscribe: jasmine.Spy;
  let tickerCallback: ((time: number) => void) | undefined;
  let motion: {
    documentVisible: typeof documentVisible;
    motionEnabled: typeof motionEnabled;
    gsap: {
      ticker: {
        add: jasmine.Spy;
        remove: jasmine.Spy;
        lagSmoothing: jasmine.Spy;
      };
    };
    updateScrollTrigger: jasmine.Spy;
  };

  beforeEach(() => {
    documentVisible = signal(true);
    motionEnabled = signal(true);
    unsubscribe = jasmine.createSpy('unsubscribe');
    lenis = jasmine.createSpyObj<Lenis>('Lenis', ['on', 'raf', 'destroy']);
    lenis.on.and.returnValue(unsubscribe);
    factory = jasmine.createSpy('lenisFactory').and.returnValue(lenis);
    motion = {
      documentVisible,
      motionEnabled,
      gsap: {
        ticker: {
          add: jasmine.createSpy('ticker.add').and.callFake((callback: (time: number) => void) => {
            tickerCallback = callback;
          }),
          remove: jasmine.createSpy('ticker.remove'),
          lagSmoothing: jasmine.createSpy('ticker.lagSmoothing')
        }
      },
      updateScrollTrigger: jasmine.createSpy('updateScrollTrigger')
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
    expect(motion.updateScrollTrigger).toHaveBeenCalled();
  });

  it('does not construct Lenis when motion is disabled', () => {
    motionEnabled.set(false);
    const service = TestBed.inject(LenisService);

    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    expect(factory).not.toHaveBeenCalled();
  });

  it('destroys Lenis when motion becomes disabled', () => {
    const service = TestBed.inject(LenisService);
    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    motionEnabled.set(false);
    TestBed.flushEffects();

    expect(unsubscribe).toHaveBeenCalled();
    expect(motion.gsap.ticker.remove).toHaveBeenCalledWith(tickerCallback);
    expect(lenis.destroy).toHaveBeenCalled();
  });

  it('stops Lenis while the document is hidden', () => {
    const service = TestBed.inject(LenisService);
    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    documentVisible.set(false);
    TestBed.flushEffects();

    expect(unsubscribe).toHaveBeenCalled();
    expect(motion.gsap.ticker.remove).toHaveBeenCalledWith(tickerCallback);
    expect(lenis.destroy).toHaveBeenCalled();
  });

  it('restarts only after the document is visible and motion is enabled', () => {
    const service = TestBed.inject(LenisService);
    service.attach(document.createElement('section'), document.createElement('div'));
    TestBed.flushEffects();

    documentVisible.set(false);
    motionEnabled.set(false);
    TestBed.flushEffects();
    factory.calls.reset();

    expect(motion.gsap.ticker.add).toHaveBeenCalledTimes(1);
    expect(motion.gsap.ticker.remove).toHaveBeenCalledTimes(1);

    documentVisible.set(true);
    TestBed.flushEffects();
    expect(factory).not.toHaveBeenCalled();
    expect(motion.gsap.ticker.add).toHaveBeenCalledTimes(1);
    expect(motion.gsap.ticker.remove).toHaveBeenCalledTimes(1);

    motionEnabled.set(true);
    TestBed.flushEffects();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(motion.gsap.ticker.add).toHaveBeenCalledTimes(2);
    expect(motion.gsap.ticker.remove).toHaveBeenCalledTimes(1);
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
