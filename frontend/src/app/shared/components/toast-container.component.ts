import { Component, effect, inject } from '@angular/core';
import { gsap } from 'gsap';
import { LucideAlertCircle, LucideCheckCircle2, LucideInfo, LucideDynamicIcon, LucideTriangleAlert } from '@lucide/angular';
import { ToastItem, ToastService, ToastType } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [LucideDynamicIcon],
  template: `
    <section class="toast-container" aria-live="polite" aria-label="Notifications">
      @for (toast of toastService.toasts(); track toast.id) {
        <article
          class="toast glass-surface glass-surface--3 glass-surface--flat glass-scrim glass-scrim--3"
          [class.toast--success]="toast.type === 'success'"
          [class.toast--error]="toast.type === 'error'"
          [class.toast--warning]="toast.type === 'warning'"
          [class.toast--info]="toast.type === 'info'"
          [attr.data-toast-id]="toast.id"
        >
          <svg [lucideIcon]="icon(toast.type)" [size]="16" [strokeWidth]="2" aria-hidden="true"></svg>
          <span>{{ toast.message }}</span>
        </article>
      }
    </section>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: var(--z-toast);
      display: grid;
      gap: var(--space-sm);
      width: min(24rem, calc(100vw - 48px));
      pointer-events: none;
    }

    .toast {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-base);
      border: 1px solid var(--glass-edge-strong);
      border-radius: var(--radius-xl);
      background: var(--glass-bg-3);
      backdrop-filter: var(--glass-blur-md);
      -webkit-backdrop-filter: var(--glass-blur-md);
      color: var(--color-text);
      font-size: 0.875rem;
      line-height: 1.45;
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
      box-shadow: var(--glass-shadow);
    }

    .toast--success {
      border-color: var(--color-green-border);
      background: linear-gradient(var(--color-green-bg), var(--color-green-bg)), var(--glass-bg-3);
      box-shadow: var(--glass-border-highlight), var(--glass-shadow);
    }
    .toast--error {
      border-color: var(--color-red-border);
      background: linear-gradient(var(--color-red-bg), var(--color-red-bg)), var(--glass-bg-3);
      box-shadow: var(--glass-border-highlight), var(--glass-shadow);
    }
    .toast--warning {
      border-color: var(--color-amber-border);
      background: linear-gradient(var(--color-amber-bg), var(--color-amber-bg)), var(--glass-bg-3);
    }
    .toast--info {
      border-color: var(--color-purple-border);
      background: linear-gradient(var(--color-purple-bg), var(--color-purple-bg)), var(--glass-bg-3);
    }
    .toast--success svg { color: var(--color-accent); }
    .toast--error svg { color: var(--color-red); }
    .toast--warning svg { color: var(--color-amber); }
    .toast--info svg { color: var(--color-accent); }

    @supports not (backdrop-filter: blur(1px)) {
      .toast { background: var(--glass-bg-3); }
    }
  `]
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
  private readonly animatedIn = new Set<number>();
  private readonly animatedOut = new Set<number>();

  constructor() {
    effect(() => {
      for (const toast of this.toastService.toasts()) {
        if (toast.exiting) {
          this.animateOut(toast);
        } else {
          this.animateIn(toast);
        }
      }
    });
  }

  icon(type: ToastType) {
    if (type === 'success') return LucideCheckCircle2;
    if (type === 'error') return LucideAlertCircle;
    if (type === 'warning') return LucideTriangleAlert;
    return LucideInfo;
  }

  private animateIn(toast: ToastItem): void {
    if (this.animatedIn.has(toast.id) || this.prefersReducedMotion()) {
      this.animatedIn.add(toast.id);
      return;
    }
    this.animatedIn.add(toast.id);
    queueMicrotask(() => {
      const el = this.toastElement(toast.id);
      if (el) {
        gsap.fromTo(el, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' });
      }
    });
  }

  private animateOut(toast: ToastItem): void {
    if (this.animatedOut.has(toast.id)) {
      return;
    }
    this.animatedOut.add(toast.id);
    queueMicrotask(() => {
      const el = this.toastElement(toast.id);
      if (!el || this.prefersReducedMotion()) {
        this.toastService.remove(toast.id);
        return;
      }
      gsap.to(el, {
        y: 8,
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => this.toastService.remove(toast.id)
      });
    });
  }

  private toastElement(id: number): HTMLElement | null {
    return document.querySelector(`[data-toast-id="${id}"]`);
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
