import { signal } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { MotionService } from '../../core/motion/motion.service';
import { BackgroundSceneComponent } from './background-scene.component';
import { BackgroundSceneService } from './background-scene.service';

describe('BackgroundSceneComponent', () => {
  let service: jasmine.SpyObj<BackgroundSceneService>;
  const documentVisible = signal(true);

  beforeEach(() => {
    documentVisible.set(true);
    service = jasmine.createSpyObj('BackgroundSceneService', ['init', 'dispose'], {
      sceneAccent: () => ({
        name: 'phosphor',
        token: '--color-phosphor-particle',
        cssColor: 'oklch(86% 0.26 130)'
      })
    }) as jasmine.SpyObj<BackgroundSceneService>;

    service.init.and.returnValue(new Promise(() => undefined));

    TestBed.configureTestingModule({
      imports: [BackgroundSceneComponent],
      providers: [
        { provide: BackgroundSceneService, useValue: service },
        { provide: MotionService, useValue: { documentVisible } }
      ]
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove('app-boot-ready');
    TestBed.resetTestingModule();
  });

  it('keeps the Three.js lazy import timeout at eight seconds', fakeAsync(() => {
    const fixture = TestBed.createComponent(BackgroundSceneComponent);
    fixture.detectChanges();
    tick();

    expect(service.dispose).not.toHaveBeenCalled();

    tick(7999);
    expect(service.dispose).not.toHaveBeenCalled();

    tick(1);
    expect(service.dispose).toHaveBeenCalled();
    expect(fixture.componentInstance.renderMode()).toBe('fallback');
  }));

  it('passes the requested welcome scene mode to the service', fakeAsync(() => {
    const fixture = TestBed.createComponent(BackgroundSceneComponent);
    fixture.componentRef.setInput('mode', 'welcome');
    fixture.detectChanges();
    tick();

    expect(service.init.calls.mostRecent().args as unknown[]).toEqual([
      jasmine.any(HTMLElement),
      jasmine.any(AbortSignal),
      'welcome'
    ]);
  }));

  it('aborts a pending boot and clears its timeout when destroyed', fakeAsync(() => {
    let resolveBoot!: (mode: 'live') => void;
    service.init.and.returnValue(new Promise((resolve) => {
      resolveBoot = resolve;
    }));
    const fixture = TestBed.createComponent(BackgroundSceneComponent);
    fixture.detectChanges();
    tick();
    const abortSignal = service.init.calls.mostRecent().args[1] as AbortSignal;

    fixture.destroy();

    expect(abortSignal.aborted).toBeTrue();
    expect(service.dispose).toHaveBeenCalledTimes(1);
    tick(8000);
    expect(service.dispose).toHaveBeenCalledTimes(1);

    resolveBoot('live');
    flushMicrotasks();
    expect(fixture.componentInstance.renderMode()).toBe('fallback');
  }));

  it('marks fallback rendering as static and reacts to hidden-document policy', fakeAsync(() => {
    service.init.and.resolveTo('fallback');
    const fixture = TestBed.createComponent(BackgroundSceneComponent);
    fixture.componentRef.setInput('mode', 'welcome');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    const stage = fixture.nativeElement.querySelector('.background-scene') as HTMLElement;

    expect(stage.classList).toContain('is-fallback');
    expect(getComputedStyle(stage, '::after').animationName).toBe('none');

    documentVisible.set(false);
    fixture.detectChanges();
    expect(stage.classList).toContain('is-motion-paused');
  }));
});
