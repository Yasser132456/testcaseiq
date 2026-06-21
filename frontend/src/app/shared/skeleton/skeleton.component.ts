import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skel-wrap" role="status" aria-label="Loading">
      @for (_ of rowArr(); track $index) {
        <div class="skel-row">
          @for (__ of colArr(); track $index) {
            <div class="skel-cell"><div class="skel-shimmer"></div></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes skel-sweep {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skel-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.25rem 0;
    }

    .skel-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      height: 48px;
      padding: 0 0.85rem;
      border-bottom: 1px solid var(--color-border);
    }

    .skel-cell { flex: 1; min-width: 0; }

    .skel-shimmer {
      height: 0.9rem;
      border-radius: 4px;
      background: linear-gradient(
        90deg,
        var(--color-surface-1) 25%,
        var(--color-surface-2) 50%,
        var(--color-surface-1) 75%
      );
      background-size: 400% 100%;
      animation: skel-sweep 1.6s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .skel-shimmer {
        background: var(--color-surface-2);
        animation: none;
      }
    }
  `]
})
export class SkeletonComponent {
  readonly rows = input(5);
  readonly cols = input(3);

  readonly rowArr = computed(() => Array.from({ length: this.rows() }));
  readonly colArr = computed(() => Array.from({ length: this.cols() }));
}
