import { Component, computed, input } from '@angular/core';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'danger'
  | 'analysis' | 'generate' | 'approve' | 'clarify';

export type ButtonState = 'default' | 'loading' | 'error' | 'success';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [class]="cls()"
      [disabled]="isDisabled()"
      [type]="type()"
      [attr.aria-busy]="loading() ? 'true' : null"
    >
      @if (loading()) {
        <span class="btn-loading-skeleton" aria-hidden="true"></span>
      } @else if (state() === 'success') {
        <svg class="btn-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" width="14" height="14">
          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      } @else if (state() === 'error') {
        <svg class="btn-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" width="14" height="14">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      }
      <ng-content />
    </button>
  `,
  styles: [`
    @keyframes btn-skeleton-sweep {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    :host { display: inline-flex; }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 2.5rem;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: var(--glass-border-highlight);
      transition:
        background var(--dur) var(--ease),
        border-color var(--dur) var(--ease),
        color var(--dur) var(--ease),
        transform var(--dur) var(--ease),
        box-shadow  var(--dur) var(--ease);
    }

    button:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
      /* intentionally no transition — ring must be instant */
    }

    button:active:not(:disabled) { transform: scale(0.97); }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── Variants ── */

    .btn--primary {
      background: var(--color-accent);
      color: var(--color-bg);
    }
    .btn--primary:hover:not(:disabled) {
      box-shadow: 0 4px 14px var(--color-accent-glow);
    }

    .btn--secondary {
      background: var(--glass-bg-2);
      color: var(--color-text);
      border-color: var(--glass-edge-strong);
      backdrop-filter: var(--glass-blur-sm);
      -webkit-backdrop-filter: var(--glass-blur-sm);
    }
    .btn--secondary:hover:not(:disabled) {
      background: var(--glass-bg-3);
      box-shadow: var(--glass-border-highlight), 0 0 0 3px var(--color-secondary-glow);
    }
    .btn--secondary:focus-visible {
      outline-color: var(--color-text);
    }

    .btn--danger {
      background: var(--color-red-bg);
      color: var(--color-red);
      border-color: var(--color-red-border);
    }
    .btn--danger:hover:not(:disabled) {
      box-shadow: 0 4px 12px var(--color-danger-glow);
    }
    .btn--danger:focus-visible {
      outline-color: var(--color-red);
    }

    .btn--analysis {
      background: var(--color-purple-bg);
      color: var(--color-purple);
      border-color: var(--color-purple-border);
    }
    .btn--analysis:hover:not(:disabled) {
      box-shadow: 0 4px 14px var(--color-analysis-glow);
    }
    .btn--analysis:focus-visible {
      outline-color: var(--color-purple);
    }

    .btn--generate {
      background: var(--color-cyan-bg);
      color: var(--color-cyan);
      border-color: var(--color-cyan-border);
    }
    .btn--generate:hover:not(:disabled) {
      box-shadow: 0 4px 14px var(--color-generate-glow);
    }
    .btn--generate:focus-visible {
      outline-color: var(--color-cyan);
    }

    .btn--approve {
      background: var(--color-green-bg);
      color: var(--color-green);
      border-color: var(--color-green-border);
    }
    .btn--approve:hover:not(:disabled) {
      box-shadow: 0 4px 12px var(--color-approve-glow);
    }
    .btn--approve:focus-visible {
      outline-color: var(--color-green);
    }

    .btn--clarify {
      background: var(--color-amber-bg);
      color: var(--color-amber);
      border-color: var(--color-amber-border);
    }
    .btn--clarify:hover:not(:disabled) {
      box-shadow: 0 4px 14px var(--color-clarify-glow);
    }
    .btn--clarify:focus-visible {
      outline-color: var(--color-amber);
    }

    /* ── Transient states (override variant) ── */

    .btn--loading {
      cursor: progress;
    }

    .btn--error {
      background: var(--color-red-bg);
      color: var(--color-red);
      border-color: var(--color-red-border);
    }

    .btn--success {
      background: var(--color-green-bg);
      color: var(--color-green);
      border-color: var(--color-green-border);
    }

    /* ── Spinner ── */

    .btn-loading-skeleton {
      width: 2.4rem;
      height: 0.65rem;
      border-radius: 9999px;
      background: linear-gradient(90deg, currentColor 25%, color-mix(in srgb, currentColor 45%, transparent) 50%, currentColor 75%);
      background-size: 200% 100%;
      opacity: 0.45;
      animation: btn-skeleton-sweep 1.2s ease-in-out infinite;
    }

    .btn-icon { flex-shrink: 0; }

    @media (prefers-reduced-motion: reduce) {
      .btn-loading-skeleton {
        animation: none;
      }
    }
  `]
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly state = input<ButtonState>('default');
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  readonly isDisabled = computed(() => this.disabled() || this.loading());

  readonly cls = computed(() => {
    const parts = ['btn', 'glass-surface', 'glass-surface--interactive', `btn--${this.variant()}`];
    if (this.loading()) {
      parts.push('btn--loading');
    } else if (this.state() !== 'default') {
      parts.push(`btn--${this.state()}`);
    }
    return parts.join(' ');
  });
}
