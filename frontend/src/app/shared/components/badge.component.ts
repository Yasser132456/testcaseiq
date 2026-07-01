import { Component, OnChanges, OnDestroy, SimpleChanges, computed, input, signal } from '@angular/core';
import { LucideDynamicIcon, LucideCheck, LucideClock, LucideX, LucidePencil, LucideDownload } from '@lucide/angular';

export type BadgeStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'NEEDS_CLARIFICATION' | 'REJECTED' | 'DRAFT' | 'EXPORTED';

const ICON_MAP = {
  APPROVED:     LucideCheck,
  NEEDS_REVIEW: LucideClock,
  NEEDS_CLARIFICATION: LucideClock,
  REJECTED:     LucideX,
  DRAFT:        LucidePencil,
  EXPORTED:     LucideDownload,
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
  imports: [LucideDynamicIcon],
  template: `
    <span [class]="cls()" [class.is-flipping]="flipping()">
      <svg [lucideIcon]="icon()" [size]="12" [strokeWidth]="2" aria-hidden="true"></svg>
      {{ label() }}
    </span>
  `,
  styles: [`
    :host { display: inline-block; perspective: 200px; }

    span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 1.65rem;
      padding: 0 0.55rem;
      border: 1px solid var(--glass-edge);
      border-radius: var(--radius-sm);
      background: var(--glass-bg-1);
      backdrop-filter: var(--glass-blur-sm);
      -webkit-backdrop-filter: var(--glass-blur-sm);
      box-shadow: var(--glass-border-highlight);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1;
    }

    @media (prefers-reduced-motion: no-preference) {
      @keyframes badge-flip {
        0%   { transform: rotateY(0deg); }
        45%  { transform: rotateY(90deg); }
        55%  { transform: rotateY(90deg); }
        100% { transform: rotateY(0deg); }
      }

      .is-flipping {
        animation: badge-flip 0.35s ease;
      }
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
export class BadgeComponent implements OnChanges, OnDestroy {
  readonly status = input.required<BadgeStatus>();
  readonly flipping = signal(false);
  private flipTimer: ReturnType<typeof setTimeout> | null = null;

  readonly icon = computed(() => ICON_MAP[this.status()]);
  readonly label = computed(() => LABEL_MAP[this.status()]);
  readonly cls = computed(() => `glass-surface glass-surface--flat badge--${this.status().toLowerCase().replaceAll('_', '-')}`);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['status'] || changes['status'].firstChange || this.prefersReducedMotion()) {
      return;
    }
    if (this.flipTimer) {
      clearTimeout(this.flipTimer);
    }
    this.flipping.set(true);
    this.flipTimer = setTimeout(() => this.flipping.set(false), 350);
  }

  ngOnDestroy(): void {
    if (this.flipTimer) {
      clearTimeout(this.flipTimer);
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
