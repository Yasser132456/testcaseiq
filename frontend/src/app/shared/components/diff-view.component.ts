import { Component, computed, input } from '@angular/core';

export interface DiffSnapshot {
  title?: string | null;
  description?: string | null;
  expectedResult?: string | null;
  steps?: DiffStep[] | null;
}

export interface DiffStep {
  order: number;
  action: string;
  expectedResult?: string | null;
}

interface DiffRow {
  label: string;
  before: string;
  after: string;
  state: 'added' | 'removed' | 'changed';
}

@Component({
  selector: 'app-diff-view',
  standalone: true,
  template: `
    @if (rows().length > 0) {
      <div class="diff-view" aria-label="Regeneration diff">
        @for (row of rows(); track row.label) {
          <div class="diff-row" [class.diff-added]="row.state === 'added'" [class.diff-removed]="row.state === 'removed'" [class.diff-changed]="row.state === 'changed'">
            <span class="diff-label">{{ row.label }}</span>
            <div class="diff-values">
              @if (row.before) { <p class="diff-before">{{ row.before }}</p> }
              @if (row.after) { <p class="diff-after">{{ row.after }}</p> }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .diff-view{display:grid;gap:.5rem;margin-top:.6rem}
    .diff-row{display:grid;gap:.35rem;padding:.65rem;border:1px solid var(--color-border-subtle);border-radius:8px;background:var(--glass-bg-1)}
    .diff-label{color:var(--color-text-2);font-family:var(--font-mono);font-size:.72rem;font-weight:700}
    .diff-values{display:grid;gap:.35rem}
    .diff-before,.diff-after{margin:0;overflow-wrap:anywhere;line-height:1.45}
    .diff-before{color:var(--color-red);text-decoration:line-through;text-decoration-thickness:1px}
    .diff-after{color:var(--color-green)}
    .diff-added{border-color:var(--color-green-border);background:var(--color-green-bg)}
    .diff-removed{border-color:var(--color-red-border);background:var(--color-red-bg)}
    .diff-changed{border-color:var(--color-amber-border);background:var(--color-amber-bg)}
  `]
})
export class DiffViewComponent {
  readonly before = input<DiffSnapshot | null>(null);
  readonly after = input<DiffSnapshot | null>(null);

  readonly rows = computed<DiffRow[]>(() => [
    ...this.textRows(),
    ...this.stepRows()
  ]);

  private textRows(): DiffRow[] {
    const before = this.before();
    const after = this.after();
    return [
      this.changedTextRow('Title', before?.title, after?.title),
      this.changedTextRow('Description', before?.description, after?.description),
      this.changedTextRow('Expected result', before?.expectedResult, after?.expectedResult)
    ].filter((row): row is DiffRow => row !== null);
  }

  private stepRows(): DiffRow[] {
    const beforeSteps = new Map((this.before()?.steps ?? []).map((step) => [step.order, step]));
    const afterSteps = new Map((this.after()?.steps ?? []).map((step) => [step.order, step]));
    return Array.from(new Set([...beforeSteps.keys(), ...afterSteps.keys()]))
      .sort((left, right) => left - right)
      .map((order) => {
        const before = beforeSteps.get(order);
        const after = afterSteps.get(order);
        if (!before && after) {
          return { label: `Step ${order}`, before: '', after: this.formatStep(after), state: 'added' as const };
        }
        if (before && !after) {
          return { label: `Step ${order}`, before: this.formatStep(before), after: '', state: 'removed' as const };
        }
        if (before && after && this.formatStep(before) !== this.formatStep(after)) {
          return { label: `Step ${order}`, before: this.formatStep(before), after: this.formatStep(after), state: 'changed' as const };
        }
        return null;
      })
      .filter((row): row is DiffRow => row !== null);
  }

  private changedTextRow(label: string, beforeValue: string | null | undefined, afterValue: string | null | undefined): DiffRow | null {
    const before = beforeValue ?? '';
    const after = afterValue ?? '';
    if (before === after) return null;
    return {
      label,
      before,
      after,
      state: !before ? 'added' : !after ? 'removed' : 'changed'
    };
  }

  private formatStep(step: DiffStep): string {
    return `${step.action}${step.expectedResult ? ` -> ${step.expectedResult}` : ''}`;
  }
}
