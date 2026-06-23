import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideClipboardList } from '@lucide/angular';
import { TestSuiteFilters, TestSuitePage, TestSuiteSummary } from '../../core/models/test-suite.model';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableStaggerDirective } from '../../shared/directives/table-stagger.directive';

@Component({
  selector: 'app-test-suites-list-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StateMessageComponent, SkeletonComponent, EmptyStateComponent, TableStaggerDirective],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Test Suites</h2>
        <p class="section-subtitle">Browse generated test suites across all projects and stories.</p>
      </div>

      <div class="filter-panel panel">
        <div class="filter-row">
          <input class="filter-input" type="text" [(ngModel)]="storyIdFilter" (ngModelChange)="onFilterChange()"
            placeholder="Filter by story ID" aria-label="Story ID" />
          <input class="filter-input" type="text" [(ngModel)]="projectIdFilter" (ngModelChange)="onFilterChange()"
            placeholder="Filter by project ID" aria-label="Project ID" />
          <label class="check-label">
            <input type="checkbox" [(ngModel)]="approvedOnlyFilter" (ngModelChange)="onFilterChange()" />
            Approved cases only
          </label>
          <button class="button secondary small" type="button" (click)="resetFilters()">Reset</button>
        </div>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="5" [cols]="6" />
      } @else if (loadError()) {
        <app-state-message title="Could not load test suites" [message]="loadError()" tone="error" />
      } @else if (page()?.content?.length === 0) {
        <div class="panel">
          <app-empty-state
            [icon]="LucideClipboardList"
            title="No test suites found"
            message="No suites match the current filters — try resetting filters, or generate a test suite from a story to build coverage."
          />
        </div>
      } @else {
        <div class="panel">
          <table class="data-table" tableStagger>
            <thead>
              <tr>
                <th>Suite name</th>
                <th>Story</th>
                <th>Project</th>
                <th>Layer</th>
                <th>Cases</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (suite of page()?.content ?? []; track suite.id) {
                <tr [routerLink]="['/test-suites', suite.id]">
                  <td><div class="row-inner suite-name">{{ suite.name }}</div></td>
                  <td>
                    <div class="row-inner">
                      <a [routerLink]="['/stories', suite.storyId]" class="row-link" (click)="$event.stopPropagation()">
                        {{ suite.storyTitle }}
                      </a>
                    </div>
                  </td>
                  <td>
                    <div class="row-inner">
                      <a [routerLink]="['/projects', suite.projectId]" class="row-link" (click)="$event.stopPropagation()">
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
                      <span class="count-total">{{ suite.totalCases }}</span>
                      @if (suite.approvedCases > 0) {
                        <span class="count-approved"> ✓{{ suite.approvedCases }}</span>
                      }
                      @if (suite.rejectedCases > 0) {
                        <span class="count-rejected"> ✗{{ suite.rejectedCases }}</span>
                      }
                    </div>
                  </td>
                  <td><div class="row-inner td-muted">{{ suite.createdAt | date:'mediumDate' }}</div></td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <button class="button secondary small" type="button"
            [disabled]="page()?.first"
            (click)="goToPage(currentPage() - 1)">Previous</button>
          <span class="page-info">
            Page {{ (page()?.number ?? 0) + 1 }} of {{ page()?.totalPages ?? 1 }}
            &nbsp;({{ page()?.totalElements ?? 0 }} suites)
          </span>
          <button class="button secondary small" type="button"
            [disabled]="page()?.last"
            (click)="goToPage(currentPage() + 1)">Next</button>
        </div>
      }
    </section>
  `,
  styles: [`
    .section-subtitle { color: var(--color-text-2); margin-top: 0.25rem; font-size: 0.875rem; }
    .filter-panel { padding: 0.75rem 1rem; margin-bottom: 0; border-radius: 6px 6px 0 0; }
    .filter-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .filter-input { background: var(--glass-1); color: var(--color-text); border: 1px solid var(--glass-border); border-radius: 4px; padding: 0.3rem 0.5rem; font-size: 0.85rem; min-width: 200px; }
    .check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--color-text); cursor: pointer; }
    .suite-name { font-weight: 500; }
    .row-link { color: var(--color-text-2); text-decoration: none; transition: color var(--dur) var(--ease); }
    .row-link:hover { color: var(--color-accent); }
    .layer-badge { font-family: var(--font-mono); font-size: 0.72rem; background: var(--glass-1); border: 1px solid var(--glass-border); color: var(--color-text-2); padding: 0.15rem 0.45rem; border-radius: 4px; }
    .td-muted { color: var(--color-text-2); white-space: nowrap; }
    .count-total { font-weight: 600; }
    .count-approved { color: var(--color-green); font-size: 0.82rem; }
    .count-rejected { color: var(--color-red); font-size: 0.82rem; }
    .pagination-bar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; justify-content: center; }
    .page-info { color: var(--color-text-2); font-size: 0.875rem; }
  `]
})
export class TestSuitesListPageComponent implements OnInit {
  readonly LucideClipboardList = LucideClipboardList;

  private readonly testSuiteService = inject(TestSuiteService);

  readonly page = signal<TestSuitePage | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);

  storyIdFilter = '';
  projectIdFilter = '';
  approvedOnlyFilter = false;

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(): void {
    this.currentPage.set(0);
    this.load();
  }

  resetFilters(): void {
    this.storyIdFilter = '';
    this.projectIdFilter = '';
    this.approvedOnlyFilter = false;
    this.currentPage.set(0);
    this.load();
  }

  goToPage(pageNum: number): void {
    this.currentPage.set(pageNum);
    this.load();
  }

  private buildFilters(): TestSuiteFilters {
    const filters: TestSuiteFilters = {};
    if (this.storyIdFilter.trim()) filters.storyId = this.storyIdFilter.trim();
    if (this.projectIdFilter.trim()) filters.projectId = this.projectIdFilter.trim();
    if (this.approvedOnlyFilter) filters.approvedOnly = true;
    return filters;
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.testSuiteService.listSuites(this.buildFilters(), this.currentPage()).subscribe({
      next: (p) => {
        this.page.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load test suites. Confirm the backend is running.');
        this.loading.set(false);
      }
    });
  }
}
