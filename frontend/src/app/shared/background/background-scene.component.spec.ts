import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BackgroundSceneComponent } from './background-scene.component';
import { BackgroundSceneService } from './background-scene.service';

describe('BackgroundSceneComponent', () => {
  let service: jasmine.SpyObj<BackgroundSceneService>;

  beforeEach(() => {
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
        { provide: BackgroundSceneService, useValue: service }
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
});
