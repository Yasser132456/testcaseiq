import { Component } from '@angular/core';
import { TiltDirective } from '../../shared/directives/tilt.directive';

@Component({
  selector: 'app-glass-primitives-demo',
  standalone: true,
  imports: [TiltDirective],
  template: `
    <section class="demo-shell" aria-labelledby="glass-demo-title">
      <header class="demo-header">
        <div>
          <p class="demo-label mono">DEV HARNESS</p>
          <h1 id="glass-demo-title">Glass primitives</h1>
          <p>
            Token-backed glass surfaces, readable scrims, and pointer-only tilt for Black Glass Instrument v2.
          </p>
        </div>
        <a class="demo-link" href="/">Return to product</a>
      </header>

      <div class="level-grid" aria-label="Glass surface levels">
        <article class="glass-surface glass-surface--1 level-panel" tabindex="0">
          <span class="mono">LEVEL 1</span>
          <h2>Frosted shell</h2>
          <p>Workspace containers and persistent chrome. Lower blur keeps the instrument background present.</p>
          <button class="state-chip" type="button">Focusable action</button>
        </article>

        <article
          class="glass-surface glass-surface--2 glass-surface--interactive level-panel"
          tabindex="0"
          glassTilt
          [glassTiltGlare]="true"
          data-testid="tilt-card"
        >
          <span class="mono">LEVEL 2 + TILT</span>
          <h2>Instrument glass</h2>
          <p>Move a fine pointer across this panel. Touch and reduced motion stay flat.</p>
          <div class="signal-row" aria-label="Workflow signals">
            <span class="signal signal--analysis">Analysis</span>
            <span class="signal signal--generate">Generate</span>
            <span class="signal signal--approve">Approved</span>
          </div>
        </article>

        <article class="glass-surface glass-surface--3 level-panel" tabindex="0">
          <span class="mono">LEVEL 3</span>
          <h2>Command glass</h2>
          <p>More opaque and more blurred for overlays, command surfaces, and focused interruptions.</p>
          <button class="state-chip state-chip--disabled" type="button" disabled>Disabled state</button>
        </article>
      </div>

      <section class="glass-surface glass-surface--2 scrim-demo" aria-labelledby="scrim-demo-title">
        <div>
          <p class="demo-label mono">23B SCRIM</p>
          <h2 id="scrim-demo-title">Body-safe tertiary copy</h2>
          <p class="tertiary-copy">
            Without a local scrim, tertiary text falls below the 4.5:1 body-copy floor on translucent glass.
          </p>
        </div>
        <div class="glass-readable-scrim glass-scrim--2 scrim-sample">
          <span class="mono">SCRIM APPLIED</span>
          <p>
            This sample applies the level-two scrim utility behind the text while preserving the glass edge.
          </p>
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      color: var(--color-text);
    }

    .demo-shell {
      display: grid;
      gap: var(--space-2xl);
      width: min(1180px, calc(100% - 2rem));
      margin: 0 auto;
      padding: clamp(2rem, 6vw, 4rem) 0;
    }

    .demo-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: var(--space-xl);
    }

    .demo-header h1,
    .demo-header p {
      margin: 0;
    }

    .demo-header h1 {
      margin-top: 0.35rem;
      font-size: 2rem;
      line-height: 1.05;
      letter-spacing: 0;
    }

    .demo-header p:not(.demo-label) {
      max-width: 62ch;
      margin-top: 0.7rem;
      color: var(--color-text-2);
      line-height: 1.65;
    }

    .demo-label {
      margin: 0;
      color: var(--color-cyan);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .demo-link,
    .state-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.25rem;
      padding: 0 0.8rem;
      border: 1px solid var(--color-accent-border);
      border-radius: var(--radius-md);
      background: var(--color-accent-bg);
      color: var(--color-accent);
      font-size: 0.8rem;
      font-weight: 700;
      transition:
        background var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease),
        transform var(--dur) var(--ease);
    }

    .demo-link:hover,
    .state-chip:hover:not(:disabled) {
      box-shadow: 0 4px 14px var(--color-accent-glow);
      transform: translateY(-1px);
    }

    .state-chip:focus-visible,
    .demo-link:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .state-chip--disabled,
    .state-chip:disabled {
      border-color: var(--color-border-subtle);
      background: rgba(255, 255, 255, 0.035);
      color: var(--color-text-3);
      cursor: not-allowed;
      opacity: 0.62;
    }

    .level-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-base);
      perspective: var(--perspective);
    }

    .level-panel {
      display: grid;
      align-content: start;
      gap: var(--space-md);
      min-height: 18rem;
      padding: var(--space-xl);
    }

    .level-panel > span {
      color: var(--color-text-3);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .level-panel h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .level-panel p {
      margin: 0;
      color: var(--color-text-2);
      line-height: 1.65;
    }

    .signal-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs);
      margin-top: auto;
    }

    .signal {
      display: inline-flex;
      min-height: 1.7rem;
      align-items: center;
      padding: 0 0.55rem;
      border: 1px solid;
      border-radius: var(--radius-sm);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .signal--analysis {
      border-color: var(--color-purple-border);
      background: var(--color-purple-bg);
      color: var(--color-purple);
    }

    .signal--generate {
      border-color: var(--color-cyan-border);
      background: var(--color-cyan-bg);
      color: var(--color-cyan);
    }

    .signal--approve {
      border-color: var(--color-green-border);
      background: var(--color-green-bg);
      color: var(--color-green);
    }

    .scrim-demo {
      display: grid;
      grid-template-columns: minmax(0, 0.8fr) minmax(18rem, 1fr);
      gap: var(--space-xl);
      align-items: stretch;
      padding: var(--space-xl);
    }

    .scrim-demo h2,
    .scrim-demo p {
      margin: 0;
    }

    .scrim-demo h2 {
      margin-top: 0.35rem;
      font-size: 1.15rem;
    }

    .tertiary-copy {
      max-width: 58ch;
      margin-top: 0.65rem;
      color: var(--color-text-3);
      line-height: 1.7;
    }

    .scrim-sample {
      display: grid;
      gap: 0.65rem;
      align-content: center;
      min-height: 9rem;
      padding: var(--space-lg);
      border: 1px solid var(--glass-edge-strong);
      border-radius: var(--radius-md);
      color: var(--color-text-3);
    }

    .scrim-sample span {
      color: var(--color-accent);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .scrim-sample p {
      color: var(--color-text-3);
      line-height: 1.7;
    }

    @media (max-width: 900px) {
      .demo-header,
      .scrim-demo {
        display: grid;
      }

      .level-grid,
      .scrim-demo {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GlassPrimitivesDemoComponent {}
