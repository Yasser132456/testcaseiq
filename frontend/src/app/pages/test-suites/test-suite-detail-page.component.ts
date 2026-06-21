import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TestCaseSummary, TestSuiteDetail } from '../../core/models/test-suite.model';
import { AuthService } from '../../core/services/auth.service';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-test-suite-detail-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StateMessageComponent, SkeletonComponent],
  template: `
    <section class="page-stack">
      @if (loading()) {
        <app-skeleton [rows]="4" [cols]="3" />
      } @else if (loadError()) {
        <app-state-message title="Could not load test suite" [message]="loadError()" tone="error" />
      } @else if (suite()) {
        <div class="section-header">
          <div>
            <h2>{{ suite()!.name }}</h2>
            <p class="breadcrumb">
              <a [routerLink]="['/projects', suite()!.projectId]" class="link">{{ suite()!.projectName }}</a>
              &rsaquo;
              <a [routerLink]="['/stories', suite()!.storyId]" class="link">{{ suite()!.storyTitle }}</a>
            </p>
          </div>
          <div class="header-actions">
            @if (canEdit()) {
              <button class="button secondary small" type="button" (click)="toggleEdit()">
                {{ editing() ? 'Cancel' : 'Edit' }}
              </button>
            }
            @if (canDelete()) {
              <button class="button danger small" type="button" (click)="confirmDelete()">Delete</button>
            }
          </div>
        </div>

        <div class="panel meta-panel">
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Test layer</span>
              <span class="meta-value">
                @if (suite()!.testLayer) {
                  <span class="layer-tag">{{ suite()!.testLayer }}</span>
                } @else {
                  <span class="text-muted">—</span>
                }
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Total cases</span>
              <span class="meta-value count-total">{{ suite()!.totalCases }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Approved</span>
              <span class="meta-value count-approved">{{ suite()!.approvedCases }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Rejected</span>
              <span class="meta-value count-rejected">{{ suite()!.rejectedCases }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Created</span>
              <span class="meta-value text-muted">{{ suite()!.createdAt | date:'medium' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Updated</span>
              <span class="meta-value text-muted">{{ suite()!.updatedAt | date:'medium' }}</span>
            </div>
          </div>

          @if (editing()) {
            <form class="edit-form" (ngSubmit)="saveEdit()">
              <label class="form-label">Description
                <textarea class="form-textarea" [(ngModel)]="editDescription" name="description" rows="3"></textarea>
              </label>
              <div class="form-actions">
                <button class="button primary small" type="submit" [disabled]="saving()">
                  {{ saving() ? 'Saving…' : 'Save' }}
                </button>
                @if (saveError()) {
                  <span class="save-error">{{ saveError() }}</span>
                }
              </div>
            </form>
          } @else if (suite()!.description) {
            <p class="suite-description">{{ suite()!.description }}</p>
          }
        </div>

        @if (suite()!.explainabilitySummary) {
          <div class="panel">
            <p class="suite-description">{{ suite()!.explainabilitySummary }}</p>
          </div>
        }

        @if (suite()!.testCases.length > 0) {
          <div class="panel">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Quality</th>
                  <th>Confidence</th>
                  <th>Auto</th>
                </tr>
              </thead>
              <tbody>
                @for (tc of suite()!.testCases; track tc.id) {
                  <tr>
                    <td class="tc-title">{{ tc.title }}</td>
                    <td><span class="type-tag">{{ tc.type ?? '—' }}</span></td>
                    <td><span class="priority-tag">{{ tc.priority ?? '—' }}</span></td>
                    <td><span [class]="statusClass(tc)">{{ tc.reviewStatus ?? 'DRAFT' }}</span></td>
                    <td><span [style.color]="confidenceColor(tc)">{{ tc.qualityScore != null ? tc.qualityScore + '/100' : '—' }}</span></td>
                    <td><span [style.color]="confidenceColor(tc)">{{ tc.confidenceLevel ?? '—' }}</span></td>
                    <td>{{ tc.automationCandidate ? '✓' : '' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-state-message title="No test cases" message="This suite has no test cases." />
        }

        <div class="back-link">
          <a [routerLink]="['/stories', suite()!.storyId]" class="link">
            ← Back to story
          </a>
        </div>
      }
    </section>
  `,
  styles: [`
    .breadcrumb { color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .link { color: var(--accent); text-decoration: none; }
    .link:hover { text-decoration: underline; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem 1.5rem; }
    .meta-item { display: flex; flex-direction: column; gap: 0.2rem; }
    .meta-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; }
    .meta-value { font-size: 0.875rem; }
    .text-muted { color: var(--text-muted); }
    .layer-tag { font-family: monospace; font-size: 0.78rem; background: var(--chip-bg); color: var(--accent); padding: 0.15rem 0.4rem; border-radius: 3px; }
    .count-total { font-weight: 700; }
    .count-approved, .count-rejected { font-weight: 600; }
    .count-approved { color: var(--green); }
    .count-rejected { color: var(--red); }
    .suite-description { color: var(--text-muted); font-size: 0.875rem; margin: 0.5rem 0 0; }
    .form-label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.875rem; color: var(--text-muted); }
    .form-textarea { background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 0.4rem 0.5rem; font-size: 0.875rem; resize: vertical; width: 100%; }
    .form-actions { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem; }
    .save-error { color: var(--red); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .data-table th { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
    .data-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
    .type-tag, .priority-tag { font-size: 0.8rem; }
    .status-other { color: var(--text-muted); }
    .status-approved { color: var(--green); font-weight: 600; }
    .status-rejected { color: var(--red); font-weight: 600; }
    .button.small { padding: 0.25rem 0.6rem; font-size: 0.8rem; }
    .button[disabled] { opacity: 0.4; cursor: not-allowed; }
    .button.danger { background: var(--red); color: #fff; border: none; }
  `]
})
export class TestSuiteDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly testSuiteService = inject(TestSuiteService);
  readonly authService = inject(AuthService);

  readonly suite = signal<TestSuiteDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');

  editDescription = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  canEdit(): boolean {
    return this.authService.hasRole(['ADMIN', 'QA_ENGINEER']);
  }

  canDelete(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  toggleEdit(): void {
    if (!this.editing()) {
      this.editDescription = this.suite()?.description ?? '';
    }
    this.editing.set(!this.editing());
    this.saveError.set('');
  }

  saveEdit(): void {
    const id = this.suite()?.id;
    if (!id) return;
    this.saving.set(true);
    this.saveError.set('');
    this.testSuiteService.updateSuite(id, { description: this.editDescription }).subscribe({
      next: () => {
        this.load(id);
        this.editing.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set('Failed to save. Please try again.');
        this.saving.set(false);
      }
    });
  }

  confirmDelete(): void {
    const s = this.suite();
    if (!s) return;
    if (!confirm(`Delete suite "${s.name}"? This will also delete all ${s.totalCases} test case(s). This cannot be undone.`)) return;
    this.testSuiteService.deleteSuite(s.id).subscribe({
      next: () => void this.router.navigate(['/stories', s.storyId]),
      error: () => alert('Failed to delete suite. Please try again.')
    });
  }

  statusClass(tc: TestCaseSummary): string {
    if (tc.reviewStatus === 'APPROVED') return 'status-approved';
    if (tc.reviewStatus === 'REJECTED') return 'status-rejected';
    return 'status-other';
  }

  confidenceColor(tc: TestCaseSummary): string {
    if (tc.confidenceLevel === 'HIGH') return 'var(--green)';
    if (tc.confidenceLevel === 'MEDIUM') return 'var(--amber)';
    if (tc.confidenceLevel === 'LOW') return 'var(--red)';
    return 'var(--text-muted)';
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadError.set('');
    this.testSuiteService.getSuite(id).subscribe({
      next: (s) => {
        this.suite.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load test suite. It may have been deleted or you may lack access.');
        this.loading.set(false);
      }
    });
  }
}
