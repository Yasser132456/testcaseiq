import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionService } from '../../core/motion/motion.service';
import { AuthService } from '../../core/services/auth.service';
import { BackgroundSceneService } from '../../shared/background/background-scene.service';
import { WelcomePageComponent } from './welcome-page.component';

interface Deferred<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('WelcomePageComponent', () => {
  let fixture: ComponentFixture<WelcomePageComponent>;
  let motionEnabled: ReturnType<typeof signal<boolean>>;
  let cursorEffectsEnabled: ReturnType<typeof signal<boolean>>;
  let sceneEffectsEnabled: ReturnType<typeof signal<boolean>>;
  let loadScrollTrigger: jasmine.Spy;
  let createScrollTrigger: jasmine.Spy;
  let gsapSet: jasmine.Spy;
  let killTweensOf: jasmine.Spy;
  let background: {
    setSceneAccent: jasmine.Spy;
    setWelcomeProgress: jasmine.Spy;
  };

  beforeEach(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    motionEnabled = signal(false);
    cursorEffectsEnabled = signal(false);
    sceneEffectsEnabled = signal(false);
    loadScrollTrigger = jasmine.createSpy('loadScrollTrigger');
    createScrollTrigger = jasmine.createSpy('ScrollTrigger.create');
    gsapSet = jasmine.createSpy('set').and.callFake((targets: unknown, vars: { clearProps?: string }) => {
      if (vars.clearProps !== 'opacity,transform' || !Array.isArray(targets)) {
        return;
      }
      targets.forEach((target) => {
        if (target instanceof HTMLElement) {
          target.style.removeProperty('opacity');
          target.style.removeProperty('transform');
        }
      });
    });
    killTweensOf = jasmine.createSpy('killTweensOf');
    background = {
      setSceneAccent: jasmine.createSpy('setSceneAccent'),
      setWelcomeProgress: jasmine.createSpy('setWelcomeProgress')
    };

    TestBed.configureTestingModule({
      imports: [WelcomePageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
        {
          provide: MotionService,
          useValue: {
            motionEnabled,
            cursorEffectsEnabled,
            sceneEffectsEnabled,
            loadScrollTrigger,
            gsap: {
              set: gsapSet,
              from: jasmine.createSpy('from'),
              to: jasmine.createSpy('to'),
              killTweensOf
            }
          }
        },
        { provide: BackgroundSceneService, useValue: background }
      ]
    });

    fixture = TestBed.createComponent(WelcomePageComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
  });

  afterEach(() => TestBed.resetTestingModule());

  function plugin(): typeof import('gsap/ScrollTrigger').ScrollTrigger {
    return { create: createScrollTrigger } as unknown as typeof import('gsap/ScrollTrigger').ScrollTrigger;
  }

  async function flushAsyncPolicy(): Promise<void> {
    TestBed.flushEffects();
    await Promise.resolve();
    await Promise.resolve();
  }

  function narrativeBeats(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-cinematic-beat]')) as HTMLElement[];
  }

  it('keeps the semantic welcome landmarks and CTA routes', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(native.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('AI drafts. Humans approve.');
    expect(native.querySelector('.wl-ctas a[routerLink="/register"]')?.textContent).toContain('Create account');
    expect(native.querySelector('.wl-ctas a[routerLink="/login"]')?.textContent).toContain('Open workspace');
  });

  it('renders the four scroll narrative beats without depending on animation', () => {
    const beats = narrativeBeats();

    expect(beats.map((beat) => beat.dataset['cinematicBeat'])).toEqual(['monolith', 'analysis', 'review', 'release']);
    expect(beats[1].textContent).toContain('The system analyzes requirements');
    expect(beats[2].textContent).toContain('review gate');
  });

  it('retries narrative setup when policy is restored after the import race', async () => {
    const loading = deferred<typeof import('gsap/ScrollTrigger').ScrollTrigger>();
    loadScrollTrigger.and.returnValue(loading.promise);
    createScrollTrigger.and.returnValue({ kill: jasmine.createSpy('kill') } as unknown as ScrollTrigger);

    sceneEffectsEnabled.set(true);
    TestBed.flushEffects();
    sceneEffectsEnabled.set(false);
    TestBed.flushEffects();
    loading.resolve(plugin());
    await flushAsyncPolicy();

    expect(createScrollTrigger).not.toHaveBeenCalled();
    expect(narrativeBeats().every((beat) => beat.classList.contains('is-active'))).toBeTrue();

    sceneEffectsEnabled.set(true);
    await flushAsyncPolicy();

    expect(loadScrollTrigger).toHaveBeenCalledTimes(2);
    expect(createScrollTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not create a narrative when destroyed before the import resolves', async () => {
    const loading = deferred<typeof import('gsap/ScrollTrigger').ScrollTrigger>();
    loadScrollTrigger.and.returnValue(loading.promise);
    sceneEffectsEnabled.set(true);
    TestBed.flushEffects();
    expect(loadScrollTrigger).toHaveBeenCalledTimes(1);

    fixture.destroy();
    loading.resolve(plugin());
    await flushAsyncPolicy();

    expect(createScrollTrigger).not.toHaveBeenCalled();
  });

  it('kills an active narrative during teardown', async () => {
    const kill = jasmine.createSpy('kill');
    createScrollTrigger.and.returnValue({ kill } as unknown as ScrollTrigger);
    loadScrollTrigger.and.resolveTo(plugin());
    sceneEffectsEnabled.set(true);
    await flushAsyncPolicy();

    fixture.destroy();

    expect(kill).toHaveBeenCalledTimes(1);
  });

  it('uses an accessible static narrative when the lazy import rejects', async () => {
    loadScrollTrigger.and.rejectWith(new Error('chunk unavailable'));
    sceneEffectsEnabled.set(true);

    await flushAsyncPolicy();

    expect(loadScrollTrigger).toHaveBeenCalledTimes(1);
    expect(createScrollTrigger).not.toHaveBeenCalled();
    expect(narrativeBeats().every((beat) => beat.classList.contains('is-active'))).toBeTrue();
    expect(background.setWelcomeProgress).toHaveBeenCalledWith(1);
  });

  it('kills and recreates the narrative as scene policy changes', async () => {
    const firstKill = jasmine.createSpy('firstKill');
    const secondKill = jasmine.createSpy('secondKill');
    createScrollTrigger.and.returnValues(
      { kill: firstKill } as unknown as ScrollTrigger,
      { kill: secondKill } as unknown as ScrollTrigger
    );
    loadScrollTrigger.and.resolveTo(plugin());

    sceneEffectsEnabled.set(true);
    await flushAsyncPolicy();
    sceneEffectsEnabled.set(false);
    await flushAsyncPolicy();

    expect(firstKill).toHaveBeenCalledTimes(1);
    expect(narrativeBeats().every((beat) => beat.classList.contains('is-active'))).toBeTrue();

    sceneEffectsEnabled.set(true);
    await flushAsyncPolicy();

    expect(createScrollTrigger).toHaveBeenCalledTimes(2);
  });

  it('clears live beat tweens and inline presentation styles in static mode', async () => {
    createScrollTrigger.and.returnValue({ kill: jasmine.createSpy('kill') } as unknown as ScrollTrigger);
    loadScrollTrigger.and.resolveTo(plugin());
    sceneEffectsEnabled.set(true);
    await flushAsyncPolicy();
    const beats = narrativeBeats();
    beats.forEach((beat) => {
      beat.style.opacity = '0.25';
      beat.style.transform = 'translate3d(0px, 18px, 0px)';
    });

    sceneEffectsEnabled.set(false);
    TestBed.flushEffects();

    expect(killTweensOf).toHaveBeenCalledWith(beats);
    expect(gsapSet).toHaveBeenCalledWith(beats, { clearProps: 'opacity,transform' });
    expect(beats.every((beat) => beat.style.opacity === '' && beat.style.transform === '')).toBeTrue();
  });

  it('removes and rebinds magnetic listeners as cursor policy changes', () => {
    const button = fixture.nativeElement.querySelector('.wl-magnetic') as HTMLElement;
    const addListener = spyOn(button, 'addEventListener').and.callThrough();
    const removeListener = spyOn(button, 'removeEventListener').and.callThrough();

    cursorEffectsEnabled.set(true);
    TestBed.flushEffects();
    expect(addListener).toHaveBeenCalledWith('pointermove', jasmine.any(Function), { passive: true });

    cursorEffectsEnabled.set(false);
    TestBed.flushEffects();
    expect(removeListener).toHaveBeenCalledWith('pointermove', jasmine.any(Function));

    cursorEffectsEnabled.set(true);
    TestBed.flushEffects();
    expect(addListener.calls.allArgs().filter(([type]) => type === 'pointermove').length).toBe(2);
  });
});
