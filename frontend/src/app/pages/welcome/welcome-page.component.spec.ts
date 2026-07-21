import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MotionService } from '../../core/motion/motion.service';
import { AuthService } from '../../core/services/auth.service';
import { BackgroundSceneService } from '../../shared/background/background-scene.service';
import { WelcomePageComponent } from './welcome-page.component';

describe('WelcomePageComponent', () => {
  let fixture: ComponentFixture<WelcomePageComponent>;

  beforeEach(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    TestBed.configureTestingModule({
      imports: [WelcomePageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
        {
          provide: MotionService,
          useValue: {
            motionEnabled: () => false,
            cursorEffectsEnabled: () => false,
            sceneEffectsEnabled: () => false,
            loadScrollTrigger: jasmine.createSpy('loadScrollTrigger'),
            gsap: {
              set: jasmine.createSpy('set'),
              from: jasmine.createSpy('from'),
              to: jasmine.createSpy('to')
            }
          }
        },
        {
          provide: BackgroundSceneService,
          useValue: {
            setSceneAccent: jasmine.createSpy('setSceneAccent'),
            setWelcomeProgress: jasmine.createSpy('setWelcomeProgress')
          }
        }
      ]
    });

    fixture = TestBed.createComponent(WelcomePageComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('keeps the semantic welcome landmarks and CTA routes', () => {
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('nav[aria-label="Main navigation"]')).not.toBeNull();
    expect(native.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('AI drafts. Humans approve.');
    expect(native.querySelector('.wl-ctas a[routerLink="/register"]')?.textContent).toContain('Create account');
    expect(native.querySelector('.wl-ctas a[routerLink="/login"]')?.textContent).toContain('Open workspace');
  });

  it('renders the four scroll narrative beats without depending on animation', () => {
    const beats = Array.from(fixture.nativeElement.querySelectorAll('[data-cinematic-beat]')) as HTMLElement[];

    expect(beats.map((beat) => beat.dataset['cinematicBeat'])).toEqual(['monolith', 'analysis', 'review', 'release']);
    expect(beats[1].textContent).toContain('The system analyzes requirements');
    expect(beats[2].textContent).toContain('review gate');
  });
});
