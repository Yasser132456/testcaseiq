import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MotionService } from '../../core/motion/motion.service';
import { WelcomeReviewGateComponent } from './welcome-review-gate.component';

describe('WelcomeReviewGateComponent', () => {
  let fixture: ComponentFixture<WelcomeReviewGateComponent>;
  let component: WelcomeReviewGateComponent;
  let motionEnabled: ReturnType<typeof signal<boolean>>;
  let reducedMotion: ReturnType<typeof signal<boolean>>;
  let documentVisible: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    motionEnabled = signal(true);
    reducedMotion = signal(false);
    documentVisible = signal(true);

    TestBed.configureTestingModule({
      imports: [WelcomeReviewGateComponent],
      providers: [
        {
          provide: MotionService,
          useValue: { motionEnabled, reducedMotion, documentVisible }
        }
      ]
    });

  });

  afterEach(() => TestBed.resetTestingModule());

  function createComponent(): void {
    fixture = TestBed.createComponent(WelcomeReviewGateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.flushEffects();
  }

  it('cycles only while motion is enabled and the document is visible', fakeAsync(() => {
    createComponent();
    expect(component.state()).toBe('intake');

    tick(2200);
    expect(component.state()).toBe('analyzing');

    documentVisible.set(false);
    fixture.detectChanges();
    TestBed.flushEffects();
    tick(4400);
    expect(component.state()).toBe('analyzing');

    documentVisible.set(true);
    fixture.detectChanges();
    TestBed.flushEffects();
    tick(2200);
    expect(component.state()).toBe('drafting');

    motionEnabled.set(false);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.state()).toBe('approved');
    tick(4400);
    expect(component.state()).toBe('approved');
  }));

  it('settles on approved without cycling under reduced motion', fakeAsync(() => {
    reducedMotion.set(true);
    motionEnabled.set(false);
    createComponent();

    expect(component.state()).toBe('approved');
    tick(8800);
    expect(component.state()).toBe('approved');
  }));

  it('keeps the animated panel decorative and exposes one static assistive label', fakeAsync(() => {
    createComponent();
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelector('.wl-instrument-panel')?.getAttribute('aria-hidden')).toBe('true');
    expect(native.querySelector('.sr-only')?.textContent?.trim()).toBe('Review gate active — approved for export');
  }));

  it('maps analyzing and drafting states to the shared AI-state vocabulary', fakeAsync(() => {
    createComponent();

    tick(2200);
    fixture.detectChanges();
    let panel = fixture.nativeElement.querySelector('.wl-instrument-panel') as HTMLElement;
    expect(panel.dataset['state']).toBe('analyzing');
    expect(panel.dataset['aiState']).toBe('analysis');
    expect(panel.classList).toContain('is-analyzing');

    tick(2200);
    fixture.detectChanges();
    panel = fixture.nativeElement.querySelector('.wl-instrument-panel') as HTMLElement;
    expect(panel.dataset['state']).toBe('drafting');
    expect(panel.dataset['aiState']).toBe('generation');
    expect(panel.classList).toContain('is-generating');
  }));

  it('keeps every story stage mounted so cycling cannot change panel structure', fakeAsync(() => {
    createComponent();
    const native = fixture.nativeElement as HTMLElement;

    expect(native.querySelectorAll('.wl-chip')).toHaveSize(3);
    expect(native.querySelectorAll('.wl-bdd-row')).toHaveSize(3);
    expect(native.querySelector('.wl-story-block')?.textContent).toContain('failed payments');
    expect(native.querySelector('.wl-decision-row')?.textContent).toContain('Approved for export');

    tick(6600);
    fixture.detectChanges();
    expect(native.querySelectorAll('.wl-chip')).toHaveSize(3);
    expect(native.querySelectorAll('.wl-bdd-row')).toHaveSize(3);
  }));
});
