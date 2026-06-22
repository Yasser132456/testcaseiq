import { Component, effect, inject } from '@angular/core';
import { gsap } from 'gsap';
import { AlertCircle, CheckCircle2, Info, LucideAngularModule, TriangleAlert } from 'lucide-angular';
import { ToastItem, ToastService, ToastType } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <section class="toast-container" aria-live="polite" aria-label="Notifications">
      @for (toast of toastService.toasts(); track toast.id) {
        <article
          class="toast"
          [class.toast--success]="toast.type === 'success'"
          [class.toast--error]="toast.type === 'error'"
          [class.toast--warning]="toast.type === 'warning'"
          [class.toast--info]="toast.type === 'info'"
          [attr.data-toast-id]="toast.id"
        >
          <lucide-angular [img]="icon(toast.type)" [size]="16" [strokeWidth]="2" aria-hidden="true" />
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
      border: 1px solid var(--color-border);
      border-top-width: 2px;
      border-radius: calc(var(--radius-md) + 2px);
      background: var(--color-surface-2);
      color: var(--color-text);
      font-size: 0.875rem;
      line-height: 1.45;
      pointer-events: auto;
    }

    .toast--success { border-top-color: var(--color-green); }
    .toast--error { border-top-color: var(--color-red); }
    .toast--warning { border-top-color: var(--color-amber); }
    .toast--info { border-top-color: var(--color-accent); }
    .toast--success lucide-angular { color: var(--color-green); }
    .toast--error lucide-angular { color: var(--color-red); }
    .toast--warning lucide-angular { color: var(--color-amber); }
    .toast--info lucide-angular { color: var(--color-accent); }
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
    if (type === 'success') return CheckCircle2;
    if (type === 'error') return AlertCircle;
    if (type === 'warning') return TriangleAlert;
    return Info;
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
        gsap.from(el, { y: 16, opacity: 0, duration: 0.22, ease: 'power2.out' });
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
