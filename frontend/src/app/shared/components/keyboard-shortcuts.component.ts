import { Component, HostListener, signal } from '@angular/core';
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
            <div class="ks-row"><span>Go to Dashboard</span><span class="ks-keys"><kbd class="ks-keycap">G</kbd><kbd class="ks-keycap">D</kbd></span></div>
            <div class="ks-row"><span>Go to Stories</span><span class="ks-keys"><kbd class="ks-keycap">G</kbd><kbd class="ks-keycap">S</kbd></span></div>
            <div class="ks-row"><span>Go to Projects</span><span class="ks-keys"><kbd class="ks-keycap">G</kbd><kbd class="ks-keycap">P</kbd></span></div>
          </div>
          <div class="ks-group">
            <div class="ks-group-label">Global</div>
            <div class="ks-row"><span>Open search</span><span class="ks-keys"><kbd class="ks-keycap">Ctrl</kbd><kbd class="ks-keycap">K</kbd></span></div>
            <div class="ks-row"><span>Show shortcuts</span><span class="ks-keys"><kbd class="ks-keycap">?</kbd></span></div>
            <div class="ks-row"><span>Close / dismiss</span><span class="ks-keys"><kbd class="ks-keycap">Esc</kbd></span></div>
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
      --tcq-overlay-blur: 8px;
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(var(--tcq-overlay-blur)); -webkit-backdrop-filter: blur(var(--tcq-overlay-blur));
      pointer-events: auto;
      animation: tcq-overlay-backdrop-enter 240ms var(--ease-out-expo) both;
    }
    .ks-panel {
      position: relative; z-index: 1;
      width: min(32rem, 100%);
      border: 1px solid var(--glass-edge-strong);
      border-radius: var(--radius-xl);
      background: var(--glass-bg-3);
      backdrop-filter: var(--glass-blur-lg); -webkit-backdrop-filter: var(--glass-blur-lg);
      box-shadow: var(--glass-shadow);
      overflow: hidden;
      pointer-events: auto;
      animation: tcq-overlay-enter 240ms var(--ease-out-expo) both;
      transform-origin: 50% 18%;
    }
    .ks-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--glass-edge);
    }
    .ks-header h3 { margin: 0; font-size: 0.95rem; }
    .ks-close {
      display: grid; width: 2rem; height: 2rem; place-items: center;
      border: 1px solid var(--glass-edge); border-radius: var(--radius-md);
      background: var(--glass-bg-1); color: var(--color-text-2); cursor: pointer;
      transition: background var(--dur) var(--ease);
    }
    .ks-close:hover { background: var(--glass-bg-2); color: var(--color-text); }
    .ks-close:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .ks-body { display: grid; gap: 1.25rem; padding: 1.25rem; }
    .ks-group { display: grid; gap: 0.35rem; }
    .ks-group-label {
      font-family: var(--font-mono); font-size: 0.62rem; font-weight: 700;
      letter-spacing: 0.08em; color: var(--color-text-3); padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--glass-edge);
    }
    .ks-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; padding: 0.4rem 0; font-size: 0.875rem; color: var(--color-text-2);
    }
    .ks-keys { display: flex; gap: 0.3rem; }
    .ks-keycap {
      position: relative;
      min-width: 1.55rem;
      padding: 0.16rem 0.42rem 0.2rem;
      border: 1px solid var(--glass-edge-strong);
      border-radius: var(--radius-xs);
      background: linear-gradient(180deg, rgba(255,255,255,0.075), var(--glass-bg-1));
      color: var(--color-text);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.13),
        0 2px 0 rgba(0,0,0,0.68),
        0 3px 8px rgba(0,0,0,0.28);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      text-align: center;
      transform: translateY(0);
      transition: transform var(--dur-micro) var(--ease-out-expo), box-shadow var(--dur-micro) var(--ease);
      user-select: none;
    }
    .ks-keycap:active {
      transform: translateY(1px);
      box-shadow:
        inset 0 1px 2px rgba(0,0,0,0.45),
        0 1px 0 rgba(0,0,0,0.7);
    }
    @supports not (backdrop-filter: blur(1px)) {
      .ks-panel { background: var(--glass-bg-2); }
    }
    @media (prefers-reduced-motion: reduce) {
      .ks-backdrop,
      .ks-panel {
        animation: none;
      }
      .ks-keycap,
      .ks-keycap:active {
        transition: none;
        transform: none;
      }
    }
  `]
})
export class KeyboardShortcutsComponent {
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
  }

  private isFormField(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement;
  }
}
