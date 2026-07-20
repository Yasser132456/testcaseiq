import {
  AfterViewInit, Component, EffectRef, ElementRef, HostListener, Injector, OnDestroy, Signal, ViewChild, effect, inject, signal
} from '@angular/core';
import {
  ActivatedRoute, NavigationEnd, Router,
  RouterLink, RouterLinkActive, RouterOutlet
} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { catchError, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import { gsap } from 'gsap';
import {
  LucideDynamicIcon,
  LucideLayoutDashboard, LucideFolderKanban, LucideClipboardList, LucideCheckSquare2,
  LucideDownload, LucideShieldCheck, LucideUsers, LucideSettings2, LucideChevronLeft, LucideChevronRight,
  LucideBookOpenText, LucideSearch, LucideMenu, LucideX
} from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { NotificationCenterComponent } from '../shared/notification-center/notification-center.component';
import { SearchModalComponent } from '../shared/search-modal/search-modal.component';
import { KeyboardShortcutsComponent } from '../shared/components/keyboard-shortcuts.component';
import { LenisService } from '../core/motion/lenis.service';

interface Crumb { label: string; path: string; }
interface ProjectContext { projectId: string; name: string; storyCount: number; coveragePercent: number; }
interface ProjectContextSource { projectContext: Signal<ProjectContext | null>; }
interface PageTitleSource { pageTitle: Signal<string>; }

const PROJECT_CONTEXT_STORAGE_KEY = 'tciq_project_ctx';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideDynamicIcon, NotificationCenterComponent, SearchModalComponent, KeyboardShortcutsComponent],
  styleUrl: './app-layout.component.css',
  template: `
    <div class="layout-shell">

      <aside #sidebarEl class="sidebar glass-surface glass-surface--1 glass-surface--flat">
        <a class="brand" routerLink="/">
          <span class="brand-mark">TQ</span>
          <span class="brand-text">
            <strong>TestCaseIQ</strong>
            <small>QA workspace</small>
          </span>
        </a>

        <button class="collapse-btn" type="button"
                (click)="toggleCollapse()"
                [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <svg [lucideIcon]="collapsed() ? LucideChevronRight : LucideChevronLeft"
                          [size]="14" [strokeWidth]="2" aria-hidden="true"></svg>
        </button>

        @if (projectContext() && !collapsed()) {
          <div class="project-context-panel glass-surface glass-surface--2 glass-surface--flat">
            <a routerLink="/projects">← Projects</a>
            <strong>{{ projectContext()?.name }}</strong>
            <span>{{ projectContext()?.storyCount }} stories · {{ projectContext()?.coveragePercent }}%</span>
          </div>
        }

        <nav class="nav-groups" aria-label="Primary navigation">
          <div class="nav-group">
            <span class="nav-group-label">HOME</span>
            <a class="nav-item" routerLink="/dashboard" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: true }"
               [attr.data-tooltip]="collapsed() ? 'Dashboard' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideLayoutDashboard" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Dashboard</span>
              </span>
            </a>
          </div>

          <div class="nav-group">
            <span class="nav-group-label">WORKSPACE</span>
            <a class="nav-item" routerLink="/projects" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Projects' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideFolderKanban" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Projects</span>
              </span>
            </a>
            <a class="nav-item" routerLink="/stories" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: true }"
               [attr.data-tooltip]="collapsed() ? 'Stories' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideBookOpenText" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Stories</span>
              </span>
            </a>
            <a class="nav-item" routerLink="/test-suites" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Test Suites' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideClipboardList" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Test Suites</span>
              </span>
            </a>
          </div>

          <div class="nav-group">
            <span class="nav-group-label">QUALITY</span>
            <a class="nav-item" routerLink="/review-board" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Review Board' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideCheckSquare2" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Review Board</span>
              </span>
              @if (pendingReviewCount() > 0) {
                <span class="nav-badge">{{ pendingReviewCount() }}</span>
              }
            </a>
            <a class="nav-item" routerLink="/export" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Export Hub' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideDownload" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Export Hub</span>
              </span>
            </a>
          </div>

          @if (authService.hasRole('ADMIN')) {
            <div class="nav-group">
              <span class="nav-group-label">ADMIN</span>
                <a class="nav-item" routerLink="/admin/users" routerLinkActive="active"
                   [attr.data-tooltip]="collapsed() ? 'Users' : null"
                   (mouseenter)="onNavItemEnter($event)">
                  <span class="nav-inner">
                    <span class="nav-icon-wrap"><svg [lucideIcon]="LucideUsers" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                    <span class="nav-label">Users</span>
                  </span>
                </a>
                <a class="nav-item" routerLink="/admin/audit" routerLinkActive="active"
                   [attr.data-tooltip]="collapsed() ? 'Audit Trail' : null"
                   (mouseenter)="onNavItemEnter($event)">
                  <span class="nav-inner">
                    <span class="nav-icon-wrap"><svg [lucideIcon]="LucideShieldCheck" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                    <span class="nav-label">Audit Trail</span>
                  </span>
                </a>
            </div>
          }

        </nav>

        <div class="sidebar-footer">
          @if (authService.hasRole(['ADMIN', 'QA_ENGINEER'])) {
            <a class="nav-item footer-settings" routerLink="/settings" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Settings' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideSettings2" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Settings</span>
              </span>
            </a>
          }
          @if (authService.currentUser(); as user) {
            <div class="footer-user">
              <div class="footer-avatar" [class]="avatarClass(user.role)">{{ initials(user.displayName) }}</div>
              <div class="footer-info">
                <span class="footer-name">{{ user.displayName }}</span>
                <span [class]="roleChipClass(user.role)">{{ roleLabel(user.role) }}</span>
              </div>
            </div>
          } @else {
            <div class="footer-avatar viewer-avatar">?</div>
          }
        </div>
      </aside>

      <section #scrollWrapper class="workspace">
        <div #scrollContent class="workspace-content">
        <header class="topbar glass-surface glass-surface--2 glass-surface--flat">
          <nav aria-label="breadcrumb" class="breadcrumb">
            @for (crumb of breadcrumbs(); track crumb.path; let last = $last) {
              @if (last) {
                <span class="crumb-current">{{ crumb.label }}</span>
              } @else {
                <a class="crumb-link" [routerLink]="crumb.path">{{ crumb.label }}</a>
                <span class="crumb-sep" aria-hidden="true">/</span>
              }
            }
          </nav>
          <div class="topbar-actions">
            <button
              class="mobile-nav-btn"
              type="button"
              (click)="openMobileNav()"
              aria-label="Open navigation"
              [attr.aria-expanded]="mobileNavOpen()">
              <svg [lucideIcon]="LucideMenu" [size]="18" aria-hidden="true"></svg>
            </button>
            <button class="button secondary topbar-search-button" type="button" aria-label="Open search" (click)="openSearch()">
              <svg [lucideIcon]="LucideSearch" [size]="18" [strokeWidth]="1.8" aria-hidden="true"></svg>
            </button>
            <app-notification-center />
            @if (authService.currentUser(); as user) {
              <button class="avatar-btn" type="button"
                      popovertarget="user-menu"
                      [attr.aria-label]="'User menu for ' + user.displayName">
                <span [class]="avatarClass(user.role)">{{ initials(user.displayName) }}</span>
              </button>
              <div id="user-menu" [attr.popover]="'auto'" class="user-popover glass-surface glass-surface--3 glass-scrim glass-scrim--3">
                <div class="popover-info">
                  <strong class="popover-name">{{ user.displayName }}</strong>
                  <span class="popover-role">{{ user.role }}</span>
                </div>
                <button class="button secondary" type="button" (click)="logout()">Sign out</button>
              </div>
            } @else {
              <a class="button secondary" routerLink="/login">Sign in</a>
            }
          </div>
        </header>

        @if (accessRestricted()) {
          <div class="access-restricted-notice inline-note amber-note">
            <strong>Access restricted.</strong>
            You do not have permission to perform that action. Contact your administrator to request additional access.
          </div>
        }

          <router-outlet (activate)="onRouteActivate($event)" />
        </div>
      </section>

    </div>
    @if (mobileNavOpen()) {
      <div class="mobile-nav-backdrop" aria-hidden="true" (click)="closeMobileNav()"></div>
      <nav class="mobile-nav-panel glass-surface glass-surface--3 glass-scrim glass-scrim--3" role="dialog" aria-modal="true" aria-label="Navigation">
        <button
          class="mobile-nav-close"
          type="button"
          (click)="closeMobileNav()"
          aria-label="Close navigation">
          <svg [lucideIcon]="LucideX" [size]="16" aria-hidden="true"></svg>
        </button>

        <a class="brand" routerLink="/">
          <span class="brand-mark">TQ</span>
          <span class="brand-text">
            <strong>TestCaseIQ</strong>
            <small>QA workspace</small>
          </span>
        </a>

        @if (projectContext()) {
          <div class="project-context-panel glass-surface glass-surface--2 glass-surface--flat">
            <a routerLink="/projects">â† Projects</a>
            <strong>{{ projectContext()?.name }}</strong>
            <span>{{ projectContext()?.storyCount }} stories Â· {{ projectContext()?.coveragePercent }}%</span>
          </div>
        }

        <nav class="nav-groups" aria-label="Mobile navigation">
          <div class="nav-group">
            <span class="nav-group-label">HOME</span>
            <a class="nav-item" routerLink="/dashboard" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: true }"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideLayoutDashboard" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Dashboard</span>
              </span>
            </a>
          </div>

          <div class="nav-group">
            <span class="nav-group-label">WORKSPACE</span>
            <a class="nav-item" routerLink="/projects" routerLinkActive="active"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideFolderKanban" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Projects</span>
              </span>
            </a>
            <a class="nav-item" routerLink="/stories" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: true }"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideBookOpenText" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Stories</span>
              </span>
            </a>
            <a class="nav-item" routerLink="/test-suites" routerLinkActive="active"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideClipboardList" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Test Suites</span>
              </span>
            </a>
          </div>

          <div class="nav-group">
            <span class="nav-group-label">QUALITY</span>
            <a class="nav-item" routerLink="/review-board" routerLinkActive="active"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideCheckSquare2" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Review Board</span>
              </span>
              @if (pendingReviewCount() > 0) {
                <span class="nav-badge">{{ pendingReviewCount() }}</span>
              }
            </a>
            <a class="nav-item" routerLink="/export" routerLinkActive="active"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideDownload" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Export Hub</span>
              </span>
            </a>
          </div>

          @if (authService.hasRole('ADMIN')) {
            <div class="nav-group">
              <span class="nav-group-label">ADMIN</span>
                <a class="nav-item" routerLink="/admin/users" routerLinkActive="active"
                   (mouseenter)="onNavItemEnter($event)">
                  <span class="nav-inner">
                    <span class="nav-icon-wrap"><svg [lucideIcon]="LucideUsers" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                    <span class="nav-label">Users</span>
                  </span>
                </a>
                <a class="nav-item" routerLink="/admin/audit" routerLinkActive="active"
                   (mouseenter)="onNavItemEnter($event)">
                  <span class="nav-inner">
                    <span class="nav-icon-wrap"><svg [lucideIcon]="LucideShieldCheck" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                    <span class="nav-label">Audit Trail</span>
                  </span>
                </a>
            </div>
          }
        </nav>

        <div class="sidebar-footer">
          @if (authService.hasRole(['ADMIN', 'QA_ENGINEER'])) {
            <a class="nav-item footer-settings" routerLink="/settings" routerLinkActive="active"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><svg [lucideIcon]="LucideSettings2" [size]="20" [strokeWidth]="1.5" aria-hidden="true"></svg></span>
                <span class="nav-label">Settings</span>
              </span>
            </a>
          }
          @if (authService.currentUser(); as user) {
            <div class="footer-user">
              <div class="footer-avatar" [class]="avatarClass(user.role)">{{ initials(user.displayName) }}</div>
              <div class="footer-info">
                <span class="footer-name">{{ user.displayName }}</span>
                <span [class]="roleChipClass(user.role)">{{ roleLabel(user.role) }}</span>
              </div>
            </div>
          } @else {
            <div class="footer-avatar viewer-avatar">?</div>
          }
        </div>
      </nav>
    }
    @defer (when searchOpen()) {
      @if (searchOpen()) {
        <app-search-modal (closed)="closeSearch()" />
      }
    }
    <app-keyboard-shortcuts />
  `
})
export class AppLayoutComponent implements AfterViewInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly title = inject(Title);
  private readonly notificationService = inject(NotificationService);
  private readonly lenisService = inject(LenisService);
  private readonly appTitle = 'TestCaseIQ';

  readonly LucideLayoutDashboard = LucideLayoutDashboard;   readonly LucideFolderKanban = LucideFolderKanban;
  readonly LucideClipboardList = LucideClipboardList;        readonly LucideCheckSquare2 = LucideCheckSquare2;
  readonly LucideDownload = LucideDownload;                  readonly LucideShieldCheck = LucideShieldCheck;
  readonly LucideUsers = LucideUsers;                        readonly LucideSettings2 = LucideSettings2;
  readonly LucideChevronLeft = LucideChevronLeft;            readonly LucideChevronRight = LucideChevronRight;
  readonly LucideBookOpenText = LucideBookOpenText;          readonly LucideSearch = LucideSearch;
  readonly LucideMenu = LucideMenu;                          readonly LucideX = LucideX;

  @ViewChild('sidebarEl') private sidebarEl!: ElementRef<HTMLElement>;
  @ViewChild('scrollWrapper') private scrollWrapper!: ElementRef<HTMLElement>;
  @ViewChild('scrollContent') private scrollContent!: ElementRef<HTMLElement>;

  readonly collapsed = signal(false);
  readonly pendingReviewCount = signal(0);
  readonly accessRestricted = signal(false);
  readonly breadcrumbs = signal<Crumb[]>([]);
  readonly projectContext = signal<ProjectContext | null>(null);
  readonly activePage = signal<PageTitleSource | null>(null);
  readonly searchOpen = signal(false);
  readonly mobileNavOpen = signal(false);
  private projectContextEffect: EffectRef | null = null;
  private readonly handleDocumentKeydown = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openSearch();
    }
  };

  constructor() {
    document.addEventListener('keydown', this.handleDocumentKeydown);
    effect(() => {
      const count = this.notificationService.unreadCount();
      this.title.setTitle(count > 0 ? `(${count}) ${this.appTitle}` : this.appTitle);
    });
    effect(() => {
      if (!this.mobileNavOpen()) return;
      queueMicrotask(() => {
        const panel = document.querySelector('.mobile-nav-panel');
        const firstNav = document.querySelector('.mobile-nav-panel .nav-item') as HTMLElement | null;
        firstNav?.focus({ preventScroll: true });
        if (panel && !this.prefersReducedMotion()) {
          gsap.from(panel, { x: -280, duration: 0.28, ease: 'power2.out' });
        }
      });
    });
    effect(() => {
      const entityName = this.activePage()?.pageTitle();
      this.breadcrumbs.set(this.buildBreadcrumbs(entityName));
    });
    inject(ActivatedRoute).queryParamMap.subscribe(params => {
      this.accessRestricted.set(params.get('access') === 'restricted');
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMobileNav();
        this.breadcrumbs.set(this.buildBreadcrumbs(this.activePage()?.pageTitle()));
        if (!this.isProjectScopedUrl()) {
          this.projectContext.set(null);
          sessionStorage.removeItem(PROJECT_CONTEXT_STORAGE_KEY);
        }
      });
    this.breadcrumbs.set(this.buildBreadcrumbs());
    this.http.get<{ pendingReviewTestCases: number }>('/api/dashboard/metrics').pipe(
      catchError(() => of({ pendingReviewTestCases: 0 }))
    ).subscribe(m => this.pendingReviewCount.set(m.pendingReviewTestCases));
    this.notificationService.getUnreadCount().pipe(
      catchError(() => of({ count: 0 }))
    ).subscribe();
  }

  ngAfterViewInit(): void {
    this.lenisService.attach(this.scrollWrapper.nativeElement, this.scrollContent.nativeElement);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const navItems = this.sidebarEl.nativeElement.querySelectorAll('.nav-item');
    gsap.from(navItems, { x: -16, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
  }

  ngOnDestroy(): void {
    this.lenisService.detach();
    document.removeEventListener('keydown', this.handleDocumentKeydown);
    this.projectContextEffect?.destroy();
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    const sidebar = this.sidebarEl.nativeElement;
    const labels = sidebar.querySelectorAll<HTMLElement>('.nav-label, .nav-group-label, .brand-text, .footer-info');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      labels.forEach(label => label.style.opacity = this.collapsed() ? '0' : '1');
      sidebar.style.width = this.collapsed() ? '60px' : '220px';
      return;
    }
    if (this.collapsed()) {
      gsap.to(labels, { opacity: 0, duration: 0.12 });
      gsap.to(sidebar, { width: 60, duration: 0.28, ease: 'power2.inOut' });
    } else {
      gsap.to(sidebar, {
        width: 220, duration: 0.28, ease: 'power2.inOut',
        onComplete: () => gsap.to(labels, { opacity: 1, duration: 0.12 })
      });
    }
  }

  onNavItemEnter(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--tooltip-y', `${rect.top + rect.height / 2}px`);
  }

  openSearch(): void {
    this.searchOpen.set(true);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  closeMobileNav(): void {
    if (!this.mobileNavOpen()) return;
    this.mobileNavOpen.set(false);
    queueMicrotask(() => {
      const btn = document.querySelector('.mobile-nav-btn') as HTMLElement | null;
      btn?.focus({ preventScroll: true });
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileNavOpen()) this.closeMobileNav();
  }

  onRouteActivate(component: unknown): void {
    this.projectContextEffect?.destroy();
    this.projectContextEffect = null;
    this.activePage.set(this.hasPageTitle(component) ? component : null);
    if (this.hasProjectContext(component)) {
      this.projectContextEffect = effect(
        () => {
          const context = component.projectContext();
          this.projectContext.set(context);
          if (context) {
            sessionStorage.setItem(PROJECT_CONTEXT_STORAGE_KEY, JSON.stringify(context));
          }
        },
        { injector: this.injector }
      );
      return;
    }
    this.projectContext.set(this.contextFromNavigationState());
  }

  initials(displayName: string): string {
    return displayName.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(p => p[0]?.toUpperCase()).join('') || 'U';
  }

  avatarClass(role: string): string {
    if (role === 'ADMIN') return 'admin-avatar';
    if (role === 'QA_ENGINEER') return 'qa-avatar';
    return 'viewer-avatar';
  }

  roleChipClass(role: string): string {
    if (role === 'ADMIN') return 'footer-role role-admin';
    if (role === 'QA_ENGINEER') return 'footer-role role-qa';
    return 'footer-role role-viewer';
  }

  roleLabel(role: string): string {
    if (role === 'QA_ENGINEER') return 'QA Engineer';
    if (role === 'ADMIN') return 'Admin';
    return 'Viewer';
  }

  logout(): void {
    const popover = document.getElementById('user-menu') as (HTMLElement & { hidePopover?(): void }) | null;
    popover?.hidePopover?.();
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }

  private buildBreadcrumbs(entityName?: string): Crumb[] {
    const url = this.router.url.split('?')[0];
    if (!url || url === '/') return [{ label: 'Dashboard', path: '/' }];
    if (url === '/dashboard') return [{ label: 'Dashboard', path: '/dashboard' }];
    const labelMap: Record<string, string> = {
      dashboard: 'Dashboard', projects: 'Projects', stories: 'Stories', 'test-suites': 'Test Suites',
      admin: 'Admin', users: 'Users', audit: 'Audit Trail',
      settings: 'Settings', 'review-board': 'Review Board', export: 'Export',
    };
    const isId = (s: string) => /^[\da-f-]{8,}$|^\d+$/.test(s);
    const crumbs: Crumb[] = [{ label: 'Dashboard', path: '/' }];
    let path = '';
    const segments = url.split('/').filter(Boolean);
    for (const [index, seg] of segments.entries()) {
      path += `/${seg}`;
      if (isId(seg)) {
        if (index === segments.length - 1 && entityName) {
          crumbs.push({ label: entityName, path });
        }
        continue;
      }
      crumbs.push({ label: labelMap[seg] ?? seg, path });
    }
    return crumbs;
  }

  private hasPageTitle(component: unknown): component is PageTitleSource {
    return typeof component === 'object'
      && component !== null
      && 'pageTitle' in component
      && typeof (component as PageTitleSource).pageTitle === 'function';
  }

  private hasProjectContext(component: unknown): component is ProjectContextSource {
    return typeof component === 'object'
      && component !== null
      && 'projectContext' in component
      && typeof (component as ProjectContextSource).projectContext === 'function';
  }

  private contextFromNavigationState(): ProjectContext | null {
    const context = window.history.state?.projectContext as ProjectContext | undefined;
    if (context) return context;
    if (!this.isProjectScopedUrl()) return null;
    const storedContext = sessionStorage.getItem(PROJECT_CONTEXT_STORAGE_KEY);
    if (!storedContext) return null;
    try {
      return JSON.parse(storedContext) as ProjectContext;
    } catch {
      return null;
    }
  }

  private isProjectScopedUrl(): boolean {
    const url = this.router.url.split('?')[0];
    return /^\/projects\/[^/]+$/.test(url) || /^\/stories\/[^/]+$/.test(url);
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
