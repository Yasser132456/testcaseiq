import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MotionService } from '../../core/motion/motion.service';
import { AuthService } from '../../core/services/auth.service';
import { WelcomePageComponent } from './welcome-page.component';

describe('WelcomePageComponent', () => {
  let fixture: ComponentFixture<WelcomePageComponent>;
  let cursorEffectsEnabled: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    cursorEffectsEnabled = signal(false);

    TestBed.configureTestingModule({
      imports: [WelcomePageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
        {
          provide: MotionService,
          useValue: {
            qualityTier: signal('static' as const),
            motionEnabled: signal(false),
            cursorEffectsEnabled,
            documentVisible: signal(true),
            reducedMotion: signal(false),
            forcedFallback: signal(false),
            sceneEffectsEnabled: signal(false),
            gsap: {
              from: jasmine.createSpy('from'),
              set: jasmine.createSpy('set')
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
