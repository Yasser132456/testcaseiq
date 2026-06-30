import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDownload, LucideDynamicIcon } from '@lucide/angular';
import VanillaTilt, { HTMLVanillaTiltElement, TiltOptions } from 'vanilla-tilt';
import { ExportFormat, ExportService } from '../../core/services/export.service';
import { TestSuitePage, TestSuiteSummary } from '../../core/models/test-suite.model';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { ToastService } from '../../core/services/toast.service';
import { TableStaggerDirective } from '../../shared/directives/table-stagger.directive';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface ExportOption {
  format: ExportFormat;
  label: string;
  badge: string;
  description: string;
  cardClass?: string;
}

const TILT_OPTIONS: TiltOptions = { max: 4, speed: 400, glare: true, 'max-glare': 0.05 };

@Component({
  selector: 'app-export-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    LucideDynamicIcon,
    SkeletonComponent,
    EmptyStateComponent,
    TableStaggerDirective
  ],
  template: `
    <section class="page-stack export-hub">
      <div class="section-header export-header">
        <div>
          <h2>Export Hub</h2>
          <p class="section-subtitle">Approved suites ready for downstream QA handoff.</p>
        </div>
        <span class="header-icon" aria-hidden="true">
          <svg [lucideIcon]="LucideDownload" [size]="22" [strokeWidth]="1.8"></svg>
        </span>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="5" [cols]="6" />
      } @else if (loadError()) {
        <div class="export-error" role="alert">{{ loadError() }}</div>
      } @else if (approvedSuites().length === 0) {
        <div class="panel">
          <app-empty-state
            [icon]="LucideDownload"
            title="Nothing export-ready"
            message="Approve test cases in the Review Board to unlock export."
          />
        </div>
      } @else {
        <div class="panel table-panel">
          <table class="data-table" tableStagger>
            <thead>
              <tr>
                <th>Suite name</th>
                <th>Project</th>
                <th>Story</th>
                <th>Approved cases</th>
                <th>Layer</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (suite of approvedSuites(); track suite.id) {
                <tr
                  class="selectable-row"
                  [class.is-selected]="selectedSuiteId() === suite.id"
                  (click)="selectSuite(suite)"
                >
                  <td>
                    <div class="row-inner suite-name">{{ suite.name }}</div>
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
                      <a [routerLink]="['/stories', suite.storyId]" class="row-link" (click)="$event.stopPropagation()">
                        {{ suite.storyTitle }}
                      </a>
                    </div>
                  </td>
                  <td>
                    <div class="row-inner approved-count">{{ suite.approvedCases }} / {{ suite.totalCases }}</div>
                  </td>
                  <td>
                    <div class="row-inner">
                      @if (suite.testLayer) {
                        <span class="layer-badge">{{ suite.testLayer }}</span>
                      } @else {
                        <span class="td-muted">Not set</span>
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
            Page {{ (page()?.number ?? 0) + 1 }} of {{ visibleTotalPages() }}
            &nbsp;({{ page()?.totalElements ?? 0 }} suites)
          </span>
          <button class="button secondary small" type="button"
            [disabled]="page()?.last"
            (click)="goToPage(currentPage() + 1)">Next</button>
        </div>

        <section class="export-panel hub-export-panel">
          <div class="export-copy">
            <h4>Export approved cases</h4>
            <p>{{ selectedSuiteLabel() }}</p>
          </div>
          <div class="export-action-grid">
            @for (option of exportOptions; track option.format) {
              <button
                class="export-card"
                [class.playwright-card]="option.cardClass === 'playwright-card'"
                [class.postman-card]="option.cardClass === 'postman-card'"
                [class.xray-card]="option.cardClass === 'xray-card'"
                [class.azure-card]="option.cardClass === 'azure-card'"
                type="button"
                (click)="exportSelectedSuite(option.format)"
                [disabled]="isExporting()"
              >
                <span>{{ option.badge }}</span>
                <strong>{{ exportingFormat() === option.format ? 'Exporting...' : option.label }}</strong>
                <small>{{ option.description }}</small>
              </button>
            }
          </div>
        </section>

        @if (lastExportedFormat()) {
          <section class="export-success-panel" aria-live="polite">
            <div>
              <strong>
                {{ lastExportedSuiteName() }} exported as {{ exportLabel(lastExportedFormat()!) }}
              </strong>
              @if (lastExportedAt()) {
                <span>&mdash; {{ lastExportedAt() | date:'medium' }}</span>
              }
            </div>
            <div class="export-success-actions">
              <button class="success-link" type="button" (click)="resetLastExport()">Export another</button>
              <a class="success-link" routerLink="/review-board">&larr; Back to Review Board</a>
            </div>
          </section>
        }
      }
    </section>
  `,
  styles: [`
    .export-hub {
      gap: 1rem;
    }

    .section-subtitle {
      margin: 0.25rem 0 0;
      color: var(--color-text-2);
      font-size: 0.875rem;
    }

    .export-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .header-icon {
      display: grid;
      width: 2.35rem;
      height: 2.35rem;
      place-items: center;
      border: 1px solid var(--color-cyan-border);
      border-radius: 8px;
      background: var(--color-cyan-bg);
      color: var(--color-cyan);
      flex: 0 0 auto;
    }

    .table-panel {
      overflow-x: auto;
    }

    .selectable-row {
      cursor: pointer;
    }

    .selectable-row.is-selected {
      background: var(--color-accent-bg);
    }

    .selectable-row.is-selected .suite-name {
      color: var(--color-accent);
    }

    .suite-name {
      font-weight: 600;
      transition: color var(--dur) var(--ease);
    }

    .row-link {
      color: var(--color-text-2);
      text-decoration: none;
      transition: color var(--dur) var(--ease);
    }

    .row-link:hover {
      color: var(--color-accent);
    }

    .approved-count {
      color: var(--color-green);
      font-family: var(--font-mono);
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .layer-badge {
      padding: 0.15rem 0.45rem;
      border: 1px solid var(--glass-border);
      border-radius: 4px;
      background: var(--glass-1);
      color: var(--color-text-2);
      font-family: var(--font-mono);
      font-size: 0.72rem;
    }

    .td-muted {
      color: var(--color-text-2);
      white-space: nowrap;
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 0.25rem 0 0.5rem;
    }

    .page-info {
      color: var(--color-text-2);
      font-size: 0.875rem;
    }

    .hub-export-panel {
      grid-template-columns: minmax(14rem, 0.8fr) minmax(0, 2fr);
    }

    .export-error {
      padding: 0.85rem 1rem;
      border: 1px solid var(--color-red-border);
      border-radius: 8px;
      background: var(--color-red-bg);
      color: var(--color-red);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .export-success-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--color-green-border);
      border-left: 4px solid var(--color-green);
      border-radius: 8px;
      background: var(--color-green-bg);
      color: var(--color-text);
      font-size: 0.9rem;
    }

    .export-success-panel strong {
      color: var(--color-green);
      font-weight: 700;
    }

    .export-success-panel span {
      color: var(--color-text-2);
      margin-left: 0.35rem;
    }

    .export-success-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      flex: 0 0 auto;
    }

    .success-link {
      border: 0;
      background: transparent;
      color: var(--color-green);
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
    }

    .success-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 900px) {
      .hub-export-panel {
        grid-template-columns: 1fr;
      }

      .pagination-bar {
        flex-wrap: wrap;
      }

      .export-success-panel {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `]
})
export class ExportPageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly LucideDownload = LucideDownload;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly testSuiteService = inject(TestSuiteService);
  private readonly exportService = inject(ExportService);
  private readonly toastService = inject(ToastService);
  private tiltElements: HTMLVanillaTiltElement[] = [];

  readonly page = signal<TestSuitePage | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly currentPage = signal(0);
  readonly selectedSuiteId = signal<string | null>(null);
  readonly exportingFormat = signal<ExportFormat | null>(null);
  readonly lastExportedFormat = signal<ExportFormat | null>(null);
  readonly lastExportedSuiteName = signal<string | null>(null);
  readonly lastExportedAt = signal<Date | null>(null);

  readonly approvedSuites = computed(() => this.page()?.content ?? []);
  readonly selectedSuite = computed(() => (
    this.approvedSuites().find((suite) => suite.id === this.selectedSuiteId()) ?? this.approvedSuites()[0] ?? null
  ));
  readonly selectedSuiteLabel = computed(() => {
    const suite = this.selectedSuite();
    if (!suite) return 'Select an approved suite to export.';
    return `${suite.name} / ${suite.approvedCases} approved cases`;
  });
  readonly visibleTotalPages = computed(() => Math.max(this.page()?.totalPages ?? 1, 1));
  readonly isExporting = computed(() => this.exportingFormat() !== null);

  readonly exportOptions: ExportOption[] = [
    {
      format: 'playwright',
      label: 'Playwright',
      badge: 'TS',
      description: 'Draft automation skeleton',
      cardClass: 'playwright-card'
    },
    {
      format: 'postman',
      label: 'Postman',
      badge: 'API',
      description: 'Approved API-oriented test cases only',
      cardClass: 'postman-card'
    },
    {
      format: 'xray-csv',
      label: 'Xray',
      badge: 'XRAY',
      description: 'Jira/Xray import mapping CSV',
      cardClass: 'xray-card'
    },
    {
      format: 'azure-devops-csv',
      label: 'Azure DevOps',
      badge: 'ADO',
      description: 'Azure import mapping CSV',
      cardClass: 'azure-card'
    },
    {
      format: 'csv',
      label: 'CSV',
      badge: 'CSV',
      description: 'Spreadsheet-ready test case table'
    }
  ];

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.initTilt();
  }

  ngOnDestroy(): void {
    this.destroyTilt();
  }

  selectSuite(suite: TestSuiteSummary): void {
    this.selectedSuiteId.set(suite.id);
  }

  goToPage(pageNum: number): void {
    this.currentPage.set(pageNum);
    this.load();
  }

  resetLastExport(): void {
    this.lastExportedFormat.set(null);
    this.lastExportedSuiteName.set(null);
    this.lastExportedAt.set(null);
  }

  exportSelectedSuite(format: ExportFormat): void {
    const suite = this.selectedSuite();
    if (!suite || this.isExporting()) {
      return;
    }

    this.exportingFormat.set(format);
    this.exportService.exportApprovedTestCases(suite.storyId, format).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.toastService.show('The export completed without a downloadable file.', 'warning');
          this.exportingFormat.set(null);
          return;
        }
        const fallbackName = this.fallbackExportFilename(suite.storyId, format);
        const filename = this.exportFilename(response.headers.get('Content-Disposition'), fallbackName);
        this.downloadBlob(blob, filename);
        this.lastExportedFormat.set(format);
        this.lastExportedSuiteName.set(suite.name);
        this.lastExportedAt.set(new Date());
        this.selectedSuiteId.set(null);
        this.toastService.show(`${this.exportLabel(format)} export download started.`, 'success');
        this.exportingFormat.set(null);
      },
      error: () => {
        this.toastService.show(
          `The ${this.exportLabel(format)} export could not be downloaded. Confirm the backend is running and try again.`,
          'error'
        );
        this.exportingFormat.set(null);
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.testSuiteService.listSuites({ approvedOnly: true }, this.currentPage()).subscribe({
      next: (p) => {
        this.page.set(p);
        const selectedStillVisible = p.content.some((suite) => suite.id === this.selectedSuiteId());
        this.selectedSuiteId.set(selectedStillVisible ? this.selectedSuiteId() : p.content[0]?.id ?? null);
        this.loading.set(false);
        queueMicrotask(() => this.initTilt());
      },
      error: () => {
        this.loadError.set('Unable to load approved test suites. Confirm the backend is running.');
        this.loading.set(false);
      }
    });
  }

  private fallbackExportFilename(storyId: string, format: ExportFormat): string {
    if (format === 'playwright') {
      return `story-${storyId}-approved-tests.spec.ts`;
    }
    if (format === 'postman') {
      return `story-${storyId}-approved-api-tests.postman_collection.json`;
    }
    if (format === 'xray-csv') {
      return `story-${storyId}-approved-tests-xray.csv`;
    }
    if (format === 'azure-devops-csv') {
      return `story-${storyId}-approved-tests-azure-devops.csv`;
    }
    const extension = format === 'markdown' ? 'md' : format;
    return `story-${storyId}-approved-test-cases.${extension}`;
  }

  private exportFilename(contentDisposition: string | null, fallbackName: string): string {
    if (!contentDisposition) {
      return fallbackName;
    }
    const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (encodedMatch?.[1]) {
      try {
        return decodeURIComponent(encodedMatch[1].trim());
      } catch {
        return fallbackName;
      }
    }
    const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
    if (quotedMatch?.[1]) {
      return quotedMatch[1].trim();
    }
    const plainMatch = /filename=([^;]+)/i.exec(contentDisposition);
    return plainMatch?.[1]?.trim() || fallbackName;
  }

  exportLabel(format: ExportFormat): string {
    return this.exportOptions.find((option) => option.format === format)?.label ?? format.toUpperCase();
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  private initTilt(): void {
    if (this.prefersReducedMotion()) return;
    this.destroyTilt();
    const cards = Array.from((this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.export-card'));
    if (cards.length === 0) return;
    VanillaTilt.init(cards, TILT_OPTIONS);
    this.tiltElements = cards as HTMLVanillaTiltElement[];
  }

  private destroyTilt(): void {
    this.tiltElements.forEach((el) => el.vanillaTilt?.destroy());
    this.tiltElements = [];
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
