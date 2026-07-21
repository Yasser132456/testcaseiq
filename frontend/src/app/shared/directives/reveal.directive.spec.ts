import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MotionService } from '../../core/motion/motion.service';
import { RevealDirective } from './reveal.directive';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: '<div class="target" [tcqReveal]="delay" [tcqRevealActive]="active()">Visible content</div>'
})
class RevealHostComponent {
  delay = 0.15;
  active = signal(true);
}

describe('RevealDirective', () => {
  let fixture: ComponentFixture<RevealHostComponent>;
  let reducedMotion: ReturnType<typeof signal<boolean>>;
  let observerCallback: IntersectionObserverCallback | undefined;
  let observer: {
    observe: jasmine.Spy;
    disconnect: jasmine.Spy;
    unobserve: jasmine.Spy;
    takeRecords: jasmine.Spy;
    root: null;
    rootMargin: string;
    thresholds: number[];
  };
  let originalIntersectionObserver: typeof IntersectionObserver;
  let observerCreations: number;
  let gsap: {
    set: jasmine.Spy;
    to: jasmine.Spy;
  };

  beforeEach(() => {
    reducedMotion = signal(false);
    observer = {
      observe: jasmine.createSpy('observe'),
      disconnect: jasmine.createSpy('disconnect'),
      unobserve: jasmine.createSpy('unobserve'),
      takeRecords: jasmine.createSpy('takeRecords').and.returnValue([]),
      root: null,
      rootMargin: '0px',
      thresholds: [0]
    };
    originalIntersectionObserver = window.IntersectionObserver;
    observerCreations = 0;
    const observerResult = observer;
    class IntersectionObserverFake {
      constructor(callback: IntersectionObserverCallback) {
        observerCreations += 1;
        observerCallback = callback;
        return observerResult as unknown as IntersectionObserver;
      }
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: IntersectionObserverFake
    });

    gsap = {
      set: jasmine.createSpy('gsap.set').and.callFake((target: HTMLElement) => {
        target.style.opacity = '0';
        target.style.transform = 'translate(0px, 12px)';
      }),
      to: jasmine.createSpy('gsap.to').and.callFake((target: HTMLElement, vars: {
        onComplete?: () => void;
      }) => {
        target.style.opacity = '1';
        target.style.transform = 'translate(0px, 0px)';
        vars.onComplete?.();
        return { kill: jasmine.createSpy('kill') };
      })
    };

    TestBed.configureTestingModule({
      imports: [RevealHostComponent],
      providers: [{
        provide: MotionService,
        useValue: { reducedMotion, gsap }
      }]
    });

    fixture = TestBed.createComponent(RevealHostComponent);
  });

  afterEach(() => {
    fixture.destroy();
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: originalIntersectionObserver
    });
    TestBed.resetTestingModule();
  });

  it('keeps content visible before directive initialization', () => {
    const target = fixture.nativeElement.querySelector('.target') as HTMLElement;

    expect(target.style.opacity).toBe('');
    expect(target.style.transform).toBe('');
  });

  it('applies no opacity or transform when reduced motion is enabled', () => {
    reducedMotion.set(true);

    fixture.detectChanges();
    const target = fixture.nativeElement.querySelector('.target') as HTMLElement;

    expect(target.style.opacity).toBe('');
    expect(target.style.transform).toBe('');
    expect(observerCreations).toBe(0);
  });

  it('does not prepare or observe content when the reveal is inactive', () => {
    fixture.componentInstance.active.set(false);

    fixture.detectChanges();
    const target = fixture.nativeElement.querySelector('.target') as HTMLElement;

    expect(target.style.opacity).toBe('');
    expect(target.style.transform).toBe('');
    expect(observerCreations).toBe(0);
  });

  it('hides only after initialization and reveals on first intersection', () => {
    fixture.detectChanges();
    const target = fixture.nativeElement.querySelector('.target') as HTMLElement;

    expect(target.style.opacity).toBe('0');
    expect(target.style.transform).toContain('12px');
    expect(observer.observe).toHaveBeenCalledOnceWith(target);

    observerCallback?.([
      { isIntersecting: true, target } as unknown as IntersectionObserverEntry
    ], observer as unknown as IntersectionObserver);

    expect(gsap.to).toHaveBeenCalledWith(target, jasmine.objectContaining({
      opacity: 1,
      y: 0,
      duration: 0.32,
      delay: 0.15,
      ease: 'expo.out'
    }));
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('does not hide content when IntersectionObserver is unavailable', () => {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: undefined
    });

    fixture.detectChanges();
    const target = fixture.nativeElement.querySelector('.target') as HTMLElement;

    expect(target.style.opacity).toBe('');
    expect(target.style.transform).toBe('');
  });
});
