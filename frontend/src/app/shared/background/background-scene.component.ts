import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { BackgroundSceneMode, BackgroundSceneRenderMode, BackgroundSceneService } from './background-scene.service';

/*
 * Performance budget: target 60fps on desktop-class hardware with static CSS fallback.
 * Max particles: 700 saturated token-derived points. DPR cap: 1.5 to protect GPU fill rate.
 * Boot ceiling: 8s hard timeout; reveal app with static CSS gradient if WebGL is unavailable or late.
 * Teardown: dispose renderer, geometry, material, resize observer, pointer listeners, and RAF on destroy.
 */
@Component({
  selector: 'app-background-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #stage
      class="background-scene"
      data-testid="background-scene"
      [style.--scene-accent-particle]="scene.sceneAccent().cssColor"
      [class.is-fallback]="renderMode() === 'fallback'"
      [class.is-static]="renderMode() === 'static'"
      [class.is-welcome]="mode() === 'welcome'"
      aria-hidden="true"
    ></div>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      background:
        radial-gradient(ellipse 58% 38% at 18% 12%, color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 13%, transparent), transparent 62%),
        radial-gradient(ellipse 46% 34% at 86% 78%, color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 10%, transparent), transparent 68%),
        linear-gradient(135deg, var(--color-bg), oklch(10% 0.018 215));
    }

    .background-scene {
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity var(--dur-slow) var(--ease);
    }

    .background-scene:not(.is-fallback),
    .background-scene.is-static,
    .background-scene.is-fallback {
      opacity: 1;
    }

    .background-scene :where(canvas) {
      display: block;
      width: 100%;
      height: 100%;
    }

    .background-scene.is-fallback::before,
    .background-scene.is-static::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 18% 16%, color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 12%, transparent) 0 1px, transparent 2px),
        radial-gradient(circle at 74% 68%, color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 12%, transparent) 0 1px, transparent 2px),
        radial-gradient(circle at 52% 34%, color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 10%, transparent) 0 1px, transparent 2px);
      background-size: 132px 132px, 180px 180px, 240px 240px;
      opacity: 0.6;
    }

    .background-scene.is-welcome.is-fallback::after,
    .background-scene.is-welcome.is-static::after {
      content: '';
      position: absolute;
      inset: -20%;
      background:
        conic-gradient(
          from 0deg at 50% 50%,
          color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 0%, transparent),
          color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 18%, transparent),
          color-mix(in oklch, var(--color-cyan-particle) 12%, transparent),
          color-mix(in oklch, var(--color-violet-particle) 12%, transparent),
          color-mix(in oklch, var(--scene-accent-particle, var(--color-phosphor-particle)) 0%, transparent)
        );
      opacity: 0.42;
      animation: welcome-conic 18s linear infinite;
      transform-origin: center;
    }

    @keyframes welcome-conic {
      to { transform: rotate(1turn); }
    }

    @media (prefers-reduced-motion: reduce) {
      .background-scene {
        transition: none;
      }

      .background-scene.is-welcome::after {
        animation: none;
      }
    }
  `]
})
export class BackgroundSceneComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  readonly scene = inject(BackgroundSceneService);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  readonly mode = input<BackgroundSceneRenderMode>('ambient');
  readonly renderMode = signal<BackgroundSceneMode>('fallback');

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    afterNextRender(() => {
      void this.boot();
    });
  }

  ngOnDestroy(): void {
    this.scene.dispose();
  }

  private async boot(): Promise<void> {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      new URLSearchParams(window.location.search).get('bg') === 'reduced-motion';
    const controller = new AbortController();
    let timeoutId = 0;
    const timeout = new Promise<BackgroundSceneMode>((resolve) => {
      timeoutId = window.setTimeout(() => {
        controller.abort();
        this.scene.dispose();
        resolve('fallback');
      }, 8000);
    });

    try {
      const result = await Promise.race([
        this.scene.init(this.stage().nativeElement, prefersReducedMotion, controller.signal, this.mode()),
        timeout
      ]);
      this.renderMode.set(result);
    } catch {
      this.scene.dispose();
      this.renderMode.set('fallback');
    } finally {
      window.clearTimeout(timeoutId);
      document.documentElement.classList.add('app-boot-ready');
    }
  }
}
