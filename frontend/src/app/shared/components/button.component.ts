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
      <span class="btn-stack">
        <span class="btn-content">
          @if (state() === 'success') {
            <svg class="btn-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          } @else if (state() === 'error') {
            <svg class="btn-icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          }
          <ng-content />
        </span>
        <span class="btn-pending" aria-hidden="true">
          <span class="btn-pending-dot"></span>
          <span class="btn-pending-dot"></span>
          <span class="btn-pending-dot"></span>
        </span>
      </span>
    </button>
  `,
  styles: [`
    @keyframes btn-dot-shimmer {
      0%, 70%, 100% { opacity: 0.24; transform: translateY(0) scale(0.82); }
      35% { opacity: 1; transform: translateY(-1px) scale(1); }
    }

    :host { display: inline-flex; }

    button {
      --btn-glow-duration: var(--dur);
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
        box-shadow var(--btn-glow-duration) var(--ease);
    }

    button::after {
      content: '';
      position: absolute;
      inset: 1px;
      z-index: 2;
      border: 1px solid color-mix(in srgb, currentColor 48%, transparent);
      border-radius: calc(var(--radius-md) - 1px);
      opacity: 0;
      pointer-events: none;
      transition: inset var(--dur-micro) var(--ease-out-expo), opacity var(--dur-micro) var(--ease);
    }

    button:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
      /* intentionally no transition — ring must be instant */
    }

    button:active:not(:disabled) { transform: scale(0.97); }
    button.btn--primary:active:not(:disabled)::after,
    button.btn--secondary:active:not(:disabled)::after,
    button.btn--danger:active:not(:disabled)::after {
      inset: 2px;
      opacity: 0.9;
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── Variants ── */

    .btn--primary {
      --btn-glow-duration: 180ms;
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

    .btn-stack {
      display: inline-grid;
      align-items: center;
      justify-items: center;
    }

    .btn-content,
    .btn-pending {
      grid-area: 1 / 1;
      transition: opacity var(--dur) var(--ease);
    }

    .btn-content {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      opacity: 1;
    }

    .btn-pending {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      opacity: 0;
      color: var(--color-phosphor);
    }

    .btn--loading .btn-content { opacity: 0; }
    .btn--loading .btn-pending { opacity: 1; }

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

    .btn-pending-dot {
      width: 0.34rem;
      height: 0.34rem;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px var(--color-phosphor-glow);
      animation: btn-dot-shimmer 900ms var(--ease-in-out) infinite;
    }

    .btn-pending-dot:nth-child(2) { animation-delay: 100ms; }
    .btn-pending-dot:nth-child(3) { animation-delay: 200ms; }

    .btn-icon { flex-shrink: 0; }

    @media (prefers-reduced-motion: reduce) {
      button,
      button::after,
      .btn-content,
      .btn-pending {
        transition: none;
      }

      .btn-pending-dot {
        animation: none;
        opacity: 0.78;
        transform: none;
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
