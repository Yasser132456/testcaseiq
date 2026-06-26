import { Component, EventEmitter, Output, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideDynamicIcon],
  template: `
    <div class="empty-state">
      @if (showArt()) {
        <div class="es-art" aria-hidden="true">
          <div class="es-ring es-ring-1"></div>
          <div class="es-ring es-ring-2"></div>
          <div class="es-ring es-ring-3"></div>
          <div class="es-dot es-dot-a"></div>
          <div class="es-dot es-dot-b"></div>
          <div class="es-dot es-dot-c"></div>
        </div>
      }
      <span class="empty-icon" aria-hidden="true">
        <svg [lucideIcon]="$any(icon())" [size]="36" [strokeWidth]="1.5"></svg>
      </span>
      <h3 class="empty-title">{{ title() }}</h3>
      <p class="empty-message">{{ message() }}</p>
      @if (actionLabel()) {
        <button class="button secondary" type="button" (click)="actionClick.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 3rem 2rem;
      text-align: center;
    }

    .empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-3);
    }

    .empty-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .empty-message {
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-2);
      max-width: 42ch;
      line-height: 1.6;
    }

    .es-art {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 1.25rem;
    }

    .es-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 1px solid var(--glass-border-hi);
    }

    .es-ring-2 {
      inset: 10px;
      border-color: var(--glass-border);
      opacity: 0.6;
    }

    .es-ring-3 {
      inset: 22px;
      border-color: var(--color-accent-border);
      opacity: 0.4;
    }

    .es-dot {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .es-dot-a {
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-accent);
      box-shadow: 0 0 8px var(--color-accent-glow);
    }

    .es-dot-b {
      bottom: 14px;
      left: 14px;
      background: var(--color-cyan);
      box-shadow: 0 0 6px var(--color-cyan-bg);
    }

    .es-dot-c {
      bottom: 14px;
      right: 14px;
      background: var(--color-purple);
      box-shadow: 0 0 6px var(--color-purple-bg);
    }

    @media (prefers-reduced-motion: no-preference) {
      .es-ring { animation: es-spin 12s linear infinite; }
      .es-ring-2 { animation: es-spin 18s linear infinite reverse; }
      .es-ring-3 { animation: none; }
    }

    @keyframes es-spin { to { transform: rotate(360deg); } }
  `]
})
export class EmptyStateComponent {
  readonly icon = input.required<unknown>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input<string>();
  readonly showArt = input(false);

  @Output() readonly actionClick = new EventEmitter<void>();
}
