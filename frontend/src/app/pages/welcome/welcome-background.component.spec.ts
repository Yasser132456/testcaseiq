import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MotionQualityTier, MotionService } from '../../core/motion/motion.service';
import { WelcomeBackgroundComponent } from './welcome-background.component';

class ResizeObserverStub implements ResizeObserver {
  static instances: ResizeObserverStub[] = [];

  readonly disconnect = jasmine.createSpy('disconnect');
  readonly observe = jasmine.createSpy('observe');
  readonly unobserve = jasmine.createSpy('unobserve');

  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }
}

describe('WelcomeBackgroundComponent', () => {
  let fixture: ComponentFixture<WelcomeBackgroundComponent>;
  let qualityTier: ReturnType<typeof signal<MotionQualityTier>>;
  let motionEnabled: ReturnType<typeof signal<boolean>>;
  let cursorEffectsEnabled: ReturnType<typeof signal<boolean>>;
  let documentVisible: ReturnType<typeof signal<boolean>>;
  let reducedMotion: ReturnType<typeof signal<boolean>>;
  let forcedFallback: ReturnType<typeof signal<boolean>>;
  let originalResizeObserver: typeof ResizeObserver;

  function configure({
    cursor = false,
    tier = 'static'
  }: {
    cursor?: boolean;
    tier?: MotionQualityTier;
  } = {}): void {
    qualityTier = signal(tier);
    motionEnabled = signal(tier === 'high');
    cursorEffectsEnabled = signal(cursor);
    documentVisible = signal(true);
    reducedMotion = signal(false);
    forcedFallback = signal(false);

    TestBed.configureTestingModule({
      imports: [WelcomeBackgroundComponent],
      providers: [{
        provide: MotionService,
        useValue: {
          qualityTier,
          motionEnabled,
          cursorEffectsEnabled,
          documentVisible,
          reducedMotion,
          forcedFallback
        }
      }]
    });
  }

  async function render(): Promise<HTMLCanvasElement> {
    fixture = TestBed.createComponent(WelcomeBackgroundComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
  }

  beforeEach(() => {
    originalResizeObserver = window.ResizeObserver;
    ResizeObserverStub.instances = [];
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub
    });
  });

  afterEach(() => {
    fixture?.destroy();
    document.documentElement.classList.remove('app-boot-ready');
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: originalResizeObserver
    });
    TestBed.resetTestingModule();
  });

  it('matches the viewport in both CSS pixels and its DPR drawing buffer', async () => {
    configure();
    let viewportWidth = 900;
    let viewportHeight = 700;
    let dpr = 2;
    spyOnProperty(window, 'innerWidth', 'get').and.callFake(() => viewportWidth);
    spyOnProperty(window, 'innerHeight', 'get').and.callFake(() => viewportHeight);
    spyOnProperty(window, 'devicePixelRatio', 'get').and.callFake(() => dpr);
    spyOnProperty(document.documentElement, 'clientWidth', 'get').and.returnValue(viewportWidth - 10);

    const canvas = await render();
    expect(canvas.width).toBe(1_800);
    expect(canvas.height).toBe(1_400);
    expect(canvas.style.width).toBe(`${viewportWidth}px`);
    expect(canvas.style.height).toBe(`${viewportHeight}px`);
    const observer = ResizeObserverStub.instances[0];
    expect(observer.observe).toHaveBeenCalledWith(document.documentElement);

    viewportWidth = 1_200;
    viewportHeight = 800;
    dpr = 1.5;
    observer.callback([], observer);

    expect(canvas.width).toBe(1_800);
    expect(canvas.height).toBe(1_200);
    expect(canvas.style.width).toBe('1200px');
    expect(canvas.style.height).toBe('800px');
  });

  it('draws the static tier without scheduling an animation frame', async () => {
    const requestFrame = spyOn(window, 'requestAnimationFrame').and.returnValue(41);
    configure({ tier: 'static' });

    await render();

    expect(requestFrame).not.toHaveBeenCalled();
  });

  it('releases the app boot overlay after drawing its first frame', async () => {
    configure({ tier: 'static' });

    await render();

    expect(document.documentElement.classList).toContain('app-boot-ready');
  });

  it('schedules animation only for a visible high tier', async () => {
    const requestFrame = spyOn(window, 'requestAnimationFrame').and.returnValue(42);
    const cancelFrame = spyOn(window, 'cancelAnimationFrame');
    configure({ tier: 'high' });

    await render();
    expect(requestFrame).toHaveBeenCalledTimes(1);

    documentVisible.set(false);
    TestBed.flushEffects();

    expect(cancelFrame).toHaveBeenCalledWith(42);
  });

  it('attaches pointer listeners only while cursor effects are enabled', async () => {
    const addListener = spyOn(document, 'addEventListener').and.callThrough();
    const removeListener = spyOn(document, 'removeEventListener').and.callThrough();
    spyOn(window, 'requestAnimationFrame').and.returnValue(43);
    configure({ cursor: true, tier: 'high' });

    await render();
    expect(addListener).toHaveBeenCalledWith('pointermove', jasmine.any(Function), { passive: true });

    cursorEffectsEnabled.set(false);
    TestBed.flushEffects();

    expect(removeListener).toHaveBeenCalledWith('pointermove', jasmine.any(Function));
  });

  it('disconnects resize observation and cancels animation on destroy', async () => {
    const cancelFrame = spyOn(window, 'cancelAnimationFrame');
    const removeListener = spyOn(window, 'removeEventListener').and.callThrough();
    spyOn(window, 'requestAnimationFrame').and.returnValue(44);
    configure({ tier: 'high' });

    await render();
    const observer = ResizeObserverStub.instances[0];

    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(cancelFrame).toHaveBeenCalledWith(44);
    expect(removeListener).toHaveBeenCalledWith('resize', jasmine.any(Function));
  });
});
