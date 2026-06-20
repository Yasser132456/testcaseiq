import { DatePipe, SlicePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AuditEvent, AuditEventFilters, AuditEventPage } from '../../core/models/audit-event.model';
import { AuditEventService } from '../../core/services/audit-event.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

const AUDIT_ACTIONS = [
  'USER_REGISTERED', 'USER_LOGIN_SUCCESS', 'USER_LOGIN_FAILED',
  'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
  'STORY_CREATED', 'STORY_UPDATED', 'STORY_DELETED',
  'STORY_ANALYSIS_REQUESTED', 'TEST_GENERATION_REQUESTED',
  'TEST_CASE_STATUS_CHANGED', 'TEST_CASE_UPDATED',
  'TESTS_EXPORTED', 'USER_ROLE_CHANGED', 'USER_STATUS_CHANGED'
];

const RESOURCE_TYPES = ['USER', 'PROJECT', 'STORY', 'TEST_CASE', 'TEST_SUITE'];

@Component({
  selector: 'app-audit-log-page',
  standalone: true,
  imports: [DatePipe, SlicePipe, StateMessageComponent],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Activity Log</h2>
        <p class="section-subtitle">Audit trail of all significant actions taken in the system.</p>
      </div>

      <div class="filter-bar panel">
        <select class="filter-select" (change)="onFilterChange('action', $any($event.target).value)" aria-label="Filter by action">
          <option value="">All actions</option>
          @for (a of actions; track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>
        <select class="filter-select" (change)="onFilterChange('outcome', $any($event.target).value)" aria-label="Filter by outcome">
          <option value="">All outcomes</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <select class="filter-select" (change)="onFilterChange('resourceType', $any($event.target).value)" aria-label="Filter by resource type">
          <option value="">All resource types</option>
          @for (rt of resourceTypes; track rt) {
            <option [value]="rt">{{ rt }}</option>
          }
        </select>
      </div>

      @if (loading()) {
        <app-state-message title="Loading activity log" message="Fetching audit events." />
      } @else if (loadError()) {
        <app-state-message title="Could not load activity log" [message]="loadError()" tone="error" />
      } @else if (page()?.content?.length === 0) {
        <app-state-message title="No events found" message="No audit events match the current filters." />
      } @else {
        <div class="panel">
          <table class="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Outcome</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              @for (event of page()?.content ?? []; track event.id) {
                <tr>
                  <td class="text-muted text-nowrap">{{ event.timestamp | date:'short' }}</td>
                  <td>
                    @if (event.actorEmail) {
                      <span>{{ event.actorEmail }}</span>
                      @if (event.actorRole) {
                        <small class="text-muted"> ({{ event.actorRole }})</small>
                      }
                    } @else {
                      <span class="text-muted">System</span>
                    }
                  </td>
                  <td class="action-name">{{ event.action }}</td>
                  <td class="text-muted">
                    @if (event.resourceType) {
                      <span>{{ event.resourceType }}</span>
                    }
                    @if (event.resourceId) {
                      <small class="resource-id">{{ event.resourceId | slice:0:8 }}…</small>
                    }
                  </td>
                  <td>
                    <span [class]="outcomeBadgeClass(event.outcome)">{{ event.outcome }}</span>
                  </td>
                  <td class="text-muted summary-col">{{ event.summary ?? '—' }}</td>
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
    .section-subtitle { color: var(--text-muted, #8899aa); margin-top: 0.25rem; font-size: 0.875rem; }
    .filter-bar { display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 1rem; margin-bottom: 0; border-radius: 6px 6px 0 0; }
    .filter-select { background: var(--input-bg, #0f1923); color: var(--text, #d0d8e8); border: 1px solid var(--border, #2a3444); border-radius: 4px; padding: 0.3rem 0.5rem; font-size: 0.85rem; cursor: pointer; min-width: 160px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .data-table th { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border, #2a3444); color: var(--text-muted, #8899aa); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .data-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border-subtle, #1e2a38); vertical-align: top; }
    .text-muted { color: var(--text-muted, #8899aa); }
    .text-nowrap { white-space: nowrap; }
    .action-name { font-family: monospace; font-size: 0.8rem; }
    .resource-id { display: block; font-family: monospace; font-size: 0.75rem; color: var(--text-muted, #8899aa); }
    .summary-col { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .outcome-success { color: var(--green, #4ade80); font-size: 0.8rem; font-weight: 600; }
    .outcome-failure { color: var(--red, #f87171); font-size: 0.8rem; font-weight: 600; }
    .outcome-blocked { color: var(--amber, #fbbf24); font-size: 0.8rem; font-weight: 600; }
    .pagination-bar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; justify-content: center; }
    .page-info { color: var(--text-muted, #8899aa); font-size: 0.875rem; }
    .button.small { padding: 0.25rem 0.6rem; font-size: 0.8rem; }
    .button[disabled] { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class AuditLogPageComponent implements OnInit {
  private readonly auditEventService = inject(AuditEventService);

  readonly page = signal<AuditEventPage | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);
  readonly filters = signal<AuditEventFilters>({});

  readonly actions = AUDIT_ACTIONS;
  readonly resourceTypes = RESOURCE_TYPES;

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(field: keyof AuditEventFilters, value: string): void {
    this.filters.update(f => ({ ...f, [field]: value || undefined }));
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

  private load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.auditEventService.listEvents(this.filters(), this.currentPage()).subscribe({
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
