import { Component, ElementRef, HostListener, OnChanges, OnDestroy, output, input, inject, signal } from '@angular/core';
import { gsap } from 'gsap';
import { LucideX, LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [LucideDynamicIcon],
  template: `
    @if (isVisible()) {
      <div class="drawer-backdrop" aria-hidden="true" (click)="requestClose()"></div>
      <aside class="drawer-panel" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <header class="drawer-header">
          <h3>{{ title() }}</h3>
          <button class="drawer-close" type="button" (click)="requestClose()" aria-label="Close drawer">
            <svg [lucideIcon]="LucideX" [size]="16" [strokeWidth]="2" aria-hidden="true"></svg>
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
      border-left: 1px solid var(--glass-border-hi);
      background: var(--glass-2);
      backdrop-filter: var(--glass-blur-lg);
      -webkit-backdrop-filter: var(--glass-blur-lg);
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

    @supports not (backdrop-filter: blur(1px)) {
      .drawer-panel { background: var(--color-surface-1); }
    }
  `]
})
export class DrawerComponent implements OnChanges, OnDestroy {
  readonly LucideX = LucideX;
  readonly open = input(false);
  readonly title = input('');
  readonly closed = output<void>();
  readonly closing = signal(false);
  readonly isVisible = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private closeTimer?: ReturnType<typeof setTimeout>;
  private returnFocusTarget: HTMLElement | null = null;

  ngOnChanges(): void {
    if (this.open()) {
      this.show();
    } else if (this.isVisible() && !this.closing()) {
      this.beginClose(false);
    }
  }

  ngOnDestroy(): void {
    this.clearCloseTimer();
  }

  requestClose(): void {
    this.beginClose(true);
  }

  private show(): void {
    this.clearCloseTimer();
    this.returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.closing.set(false);
    this.isVisible.set(true);

    queueMicrotask(() => {
      const drawer = this.host.nativeElement.querySelector('.drawer-panel');
      this.focusInitialElement();
      if (drawer && !this.prefersReducedMotion()) {
        gsap.from(drawer, { x: 480, duration: 0.3, ease: 'power2.out' });
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.isVisible() && event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
    }
  }

  private beginClose(emitClosed: boolean): void {
    if (!this.isVisible() || this.closing()) {
      return;
    }

    this.closing.set(true);
    const drawer = this.host.nativeElement.querySelector('.drawer-panel');

    if (drawer && !this.prefersReducedMotion()) {
      gsap.to(drawer, { x: 480, duration: 0.25, ease: 'power2.in' });
      this.closeTimer = setTimeout(() => this.finishClose(emitClosed), 250);
      return;
    }

    this.finishClose(emitClosed);
  }

  private finishClose(emitClosed: boolean): void {
    this.clearCloseTimer();
    this.isVisible.set(false);
    this.closing.set(false);
    this.restoreFocus();
    if (emitClosed) {
      this.closed.emit();
    }
  }

  private focusInitialElement(): void {
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]';
    const bodyTarget = this.host.nativeElement.querySelector(`.drawer-body ${focusableSelector}`) as HTMLElement | null;
    const fallback = this.host.nativeElement.querySelector('.drawer-close') as HTMLElement | null;
    (bodyTarget ?? fallback)?.focus({ preventScroll: true });
  }

  private restoreFocus(): void {
    this.returnFocusTarget?.focus({ preventScroll: true });
    this.returnFocusTarget = null;
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
