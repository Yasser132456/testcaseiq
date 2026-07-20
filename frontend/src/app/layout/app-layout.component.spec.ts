import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { LenisService } from '../core/motion/lenis.service';
import { AppLayoutComponent } from './app-layout.component';

describe('AppLayoutComponent mobile navigation', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let router: Router;
  let http: HttpTestingController;
  let lenisService: jasmine.SpyObj<LenisService>;

  beforeEach(async () => {
    const notificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['getUnreadCount'],
      { unreadCount: signal(0) }
    );
    notificationService.getUnreadCount.and.returnValue(of({ count: 0 }));
    lenisService = jasmine.createSpyObj<LenisService>('LenisService', ['attach', 'detach']);

    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([
          { path: 'dashboard', component: DummyRouteComponent },
          { path: 'projects', component: DummyRouteComponent }
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              displayName: 'Ada Lovelace',
              email: 'ada@example.com',
              role: 'ADMIN'
            }),
            hasRole: (role: string | string[]) => Array.isArray(role) ? role.includes('ADMIN') : role === 'ADMIN',
            logout: jasmine.createSpy('logout')
          }
        },
        { provide: NotificationService, useValue: notificationService },
        { provide: LenisService, useValue: lenisService }
      ]
    }).compileComponents();

    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true
    } as MediaQueryList);

    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();
    http.expectOne('/api/dashboard/metrics').flush({ pendingReviewTestCases: 2 });
  });

  afterEach(() => {
    http.verify();
  });

  it('opens a mobile nav panel from the hamburger button', () => {
    const button = fixture.nativeElement.querySelector('.mobile-nav-btn') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.mobileNavOpen()).toBeTrue();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.mobile-nav-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-nav-panel')?.textContent).toContain('Dashboard');
  });

  it('attaches smooth scrolling to the workspace and detaches on destroy', () => {
    const wrapper = fixture.nativeElement.querySelector('.workspace') as HTMLElement;
    const content = fixture.nativeElement.querySelector('.workspace-content') as HTMLElement;

    expect(lenisService.attach).toHaveBeenCalledOnceWith(wrapper, content);

    fixture.destroy();

    expect(lenisService.detach).toHaveBeenCalled();
  });

  it('closes the mobile nav on backdrop click and restores focus to the hamburger', async () => {
    const button = fixture.nativeElement.querySelector('.mobile-nav-btn') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.mobile-nav-backdrop') as HTMLElement).click();
    fixture.detectChanges();
    await Promise.resolve();

    expect(fixture.componentInstance.mobileNavOpen()).toBeFalse();
    expect(document.activeElement).toBe(button);
  });

  it('closes the mobile nav on Escape', () => {
    fixture.componentInstance.openMobileNav();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.mobileNavOpen()).toBeFalse();
  });

  it('closes the mobile nav after route navigation', async () => {
    fixture.componentInstance.openMobileNav();
    fixture.detectChanges();

    await router.navigateByUrl('/projects');
    fixture.detectChanges();

    expect(fixture.componentInstance.mobileNavOpen()).toBeFalse();
  });
});

@Component({
  standalone: true,
  template: ''
})
class DummyRouteComponent {}
