import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TestSuiteFilters, TestSuitePage, TestSuiteSummary } from '../../core/models/test-suite.model';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-test-suites-list-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, StateMessageComponent],
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
        <app-state-message title="Loading test suites" message="Fetching suites." />
      } @else if (loadError()) {
        <app-state-message title="Could not load test suites" [message]="loadError()" tone="error" />
      } @else if (page()?.content?.length === 0) {
        <app-state-message title="No test suites found" message="No suites match the current filters." />
      } @else {
        <div class="panel">
          <table class="data-table">
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
                <tr class="clickable-row" [routerLink]="['/test-suites', suite.id]">
                  <td class="suite-name">{{ suite.name }}</td>
                  <td>
                    <a [routerLink]="['/stories', suite.storyId]" class="link" (click)="$event.stopPropagation()">
                      {{ suite.storyTitle }}
                    </a>
                  </td>
                  <td>
                    <a [routerLink]="['/projects', suite.projectId]" class="link" (click)="$event.stopPropagation()">
                      {{ suite.projectName }}
                    </a>
                  </td>
                  <td>
                    @if (suite.testLayer) {
                      <span class="layer-tag">{{ suite.testLayer }}</span>
                    }
                  </td>
                  <td>
                    <span class="case-counts">
                      <span class="count-total">{{ suite.totalCases }}</span>
                      @if (suite.approvedCases > 0) {
                        <span class="count-approved"> ✓{{ suite.approvedCases }}</span>
                      }
                      @if (suite.rejectedCases > 0) {
                        <span class="count-rejected"> ✗{{ suite.rejectedCases }}</span>
                      }
                    </span>
                  </td>
                  <td class="text-muted text-nowrap">{{ suite.createdAt | date:'mediumDate' }}</td>
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
    .section-subtitle { color: var(--text-muted); margin-top: 0.25rem; font-size: 0.875rem; }
    .filter-panel { padding: 0.75rem 1rem; margin-bottom: 0; border-radius: 6px 6px 0 0; }
    .filter-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .filter-input { background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 0.3rem 0.5rem; font-size: 0.85rem; min-width: 200px; }
    .check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--text); cursor: pointer; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .data-table th { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); color: var(--text-muted); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .data-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover td { background: var(--surface-hover, rgba(255,255,255,0.03)); }
    .suite-name { font-weight: 500; }
    .link { color: var(--accent); text-decoration: none; }
    .link:hover { text-decoration: underline; }
    .layer-tag { font-family: monospace; font-size: 0.78rem; background: var(--chip-bg, rgba(88,166,255,0.1)); color: var(--accent); padding: 0.15rem 0.4rem; border-radius: 3px; }
    .count-total { font-weight: 600; }
    .count-approved { color: var(--green); font-size: 0.82rem; }
    .count-rejected { color: var(--red); font-size: 0.82rem; }
    .text-muted { color: var(--text-muted); }
    .text-nowrap { white-space: nowrap; }
    .pagination-bar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; justify-content: center; }
    .page-info { color: var(--text-muted); font-size: 0.875rem; }
    .button.small { padding: 0.25rem 0.6rem; font-size: 0.8rem; }
    .button[disabled] { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class TestSuitesListPageComponent implements OnInit {
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
