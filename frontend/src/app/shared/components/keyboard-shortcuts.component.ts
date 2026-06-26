import { Component, ElementRef, HostListener, Injector, ViewChild, afterNextRender, inject, signal } from '@angular/core';
import { gsap } from 'gsap';
import { LucideDynamicIcon, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-keyboard-shortcuts',
  standalone: true,
  imports: [LucideDynamicIcon],
  template: `
    @if (show()) {
      <div class="ks-backdrop" (click)="close()" aria-hidden="true"></div>
      <div #panel class="ks-panel" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div class="ks-header">
          <h3>Keyboard Shortcuts</h3>
          <button class="ks-close" (click)="close()" type="button" aria-label="Close">
            <svg [lucideIcon]="LucideX" [size]="14" aria-hidden="true"></svg>
          </button>
        </div>
        <div class="ks-body">
          <div class="ks-group">
            <div class="ks-group-label">Navigation</div>
            <div class="ks-row"><span>Go to Dashboard</span><span class="ks-keys"><kbd>G</kbd><kbd>D</kbd></span></div>
            <div class="ks-row"><span>Go to Stories</span><span class="ks-keys"><kbd>G</kbd><kbd>S</kbd></span></div>
            <div class="ks-row"><span>Go to Projects</span><span class="ks-keys"><kbd>G</kbd><kbd>P</kbd></span></div>
          </div>
          <div class="ks-group">
            <div class="ks-group-label">Global</div>
            <div class="ks-row"><span>Open search</span><span class="ks-keys"><kbd>Ctrl</kbd><kbd>K</kbd></span></div>
            <div class="ks-row"><span>Show shortcuts</span><span class="ks-keys"><kbd>?</kbd></span></div>
            <div class="ks-row"><span>Close / dismiss</span><span class="ks-keys"><kbd>Esc</kbd></span></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed; inset: 0; z-index: var(--z-modal);
      display: grid; place-items: center; padding: 1rem;
      pointer-events: none;
    }
    .ks-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
      pointer-events: auto;
    }
    .ks-panel {
      position: relative; z-index: 1;
      width: min(32rem, 100%);
      border: 1px solid var(--glass-border-hi);
      border-radius: var(--radius-xl);
      background: var(--glass-3);
      backdrop-filter: var(--glass-blur-lg); -webkit-backdrop-filter: var(--glass-blur-lg);
      box-shadow: var(--glass-shadow);
      overflow: hidden;
      pointer-events: auto;
    }
    .ks-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--glass-border);
    }
    .ks-header h3 { margin: 0; font-size: 0.95rem; }
    .ks-close {
      display: grid; width: 2rem; height: 2rem; place-items: center;
      border: 1px solid var(--glass-border); border-radius: var(--radius-md);
      background: var(--glass-1); color: var(--color-text-2); cursor: pointer;
      transition: background var(--dur) var(--ease);
    }
    .ks-close:hover { background: var(--glass-2); color: var(--color-text); }
    .ks-close:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .ks-body { display: grid; gap: 1.25rem; padding: 1.25rem; }
    .ks-group { display: grid; gap: 0.35rem; }
    .ks-group-label {
      font-family: var(--font-mono); font-size: 0.62rem; font-weight: 700;
      letter-spacing: 0.08em; color: var(--color-text-3); padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--glass-border);
    }
    .ks-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; padding: 0.4rem 0; font-size: 0.875rem; color: var(--color-text-2);
    }
    .ks-keys { display: flex; gap: 0.3rem; }
    kbd {
      min-width: 1.55rem;
      padding: 0.12rem 0.38rem;
      border: 1px solid var(--glass-border-hi);
      border-radius: var(--radius-xs);
      background: var(--glass-1);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      text-align: center;
    }
    @supports not (backdrop-filter: blur(1px)) {
      .ks-panel { background: var(--color-surface-2); }
    }
  `]
})
export class KeyboardShortcutsComponent {
  private readonly injector = inject(Injector);

  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;

  readonly LucideX = LucideX;
  readonly show = signal(false);

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.show()) {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== '?' || this.isFormField(event.target) || this.isFormField(document.activeElement)) return;
    event.preventDefault();
    this.open();
  }

  close(): void {
    this.show.set(false);
  }

  private open(): void {
    if (this.show()) return;
    this.show.set(true);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    afterNextRender(() => {
      const panel = this.panel?.nativeElement;
      if (!panel) return;
      gsap.fromTo(panel, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out', clearProps: 'all' });
    }, { injector: this.injector });
  }

  private isFormField(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement;
  }
}
