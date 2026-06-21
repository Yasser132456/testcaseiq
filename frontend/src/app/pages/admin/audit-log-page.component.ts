import { DatePipe, SlicePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShieldCheck, LucideAngularModule } from 'lucide-angular';
import { AuditEvent, AuditEventFilters, AuditEventPage } from '../../core/models/audit-event.model';
import { AuditEventService } from '../../core/services/audit-event.service';
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
  imports: [DatePipe, SlicePipe, FormsModule, RouterLink, LucideAngularModule, StateMessageComponent, SkeletonComponent, EmptyStateComponent, TableStaggerDirective],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Activity Log</h2>
        <p class="section-subtitle">Audit trail of all significant actions taken in the system.</p>
      </div>

      <div class="filter-panel panel">
        <div class="filter-row">
          <select class="filter-select" [(ngModel)]="actionFilter" (ngModelChange)="onFilterChange()" aria-label="Filter by action">
            <option value="">All actions</option>
            @for (a of actions; track a) {
              <option [value]="a">{{ a }}</option>
            }
          </select>
          <select class="filter-select" [(ngModel)]="outcomeFilter" (ngModelChange)="onFilterChange()" aria-label="Filter by outcome">
            <option value="">All outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <select class="filter-select" [(ngModel)]="resourceTypeFilter" (ngModelChange)="onFilterChange()" aria-label="Filter by resource type">
            <option value="">All resource types</option>
            @for (rt of resourceTypes; track rt) {
              <option [value]="rt">{{ rt }}</option>
            }
          </select>
        </div>
        <div class="filter-row">
          <input class="filter-input" type="text" [(ngModel)]="actorFilter" (ngModelChange)="onFilterChange()"
            placeholder="Filter by actor email" aria-label="Filter by actor email" />
          <input class="filter-input" type="datetime-local" [(ngModel)]="fromFilter" (ngModelChange)="onFilterChange()"
            aria-label="From date" title="From date" />
          <input class="filter-input" type="datetime-local" [(ngModel)]="toFilter" (ngModelChange)="onFilterChange()"
            aria-label="To date" title="To date" />
          <button class="button secondary small" type="button" (click)="resetFilters()">Reset filters</button>
        </div>
      </div>

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
    .filter-panel { padding: 0.75rem 1rem; margin-bottom: 0; border-radius: 6px 6px 0 0; }
    .filter-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .filter-row + .filter-row { margin-top: 0.5rem; }
    .filter-select, .filter-input { background: var(--color-surface-2); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px; padding: 0.3rem 0.5rem; font-size: 0.85rem; min-width: 160px; }
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

  private readonly auditEventService = inject(AuditEventService);

  readonly page = signal<AuditEventPage | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);

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
}
