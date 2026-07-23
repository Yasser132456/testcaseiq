import { Component, input, output } from '@angular/core';
import { CoverageGap, CoverageReportResponse, RequirementCoverage } from '../../core/models/coverage.model';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

@Component({
  selector: 'app-story-coverage-matrix',
  standalone: true,
  imports: [StateMessageComponent, SkeletonComponent],
  styles: [`
    .coverage-matrix-panel,
    .coverage-gap-callout {
      display: grid;
      gap: var(--space-base);
    }

    .coverage-summary-row,
    .coverage-case-cell {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
    }

    .coverage-table {
      display: grid;
      overflow: hidden;
      border: 1px solid var(--glass-edge);
      border-radius: var(--radius-md);
    }

    .coverage-table-row {
      display: grid;
      grid-template-columns: minmax(12rem, 1fr) minmax(5rem, 0.25fr) minmax(12rem, 1.2fr);
      gap: var(--space-sm);
      align-items: center;
      padding: var(--space-sm) var(--space-base);
      border-bottom: 1px solid var(--glass-edge);
    }

    .coverage-table-row:last-child {
      border-bottom: 0;
    }

    .coverage-table-header {
      background: var(--glass-bg-2);
      color: var(--color-text-2);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .coverage-table-row.is-uncovered {
      background: color-mix(in srgb, var(--color-amber-bg) 70%, transparent);
    }

    .coverage-requirement-cell {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
    }

    .coverage-requirement-cell strong {
      color: var(--color-text);
    }

    .coverage-requirement-cell span {
      color: var(--color-text-2);
      line-height: 1.45;
    }

    .coverage-gap-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--space-base);
      align-items: center;
      padding: var(--space-base);
      border: 1px solid var(--color-amber-border);
      border-radius: var(--radius-md);
      background: var(--color-amber-bg);
    }

    .coverage-gap-row p {
      margin: var(--space-xs) 0 0;
      color: var(--color-text);
      line-height: 1.45;
    }

    @media (max-width: 900px) {
      .coverage-table-row,
      .coverage-gap-row {
        grid-template-columns: 1fr;
      }
    }
  `],
  template: `
    <section class="panel coverage-matrix-panel">
      <div class="section-header">
        <div>
          <h3>Requirement coverage</h3>
          @if (report()) {
            <span class="muted-text">{{ report()!.coveredCount }} of {{ report()!.totalRequirements }} requirements covered</span>
          }
        </div>
      </div>

      @if (loading()) {
        <app-skeleton [rows]="3" [cols]="3" />
      } @else if (error()) {
        <app-state-message title="Coverage unavailable" [message]="error()" tone="error" />
      } @else if (!report() || report()!.requirements.length === 0) {
        <app-state-message title="No requirements to trace yet" message="Run story analysis to extract requirements before reviewing coverage." />
      } @else {
        <div class="coverage-summary-row">
          <span class="badge cyan-badge">{{ report()!.coveredCount }} covered</span>
          <span class="badge amber-badge">{{ report()!.totalRequirements - report()!.coveredCount }} uncovered</span>
          <span class="badge status-badge">{{ report()!.gaps.length }} gaps</span>
        </div>

        <div class="coverage-table" role="table" aria-label="Requirement to test case traceability">
          <div class="coverage-table-row coverage-table-header" role="row">
            <span role="columnheader">Requirement</span>
            <span role="columnheader">Risk</span>
            <span role="columnheader">Linked cases</span>
          </div>
          @for (requirement of report()!.requirements; track requirement.reference || requirement.title) {
            <div class="coverage-table-row" role="row" [class.is-uncovered]="!requirement.covered">
              <div class="coverage-requirement-cell" role="cell">
                <strong>{{ requirement.reference || 'Unreferenced' }}</strong>
                <span>{{ requirement.title }}</span>
              </div>
              <span class="badge" [class.amber-badge]="isHighRisk(requirement)" role="cell">{{ requirement.riskLevel || 'UNSET' }}</span>
              <div class="coverage-case-cell" role="cell">
                @if (requirement.linkedCases.length > 0) {
                  @for (linkedCase of requirement.linkedCases; track linkedCase.id) {
                    <span class="badge cyan-badge">{{ linkedCase.title }} · {{ formatLabel(linkedCase.status) }}</span>
                  }
                } @else {
                  <span class="muted-text">No linked cases</span>
                }
              </div>
            </div>
          }
        </div>

        @if (report()!.gaps.length > 0) {
          <section class="coverage-gap-callout">
            <div class="section-header">
              <div>
                <h4>Coverage gaps</h4>
                <span class="muted-text">Use targeted generation to close a specific requirement or category.</span>
              </div>
            </div>
            <div class="list-stack compact">
              @for (gap of report()!.gaps; track gap.kind + gap.key + gap.description) {
                <article class="coverage-gap-row">
                  <div>
                    <div class="badge-row">
                      <span class="badge amber-badge">{{ gap.riskLevel || 'UNSET' }}</span>
                      <span class="badge status-badge">{{ gap.kind }}</span>
                      <span class="badge cyan-badge">{{ gap.key }}</span>
                    </div>
                    <p>{{ gap.description }}</p>
                  </div>
                  @if (canEdit()) {
                    <button class="button small coverage-gap-action" type="button" (click)="requestTargetedCase(gap)">
                      Generate targeted case
                    </button>
                  }
                </article>
              }
            </div>
          </section>
        } @else {
          <app-state-message title="No coverage gaps" message="Every extracted requirement has at least one linked test case." tone="success" />
        }
      }
    </section>
  `
})
export class StoryCoverageMatrixComponent {
  readonly report = input<CoverageReportResponse | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly canEdit = input(true);
  readonly generateTargetedCase = output<string>();

  requestTargetedCase(gap: CoverageGap): void {
    const subject = gap.kind === 'REQUIREMENT' ? `requirement ${gap.key}` : `coverage category ${gap.key}`;
    this.generateTargetedCase.emit(`Cover ${subject}: ${gap.description}`);
  }

  isHighRisk(requirement: RequirementCoverage): boolean {
    return requirement.riskLevel === 'HIGH' || requirement.riskLevel === 'CRITICAL';
  }

  formatLabel(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
