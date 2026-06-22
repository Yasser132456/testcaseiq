import {
  AfterViewInit, Component, ElementRef, ViewChild, inject, signal
} from '@angular/core';
import {
  ActivatedRoute, NavigationEnd, Router,
  RouterLink, RouterLinkActive, RouterOutlet
} from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import { gsap } from 'gsap';
import {
  LucideAngularModule,
  LayoutDashboard, FolderKanban, ClipboardList, CheckSquare2,
  Download, ShieldCheck, Users, Settings2, ChevronLeft, ChevronRight,
} from 'lucide-angular';
import { AuthService } from '../core/services/auth.service';

interface Crumb { label: string; path: string; }

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  styleUrl: './app-layout.component.css',
  template: `
    <div class="grain" aria-hidden="true"></div>
    <div class="layout-shell">

      <aside #sidebarEl class="sidebar">
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
          <lucide-angular [img]="collapsed() ? ChevronRight : ChevronLeft"
                          [size]="14" [strokeWidth]="2" aria-hidden="true" />
        </button>

        <nav class="nav-groups" aria-label="Primary navigation">

          <div class="nav-group">
            <span class="nav-group-label">WORKSPACE</span>
            <a class="nav-item" routerLink="/" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: true }"
               [attr.data-tooltip]="collapsed() ? 'Dashboard' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><lucide-angular [img]="LayoutDashboard" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
                <span class="nav-label">Dashboard</span>
              </span>
            </a>
            <a class="nav-item" routerLink="/projects" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Projects' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><lucide-angular [img]="FolderKanban" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
                <span class="nav-label">Projects</span>
              </span>
            </a>
            <a class="nav-item" routerLink="/test-suites" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Test Suites' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><lucide-angular [img]="ClipboardList" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
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
                <span class="nav-icon-wrap"><lucide-angular [img]="CheckSquare2" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
                <span class="nav-label">Review Board</span>
              </span>
              @if (pendingReviewCount() > 0) {
                <span class="nav-badge">{{ pendingReviewCount() }}</span>
              }
            </a>
            <a class="nav-item" routerLink="/export" routerLinkActive="active"
               [attr.data-tooltip]="collapsed() ? 'Export' : null"
               (mouseenter)="onNavItemEnter($event)">
              <span class="nav-inner">
                <span class="nav-icon-wrap"><lucide-angular [img]="Download" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
                <span class="nav-label">Export</span>
              </span>
            </a>
          </div>

          @if (authService.hasRole(['ADMIN', 'QA_ENGINEER'])) {
            <div class="nav-group">
              <span class="nav-group-label">ADMIN</span>
              @if (authService.hasRole('ADMIN')) {
                <a class="nav-item" routerLink="/admin/audit" routerLinkActive="active"
                   [attr.data-tooltip]="collapsed() ? 'Audit Trail' : null"
                   (mouseenter)="onNavItemEnter($event)">
                  <span class="nav-inner">
                    <span class="nav-icon-wrap"><lucide-angular [img]="ShieldCheck" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
                    <span class="nav-label">Audit Trail</span>
                  </span>
                </a>
                <a class="nav-item" routerLink="/admin/users" routerLinkActive="active"
                   [attr.data-tooltip]="collapsed() ? 'Users' : null"
                   (mouseenter)="onNavItemEnter($event)">
                  <span class="nav-inner">
                    <span class="nav-icon-wrap"><lucide-angular [img]="Users" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
                    <span class="nav-label">Users</span>
                  </span>
                </a>
              }
              <a class="nav-item" routerLink="/settings" routerLinkActive="active"
                 [attr.data-tooltip]="collapsed() ? 'Settings' : null"
                 (mouseenter)="onNavItemEnter($event)">
                <span class="nav-inner">
                  <span class="nav-icon-wrap"><lucide-angular [img]="Settings2" [size]="20" [strokeWidth]="1.5" aria-hidden="true" /></span>
                  <span class="nav-label">Settings</span>
                </span>
              </a>
            </div>
          }

        </nav>

        <div class="sidebar-footer">
          @if (authService.currentUser(); as user) {
            <div class="footer-avatar" [class]="avatarClass(user.role)">{{ initials(user.displayName) }}</div>
            <div class="footer-info">
              <span class="footer-name">{{ user.displayName }}</span>
              <span [class]="roleChipClass(user.role)">{{ roleLabel(user.role) }}</span>
            </div>
          } @else {
            <div class="footer-avatar viewer-avatar">?</div>
          }
        </div>
      </aside>

      <section class="workspace">
        <header class="topbar">
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
            @if (authService.currentUser(); as user) {
              <button class="avatar-btn" type="button"
                      popovertarget="user-menu"
                      [attr.aria-label]="'User menu for ' + user.displayName">
                <span [class]="avatarClass(user.role)">{{ initials(user.displayName) }}</span>
              </button>
              <div id="user-menu" [attr.popover]="'auto'" class="user-popover">
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

        <router-outlet />
      </section>

    </div>
  `
})
export class AppLayoutComponent implements AfterViewInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly LayoutDashboard = LayoutDashboard;   readonly FolderKanban = FolderKanban;
  readonly ClipboardList = ClipboardList;        readonly CheckSquare2 = CheckSquare2;
  readonly Download = Download;                  readonly ShieldCheck = ShieldCheck;
  readonly Users = Users;                        readonly Settings2 = Settings2;
  readonly ChevronLeft = ChevronLeft;            readonly ChevronRight = ChevronRight;

  @ViewChild('sidebarEl') private sidebarEl!: ElementRef<HTMLElement>;

  readonly collapsed = signal(false);
  readonly pendingReviewCount = signal(0);
  readonly accessRestricted = signal(false);
  readonly breadcrumbs = signal<Crumb[]>([]);

  constructor() {
    inject(ActivatedRoute).queryParamMap.subscribe(params => {
      this.accessRestricted.set(params.get('access') === 'restricted');
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.breadcrumbs.set(this.buildBreadcrumbs()));
    this.breadcrumbs.set(this.buildBreadcrumbs());
    this.http.get<{ pendingReviewTestCases: number }>('/api/dashboard/metrics').pipe(
      catchError(() => of({ pendingReviewTestCases: 0 }))
    ).subscribe(m => this.pendingReviewCount.set(m.pendingReviewTestCases));
  }

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from('.nav-item', { x: -16, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
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

  private buildBreadcrumbs(): Crumb[] {
    const url = this.router.url.split('?')[0];
    if (!url || url === '/') return [{ label: 'Dashboard', path: '/' }];
    const labelMap: Record<string, string> = {
      projects: 'Projects', stories: 'Story', 'test-suites': 'Test Suites',
      admin: 'Admin', users: 'Users', audit: 'Audit Trail',
      settings: 'Settings', 'review-board': 'Review Board', export: 'Export',
    };
    const isId = (s: string) => /^[\da-f-]{8,}$|^\d+$/.test(s);
    const crumbs: Crumb[] = [{ label: 'Dashboard', path: '/' }];
    let path = '';
    for (const seg of url.split('/').filter(Boolean)) {
      path += `/${seg}`;
      if (!isId(seg)) crumbs.push({ label: labelMap[seg] ?? seg, path });
    }
    return crumbs;
  }
}
