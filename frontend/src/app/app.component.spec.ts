import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { AppComponent, usesWelcomeBackground } from './app.component';
import { BackgroundSceneComponent } from './shared/background/background-scene.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({ standalone: true, template: '' })
class RouteStubComponent {}

@Component({
  selector: 'app-background-scene',
  standalone: true,
  template: '<div data-testid="shared-background-stub"></div>'
})
class BackgroundSceneStubComponent {}

@Component({ selector: 'app-toast-container', standalone: true, template: '' })
class ToastContainerStubComponent {}

describe('AppComponent welcome background gate', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: '', component: RouteStubComponent },
          { path: 'login', component: RouteStubComponent }
        ]),
        { provide: AuthService, useValue: { loadCurrentUser: () => of(null) } }
      ]
    });
    TestBed.overrideComponent(AppComponent, {
      remove: { imports: [BackgroundSceneComponent, ToastContainerComponent] },
      add: { imports: [BackgroundSceneStubComponent, ToastContainerStubComponent] }
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('recognizes only the normalized root URL as the welcome background route', () => {
    expect(usesWelcomeBackground('/')).toBeTrue();
    expect(usesWelcomeBackground('/?bg=fallback')).toBeTrue();
    expect(usesWelcomeBackground('/#workflow')).toBeTrue();
    expect(usesWelcomeBackground('/login')).toBeFalse();
  });

  it('does not mount the shared scene on welcome and restores it on other routes', async () => {
    fixture = TestBed.createComponent(AppComponent);
    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-background-scene')).toBeNull();

    await router.navigateByUrl('/login');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="shared-background-stub"]')).not.toBeNull();
  });
});
