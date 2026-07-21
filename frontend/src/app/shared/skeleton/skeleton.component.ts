import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skel-wrap glass-surface glass-surface--1 glass-surface--flat" role="status" aria-label="Loading">
      @for (_ of rowArr(); track $index) {
        <div class="skel-row">
          @for (__ of colArr(); track $index) {
            <div class="skel-cell"><div class="skel-shimmer tcq-skeleton-shimmer"></div></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .skel-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0.25rem 0;
      border: 1px solid var(--glass-edge);
      border-radius: var(--radius-lg);
      background: var(--glass-bg-1);
      backdrop-filter: var(--glass-blur-sm);
      -webkit-backdrop-filter: var(--glass-blur-sm);
      overflow: hidden;
    }

    .skel-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      height: 48px;
      padding: 0 0.85rem;
      border-bottom: 1px solid var(--glass-edge);
    }

    .skel-cell { flex: 1; min-width: 0; }

    .skel-shimmer {
      height: 0.9rem;
      border-radius: 4px;
    }
  `]
})
export class SkeletonComponent {
  readonly rows = input(5);
  readonly cols = input(3);

  readonly rowArr = computed(() => Array.from({ length: this.rows() }));
  readonly colArr = computed(() => Array.from({ length: this.cols() }));
}
