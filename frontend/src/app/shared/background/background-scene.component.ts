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
import { MotionService } from '../../core/motion/motion.service';
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
      [class.is-motion-paused]="!motion.documentVisible()"
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
      animation: none;
      transform-origin: center;
    }

    .background-scene.is-motion-paused::after {
      animation-play-state: paused;
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
  readonly motion = inject(MotionService);
  readonly scene = inject(BackgroundSceneService);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  readonly mode = input<BackgroundSceneRenderMode>('ambient');
  readonly renderMode = signal<BackgroundSceneMode>('fallback');
  private bootController?: AbortController;
  private bootTimeoutId = 0;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    afterNextRender(() => {
      void this.boot();
    });
  }

  ngOnDestroy(): void {
    this.bootController?.abort();
    this.bootController = undefined;
    this.clearBootTimeout();
    this.scene.dispose();
  }

  private async boot(): Promise<void> {
    const controller = new AbortController();
    this.bootController = controller;
    const timeout = new Promise<BackgroundSceneMode>((resolve) => {
      this.bootTimeoutId = window.setTimeout(() => {
        this.bootTimeoutId = 0;
        controller.abort();
        this.scene.dispose();
        resolve('fallback');
      }, 8000);
    });

    try {
      const result = await Promise.race([
        this.scene.init(this.stage().nativeElement, controller.signal, this.mode()),
        timeout
      ]);
      if (!controller.signal.aborted) {
        this.renderMode.set(result);
      }
    } catch {
      if (!controller.signal.aborted) {
        this.scene.dispose();
        this.renderMode.set('fallback');
      }
    } finally {
      if (this.bootController === controller) {
        this.bootController = undefined;
      }
      this.clearBootTimeout();
      document.documentElement.classList.add('app-boot-ready');
    }
  }

  private clearBootTimeout(): void {
    if (this.bootTimeoutId) {
      window.clearTimeout(this.bootTimeoutId);
      this.bootTimeoutId = 0;
    }
  }
}
