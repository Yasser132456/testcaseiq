import { Component, ElementRef, HostListener, OnChanges, output, input, inject } from '@angular/core';
import { gsap } from 'gsap';
import { X, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (open()) {
      <div class="drawer-backdrop" aria-hidden="true" (click)="closed.emit()"></div>
      <aside class="drawer-panel" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <header class="drawer-header">
          <h3>{{ title() }}</h3>
          <button class="drawer-close" type="button" (click)="closed.emit()" aria-label="Close drawer">
            <lucide-angular [img]="X" [size]="16" [strokeWidth]="2" aria-hidden="true" />
          </button>
        </header>
        <div class="drawer-body">
          <ng-content />
        </div>
      </aside>
    }
  `,
  styles: [`
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-drawer-backdrop);
      background: rgba(0, 0, 0, 0.52);
    }

    .drawer-panel {
      position: fixed;
      top: 0;
      right: 0;
      z-index: var(--z-drawer);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      width: min(480px, 100vw);
      height: 100dvh;
      border-left: 1px solid var(--color-border);
      background: var(--color-surface-1);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-base);
      padding: var(--space-lg);
      border-bottom: 1px solid var(--color-border);
    }

    .drawer-header h3 {
      margin: 0;
      font-size: 1rem;
    }

    .drawer-body {
      overflow: auto;
      padding: var(--space-lg);
    }

    .drawer-close {
      display: grid;
      width: 2.25rem;
      height: 2.25rem;
      place-items: center;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-2);
      color: var(--color-text-2);
      cursor: pointer;
      transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
    }

    .drawer-close:hover:not(:disabled) {
      color: var(--color-text);
      background: var(--color-secondary-hover);
    }

    .drawer-close:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .drawer-close:active:not(:disabled) {
      transform: scale(0.97);
    }

    .drawer-close:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .drawer-close[aria-busy="true"],
    .drawer-close.loading {
      opacity: 0.7;
      cursor: progress;
    }

    .drawer-close.error {
      border-color: var(--color-red-border);
      color: var(--color-red);
      background: var(--color-red-bg);
    }

    .drawer-close.success {
      border-color: var(--color-green-border);
      color: var(--color-green);
      background: var(--color-green-bg);
    }
  `]
})
export class DrawerComponent implements OnChanges {
  readonly X = X;
  readonly open = input(false);
  readonly title = input('');
  readonly closed = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);

  ngOnChanges(): void {
    if (!this.open() || this.prefersReducedMotion()) {
      return;
    }
    queueMicrotask(() => {
      const drawer = this.host.nativeElement.querySelector('.drawer-panel');
      if (drawer) {
        gsap.from(drawer, { x: 480, duration: 0.3, ease: 'power2.out' });
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.open() && event.key === 'Escape') {
      this.closed.emit();
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
