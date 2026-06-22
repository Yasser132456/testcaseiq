import { DatePipe, SlicePipe } from '@angular/common';
import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ShieldCheck, LucideAngularModule } from 'lucide-angular';
import { AuditEvent, AuditEventFilters, AuditEventPage } from '../../core/models/audit-event.model';
import { AuditEventService } from '../../core/services/audit-event.service';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableStaggerDirective } from '../../shared/directives/table-stagger.directive';

const AUDIT_ACTIONS = [
  'USER_REGISTERED', 'USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILED',
  'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
  'STORY_CREATED', 'STORY_UPDATED', 'STORY_DELETED',
  'STORY_ANALYSIS_REQUESTED', 'TEST_GENERATION_REQUESTED',
  'TEST_CASE_STATUS_CHANGED', 'TEST_CASE_UPDATED',
  'TESTS_EXPORTED', 'TEST_SUITE_UPDATED', 'TEST_SUITE_DELETED',
  'USER_ROLE_CHANGED', 'USER_STATUS_CHANGED'
];

const RESOURCE_TYPES = ['USER', 'PROJECT', 'STORY', 'TEST_CASE', 'TEST_SUITE'];

const TRACEABILITY_ROUTES: Record<string, string> = {
  PROJECT: '/projects',
  STORY: '/stories',
};

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [DatePipe, SlicePipe, FormsModule, RouterLink, LucideAngularModule, DrawerComponent, StateMessageComponent, SkeletonComponent, EmptyStateComponent, TableStaggerDirective],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Activity Log</h2>
        <p class="section-subtitle">Audit trail of all significant actions taken in the system.</p>
      </div>

      <div class="audit-filter-strip">
        <button class="button secondary open-filter-drawer" type="button" (click)="openFilters()">Filters</button>
        <div class="filter-chip-row" aria-label="Active filters">
          @if (activeFilters().length === 0) {
            <span class="filter-chip is-empty">All events</span>
          }
          @for (filter of activeFilters(); track filter.key) {
            <span class="filter-chip">
              {{ filter.label }}
              <button type="button" (click)="dismissFilter(filter.key)" [attr.aria-label]="'Remove filter ' + filter.label">×</button>
            </span>
          }
        </div>
      </div>

      <app-drawer [open]="filterDrawerOpen()" title="Audit filters" (closed)="filterDrawerOpen.set(false)">
        @defer (when filterDrawerOpen()) {
          <form class="filter-form">
            <label>
              <span>Action</span>
              <select class="filter-select" [(ngModel)]="actionFilter" (ngModelChange)="onFilterChange()" name="actionFilter" aria-label="Filter by action">
                <option value="">All actions</option>
                @for (a of actions; track a) {
                  <option [value]="a">{{ a }}</option>
                }
              </select>
            </label>
            <label>
              <span>Outcome</span>
              <select class="filter-select" [(ngModel)]="outcomeFilter" (ngModelChange)="onFilterChange()" name="outcomeFilter" aria-label="Filter by outcome">
                <option value="">All outcomes</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </label>
            <label>
              <span>Resource type</span>
              <select class="filter-select" [(ngModel)]="resourceTypeFilter" (ngModelChange)="onFilterChange()" name="resourceTypeFilter" aria-label="Filter by resource type">
                <option value="">All resource types</option>
                @for (rt of resourceTypes; track rt) {
                  <option [value]="rt">{{ rt }}</option>
                }
              </select>
            </label>
            <label>
              <span>Actor email</span>
              <input class="filter-input" type="text" [(ngModel)]="actorFilter" (ngModelChange)="onFilterChange()"
                name="actorFilter" placeholder="qa@example.com" aria-label="Filter by actor email" />
            </label>
            <label>
              <span>From</span>
              <input class="filter-input" type="datetime-local" [(ngModel)]="fromFilter" (ngModelChange)="onFilterChange()"
                name="fromFilter" aria-label="From date" title="From date" />
            </label>
            <label>
              <span>To</span>
              <input class="filter-input" type="datetime-local" [(ngModel)]="toFilter" (ngModelChange)="onFilterChange()"
                name="toFilter" aria-label="To date" title="To date" />
            </label>
            <button class="button secondary" type="button" (click)="resetFilters()">Reset filters</button>
          </form>
        }
      </app-drawer>

      @if (loading()) {
        <app-skeleton [rows]="5" [cols]="6" />
      } @else if (loadError()) {
        <app-state-message title="Could not load activity log" [message]="loadError()" tone="error" />
      } @else if (page()?.content?.length === 0) {
        <div class="panel">
          <app-empty-state
            [icon]="ShieldCheck"
            title="No events found"
            message="No audit events match the current filters — try resetting filters or check back after more platform activity."
          />
        </div>
      } @else {
        <div class="panel">
          <table class="data-table" tableStagger>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Outcome</th>
                <th>Context</th>
              </tr>
            </thead>
            <tbody>
              @for (event of page()?.content ?? []; track event.id) {
                <tr>
                  <td><div class="row-inner td-muted">{{ event.timestamp | date:'short' }}</div></td>
                  <td>
                    <div class="row-inner">
                      @if (event.actorEmail) {
                        <span>{{ event.actorEmail }}</span>
                        @if (event.actorRole) {
                          <small class="td-muted"> ({{ event.actorRole }})</small>
                        }
                      } @else {
                        <span class="td-muted">System</span>
                      }
                    </div>
                  </td>
                  <td><div class="row-inner action-name">{{ event.action }}</div></td>
                  <td>
                    <div class="row-inner">
                      @if (resourceLink(event); as link) {
                        <a [routerLink]="link" class="trace-link">
                          {{ event.resourceType }}
                          @if (event.resourceId) {
                            <small class="resource-id">{{ event.resourceId | slice:0:8 }}…</small>
                          }
                        </a>
                      } @else {
                        @if (event.resourceType) {
                          <span>{{ event.resourceType }}</span>
                        }
                        @if (event.resourceId) {
                          <small class="resource-id">{{ event.resourceId | slice:0:8 }}…</small>
                        }
                      }
                    </div>
                  </td>
                  <td>
                    <div class="row-inner">
                      <span [class]="outcomeBadgeClass(event.outcome)">{{ event.outcome }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="row-inner context-col">
                      @if (event.summary) {
                        <span class="context-summary">{{ event.summary }}</span>
                      }
                      @if (event.metadata && metadataEntries(event).length > 0) {
                        <ul class="meta-list">
                          @for (entry of metadataEntries(event); track entry.key) {
                            <li>
                              @if (traceLink(entry.key, entry.value); as link) {
                                <span class="meta-key">{{ entry.key }}</span>
                                <a [routerLink]="link" class="trace-link meta-val">{{ entry.value | slice:0:8 }}…</a>
                              } @else {
                                <span class="meta-key">{{ entry.key }}</span>
                                <span class="meta-val">{{ entry.value }}</span>
                              }
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <button class="button secondary small" type="button"
            [disabled]="page()?.first"
            (click)="goToPage(currentPage() - 1)">
            Previous
          </button>
          <span class="page-info">
            Page {{ (page()?.number ?? 0) + 1 }} of {{ page()?.totalPages ?? 1 }}
            &nbsp;({{ page()?.totalElements ?? 0 }} events)
          </span>
          <button class="button secondary small" type="button"
            [disabled]="page()?.last"
            (click)="goToPage(currentPage() + 1)">
            Next
          </button>
        </div>
      }
    </section>
  `,
  styles: [`
    .section-subtitle { color: var(--color-text-2); margin-top: 0.25rem; font-size: 0.875rem; }
    .audit-filter-strip { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
    .filter-chip-row { display: flex; align-items: center; gap: var(--space-xs); flex-wrap: wrap; }
    .filter-chip { display: inline-flex; align-items: center; gap: var(--space-xs); background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: 9999px; padding: var(--space-xs) var(--space-sm); color: var(--color-text); font-family: var(--font-mono); font-size: 0.75rem; }
    .filter-chip.is-empty { color: var(--color-text-3); }
    .filter-chip button { border: 0; background: transparent; color: var(--color-text-3); cursor: pointer; padding: 0; font: inherit; }
    .filter-chip button:hover { color: var(--color-text); }
    .filter-chip button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; border-radius: 9999px; }
    .filter-chip button:active:not(:disabled) { transform: scale(0.97); }
    .filter-chip button:disabled { opacity: 0.45; cursor: not-allowed; }
    .filter-chip button[aria-busy="true"], .filter-chip button.loading { opacity: 0.7; cursor: progress; }
    .filter-chip button.error { color: var(--color-red); }
    .filter-chip button.success { color: var(--color-green); }
    .filter-form { display: grid; gap: var(--space-md); }
    .filter-form label { display: grid; gap: 0.35rem; }
    .filter-select, .filter-input { background: var(--color-surface-2); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.45rem 0.55rem; font-size: 0.85rem; min-width: 160px; }
    .filter-input[type="datetime-local"] { min-width: 200px; color-scheme: dark; }
    .td-muted { color: var(--color-text-2); white-space: nowrap; }
    .action-name, .resource-id, .meta-key, .meta-val { font-family: var(--font-mono); }
    .action-name { font-size: 0.8rem; }
    .resource-id { display: block; font-size: 0.75rem; color: var(--color-text-2); }
    .trace-link { color: var(--color-accent); text-decoration: none; }
    .trace-link:hover { text-decoration: underline; }
    .context-summary { display: block; color: var(--color-text-2); font-size: 0.8rem; margin-bottom: 0.2rem; }
    .meta-list { list-style: none; margin: 0; padding: 0; }
    .meta-list li { display: flex; gap: 0.35rem; font-size: 0.78rem; flex-wrap: wrap; }
    .meta-key { color: var(--color-text-2); }
    .outcome-success, .outcome-failure, .outcome-blocked { font-size: 0.8rem; font-weight: 600; }
    .outcome-success { color: var(--color-green); }
    .outcome-failure { color: var(--color-red); }
    .outcome-blocked { color: var(--color-amber); }
    .pagination-bar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; justify-content: center; }
    .page-info { color: var(--color-text-2); font-size: 0.875rem; }
  `]
})
export class AuditLogPageComponent implements OnInit {
  readonly ShieldCheck = ShieldCheck;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly auditEventService = inject(AuditEventService);

  readonly page = signal<AuditEventPage | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);
  readonly filterDrawerOpen = signal(false);

  actionFilter = '';
  outcomeFilter = '';
  resourceTypeFilter = '';
  actorFilter = '';
  fromFilter = '';
  toFilter = '';

  readonly actions = AUDIT_ACTIONS;
  readonly resourceTypes = RESOURCE_TYPES;

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(): void {
    this.currentPage.set(0);
    this.load();
    this.animateFilterChips();
  }

  resetFilters(): void {
    this.actionFilter = '';
    this.outcomeFilter = '';
    this.resourceTypeFilter = '';
    this.actorFilter = '';
    this.fromFilter = '';
    this.toFilter = '';
    this.currentPage.set(0);
    this.load();
    this.animateFilterChips();
  }

  openFilters(): void {
    this.filterDrawerOpen.set(true);
  }

  dismissFilter(key: string): void {
    if (key === 'action') this.actionFilter = '';
    if (key === 'outcome') this.outcomeFilter = '';
    if (key === 'resourceType') this.resourceTypeFilter = '';
    if (key === 'actor') this.actorFilter = '';
    if (key === 'from') this.fromFilter = '';
    if (key === 'to') this.toFilter = '';
    this.onFilterChange();
  }

  activeFilters(): { key: string; label: string }[] {
    const filters: { key: string; label: string }[] = [];
    if (this.actionFilter) filters.push({ key: 'action', label: this.actionFilter });
    if (this.outcomeFilter) filters.push({ key: 'outcome', label: this.outcomeFilter });
    if (this.resourceTypeFilter) filters.push({ key: 'resourceType', label: this.resourceTypeFilter });
    if (this.actorFilter) filters.push({ key: 'actor', label: this.actorFilter });
    if (this.fromFilter) filters.push({ key: 'from', label: `From ${this.fromFilter}` });
    if (this.toFilter) filters.push({ key: 'to', label: `To ${this.toFilter}` });
    return filters;
  }

  goToPage(pageNum: number): void {
    this.currentPage.set(pageNum);
    this.load();
  }

  outcomeBadgeClass(outcome: string): string {
    if (outcome === 'SUCCESS') return 'outcome-success';
    if (outcome === 'FAILURE') return 'outcome-failure';
    return 'outcome-blocked';
  }

  resourceLink(event: AuditEvent): string | null {
    if (!event.resourceType || !event.resourceId) return null;
    const base = TRACEABILITY_ROUTES[event.resourceType];
    return base ? `${base}/${event.resourceId}` : null;
  }

  traceLink(key: string, value: string): string | null {
    if (key === 'projectId') return `/projects/${value}`;
    if (key === 'storyId') return `/stories/${value}`;
    return null;
  }

  metadataEntries(event: AuditEvent): { key: string; value: string }[] {
    if (!event.metadata) return [];
    return Object.entries(event.metadata).map(([key, value]) => ({ key, value }));
  }

  private buildFilters(): AuditEventFilters {
    const filters: AuditEventFilters = {};
    if (this.actionFilter) filters.action = this.actionFilter;
    if (this.outcomeFilter) filters.outcome = this.outcomeFilter;
    if (this.resourceTypeFilter) filters.resourceType = this.resourceTypeFilter;
    if (this.actorFilter) filters.actor = this.actorFilter;
    if (this.fromFilter) filters.from = new Date(this.fromFilter).toISOString();
    if (this.toFilter) filters.to = new Date(this.toFilter).toISOString();
    return filters;
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.auditEventService.listEvents(this.buildFilters(), this.currentPage()).subscribe({
      next: (p) => {
        this.page.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load activity log. Confirm the backend is running and you have admin access.');
        this.loading.set(false);
      }
    });
  }

  private animateFilterChips(): void {
    if (this.prefersReducedMotion()) {
      return;
    }
    queueMicrotask(() => {
      const chips = this.host.nativeElement.querySelectorAll('.filter-chip:not(.is-empty)');
      if (chips.length > 0) {
        gsap.from(chips, { scale: 0.9, opacity: 0, duration: 0.18, ease: 'power2.out' });
      }
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
