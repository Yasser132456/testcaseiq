import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, Check, Clock, X, Pencil, Download } from 'lucide-angular';

export type BadgeStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'NEEDS_CLARIFICATION' | 'REJECTED' | 'DRAFT' | 'EXPORTED';

const ICON_MAP = {
  APPROVED:     Check,
  NEEDS_REVIEW: Clock,
  NEEDS_CLARIFICATION: Clock,
  REJECTED:     X,
  DRAFT:        Pencil,
  EXPORTED:     Download,
} as const;

const LABEL_MAP: Record<BadgeStatus, string> = {
  APPROVED:     'Approved',
  NEEDS_REVIEW: 'Needs Review',
  NEEDS_CLARIFICATION: 'Needs Clarification',
  REJECTED:     'Rejected',
  DRAFT:        'Draft',
  EXPORTED:     'Exported',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <span [class]="cls()">
      <lucide-angular [img]="icon()" [size]="12" [strokeWidth]="2" aria-hidden="true" />
      {{ label() }}
    </span>
  `,
  styles: [`
    :host { display: inline-flex; }

    span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 1.65rem;
      padding: 0 0.55rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
    }

    .badge--approved {
      background: var(--color-green-bg);
      border-color: var(--color-green-border);
      color: var(--color-green);
    }

    .badge--needs-review {
      background: var(--color-amber-bg);
      border-color: var(--color-amber-border);
      color: var(--color-amber);
    }

    .badge--needs-clarification {
      background: var(--color-amber-bg);
      border-color: var(--color-amber-border);
      color: var(--color-amber);
    }

    .badge--rejected {
      background: var(--color-red-bg);
      border-color: var(--color-red-border);
      color: var(--color-red);
    }

    .badge--draft {
      background: var(--color-purple-bg);
      border-color: var(--color-purple-border);
      color: var(--color-purple);
    }

    .badge--exported {
      background: var(--color-cyan-bg);
      border-color: var(--color-cyan-border);
      color: var(--color-cyan);
    }
  `]
})
export class BadgeComponent {
  readonly status = input.required<BadgeStatus>();

  readonly icon = computed(() => ICON_MAP[this.status()]);
  readonly label = computed(() => LABEL_MAP[this.status()]);
  readonly cls = computed(() => `badge--${this.status().toLowerCase().replaceAll('_', '-')}`);
}
