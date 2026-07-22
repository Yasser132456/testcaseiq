import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MotionService } from '../../core/motion/motion.service';
import { AuthService } from '../../core/services/auth.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { WelcomePageComponent } from './welcome-page.component';

describe('WelcomePageComponent', () => {
  let fixture: ComponentFixture<WelcomePageComponent>;
  let cursorEffectsEnabled: ReturnType<typeof signal<boolean>>;
  let motionEnabled: ReturnType<typeof signal<boolean>>;
  let gsapSet: jasmine.Spy;
  let gsapTimeline: jasmine.Spy;
  let timelineTo: jasmine.Spy;

  beforeEach(() => {
    cursorEffectsEnabled = signal(false);
    motionEnabled = signal(false);
    gsapSet = jasmine.createSpy('set');
    timelineTo = jasmine.createSpy('to');
    const timeline = { to: timelineTo };
    timelineTo.and.returnValue(timeline);
    gsapTimeline = jasmine.createSpy('timeline').and.returnValue(timeline);

    TestBed.configureTestingModule({
      imports: [WelcomePageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
        {
          provide: MotionService,
          useValue: {
            qualityTier: signal('static' as const),
            motionEnabled,
            cursorEffectsEnabled,
            documentVisible: signal(true),
            reducedMotion: signal(false),
            forcedFallback: signal(false),
            sceneEffectsEnabled: signal(false),
            gsap: {
              from: jasmine.createSpy('from'),
              set: gsapSet,
              timeline: gsapTimeline
            }
          }
        }
      ]
    });

    fixture = TestBed.createComponent(WelcomePageComponent);
    fixture.detectChanges();
    TestBed.flushEffects();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders the static welcome landmarks and CTA routes', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(native.querySelectorAll('h1')).toHaveSize(1);
    expect(native.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('AI drafts. Humans approve.');
    expect(native.querySelector('.wl-ctas a[routerLink="/register"]')?.textContent).toContain('Create account');
    expect(native.querySelector('.wl-ctas a[routerLink="/login"]')?.textContent).toContain('Open workspace');
    expect(native.querySelector('[data-cinematic-beat]')).toBeNull();
    expect(native.querySelector('.wl-cinema')).toBeNull();
    expect(native.querySelector('app-welcome-background canvas')).not.toBeNull();
    expect(native.querySelector('app-background-scene')).toBeNull();
  });

  it('renders workflow and formats as labelled regions', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('section[aria-labelledby="workflow-title"]')?.textContent).toContain('01');
    expect(native.querySelector('section[aria-labelledby="formats-title"]')?.textContent).toContain('One suite, several exits.');
  });

  it('leaves hero content untouched when motion is disabled', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(gsapSet).not.toHaveBeenCalledWith(
      jasmine.anything(),
      jasmine.objectContaining({ clipPath: 'inset(0 0 100% 0)' })
    );
    expect(gsapTimeline).not.toHaveBeenCalled();
    expect(native.querySelector('.wl-headline')?.textContent).toContain('Humans approve.');
    expect(native.querySelector('.wl-sub')?.getAttribute('style')).toBeNull();
  });

  it('hides content only when the enabled hero timeline starts', () => {
    motionEnabled.set(true);
    gsapSet.calls.reset();
    gsapTimeline.calls.reset();
    timelineTo.calls.reset();

    (fixture.componentInstance as unknown as { runEntrance(): void }).runEntrance();

    expect(gsapSet).toHaveBeenCalledTimes(2);
    expect(gsapSet.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({
      y: '110%',
      clipPath: 'inset(0 0 100% 0)'
    }));
    expect(gsapSet.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ opacity: 0, y: 12 }));
    expect(gsapTimeline).toHaveBeenCalled();
    expect(timelineTo.calls.argsFor(0)[1]).toEqual(jasmine.objectContaining({
      y: '0%',
      clipPath: 'inset(0 0 0% 0)',
      ease: 'power4.out',
      stagger: 0.06
    }));
    expect(timelineTo.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({
      opacity: 1,
      y: 0,
      stagger: 0.05
    }));
  });

  it('uses the extracted review gate and reveals only the two below-fold groups', () => {
    const native = fixture.nativeElement as HTMLElement;
    const reveals = fixture.debugElement.queryAll(By.directive(RevealDirective));

    expect(native.querySelectorAll('app-welcome-review-gate')).toHaveSize(1);
    expect(native.querySelector('.wl-hero [tcqReveal]')).toBeNull();
    expect(reveals).toHaveSize(9);

    const workflowDelays = reveals
      .filter((item) => item.nativeElement.classList.contains('wl-flow-card'))
      .map((item) => item.injector.get(RevealDirective).tcqReveal);
    const formatDelays = reveals
      .filter((item) => item.nativeElement.classList.contains('wl-format'))
      .map((item) => item.injector.get(RevealDirective).tcqReveal);

    expect(workflowDelays).toEqual([0, 0.04, 0.08, 0.12]);
    expect(formatDelays).toEqual([0, 0.04, 0.08, 0.12, 0.16]);
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
  });
});
