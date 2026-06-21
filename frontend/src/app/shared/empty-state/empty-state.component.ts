import { Component, EventEmitter, Output, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <lucide-angular [img]="$any(icon())" [size]="36" [strokeWidth]="1.5" />
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
  `]
})
export class EmptyStateComponent {
  readonly icon = input.required<unknown>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input<string>();

  @Output() readonly actionClick = new EventEmitter<void>();
}
