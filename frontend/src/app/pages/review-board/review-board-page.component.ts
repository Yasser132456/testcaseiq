import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckSquare2 } from 'lucide-angular';
import { TestSuitePage } from '../../core/models/test-suite.model';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableStaggerDirective } from '../../shared/directives/table-stagger.directive';

@Component({
  selector: 'app-review-board-page',
  standalone: true,
  imports: [DatePipe, RouterLink, StateMessageComponent, SkeletonComponent, EmptyStateComponent, TableStaggerDirective],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Review Board</h2>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="5" [cols]="5" />
      } @else if (loadError()) {
        <app-state-message title="Could not load review board" [message]="loadError()" tone="error" />
      } @else if (page()?.content?.length === 0) {
        <div class="panel">
          <app-empty-state
            [icon]="CheckSquare2"
            title="Queue cleared"
            message="No test suites pending review — your team has cleared the queue. Generate new suites from stories to continue coverage."
          />
        </div>
      } @else {
        <div class="panel">
          <table class="data-table" tableStagger>
            <thead>
              <tr>
                <th>Suite</th>
                <th>Project</th>
                <th>Layer</th>
                <th>Pending</th>
                <th>Total</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (suite of page()?.content ?? []; track suite.id) {
                <tr [routerLink]="['/test-suites', suite.id]">
                  <td><div class="row-inner"><strong>{{ suite.name }}</strong></div></td>
                  <td>
                    <div class="row-inner">
                      <a [routerLink]="['/projects', suite.projectId]" (click)="$event.stopPropagation()" class="row-link">
                        {{ suite.projectName }}
                      </a>
                    </div>
                  </td>
                  <td>
                    <div class="row-inner">
                      @if (suite.testLayer) {
                        <span class="layer-badge">{{ suite.testLayer }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <div class="row-inner">
                      <span class="pending-count">{{ pendingCount(suite) }}</span>
                    </div>
                  </td>
                  <td><div class="row-inner">{{ suite.totalCases }}</div></td>
                  <td><div class="row-inner td-muted">{{ suite.createdAt | date:'mediumDate' }}</div></td>
                  <td>
                    <a class="button ghost" [routerLink]="['/test-suites', suite.id]" (click)="$event.stopPropagation()">
                      Review →
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <button class="button secondary" type="button"
            [disabled]="page()?.first" (click)="goToPage(currentPage() - 1)">Previous</button>
          <span class="page-info">
            Page {{ (page()?.number ?? 0) + 1 }} of {{ page()?.totalPages ?? 1 }}
            &nbsp;({{ page()?.totalElements ?? 0 }} suites)
          </span>
          <button class="button secondary" type="button"
            [disabled]="page()?.last" (click)="goToPage(currentPage() + 1)">Next</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .td-muted { color: var(--color-text-2); white-space: nowrap; }
    .row-link { color: var(--color-text-2); transition: color var(--dur) var(--ease); }
    .row-link:hover { color: var(--color-accent); }
    .layer-badge {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      color: var(--color-text-2);
    }
    .pending-count { font-family: var(--font-mono); font-weight: 700; color: var(--color-amber); }
    .pagination-bar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; justify-content: center; }
    .page-info { color: var(--color-text-2); font-size: 0.875rem; }
  `]
})
export class ReviewBoardPageComponent implements OnInit {
  private readonly testSuiteService = inject(TestSuiteService);

  readonly CheckSquare2 = CheckSquare2;
  readonly page = signal<TestSuitePage | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);

  ngOnInit(): void { this.load(); }

  goToPage(n: number): void { this.currentPage.set(n); this.load(); }

  pendingCount(suite: { totalCases: number; approvedCases: number; rejectedCases: number }): number {
    return Math.max(0, suite.totalCases - suite.approvedCases - suite.rejectedCases);
  }

  private load(): void {
    this.loading.set(true);
    this.testSuiteService.listSuites({}, this.currentPage()).subscribe({
      next: (p) => { this.page.set(p); this.loading.set(false); },
      error: () => { this.loadError.set('Unable to load review board.'); this.loading.set(false); }
    });
  }
}
