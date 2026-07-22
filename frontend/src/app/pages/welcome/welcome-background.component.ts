import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EffectRef,
  ElementRef,
  Injector,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  viewChild
} from '@angular/core';
import { MotionQualityTier, MotionService } from '../../core/motion/motion.service';

interface GridDot {
  x: number;
  y: number;
  influence: number;
  baseColor: string;
}

interface ParticlePalette {
  phosphor: string;
  cyan: string;
  violet: string;
}

interface MotionPolicy {
  tier: MotionQualityTier;
  motionEnabled: boolean;
  cursorEnabled: boolean;
  documentVisible: boolean;
  reducedMotion: boolean;
  forcedFallback: boolean;
}

const GRID_SPACING = 32;
const CURSOR_RADIUS = 156;
const MAX_FRAME_DELTA_SECONDS = 0.05;
const PARTICLE_FALLBACKS: ParticlePalette = {
  phosphor: '#a8ff60',
  cyan: '#65e7ff',
  violet: '#bd8cff'
};

@Component({
  selector: 'app-welcome-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #canvas
      data-testid="welcome-background-canvas"
      aria-hidden="true"
    ></canvas>
  `,
  styles: [`
    :host {
      pointer-events: none;
    }

    canvas {
      position: fixed;
      inset: 0;
      z-index: 0;
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background:
        radial-gradient(ellipse 42% 58% at 24% 43%, color-mix(in oklch, var(--color-bg) 94%, transparent) 0 38%, transparent 76%),
        radial-gradient(circle at 18% 20%, color-mix(in oklch, var(--color-cyan-particle) 7%, transparent), transparent 34%),
        radial-gradient(circle at 82% 68%, color-mix(in oklch, var(--color-violet-particle) 8%, transparent), transparent 38%),
        linear-gradient(145deg, var(--color-bg), oklch(11% 0.018 220));
    }
  `]
})
export class WelcomeBackgroundComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly motion = inject(MotionService);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly browserWindow = this.document.defaultView;

  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private policyEffect?: EffectRef;
  private dots: GridDot[] = [];
  private palette: ParticlePalette = PARTICLE_FALLBACKS;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private animationFrameId = 0;
  private lastFrameTime = 0;
  private shouldAnimate = false;
  private pointerListenersAttached = false;
  private destroyed = false;
  private readonly pointer = { x: 0, y: 0, active: false };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
    this.pointer.active = true;
  };

  private readonly onPointerLeave = (): void => {
    this.pointer.active = false;
  };

  private readonly onWindowResize = (): void => {
    this.resizeCanvas();
  };

  private readonly animate = (timestamp: number): void => {
    this.animationFrameId = 0;
    if (this.destroyed || !this.shouldAnimate) {
      return;
    }

    const elapsed = this.lastFrameTime === 0
      ? 1 / 60
      : Math.min((timestamp - this.lastFrameTime) / 1000, MAX_FRAME_DELTA_SECONDS);
    this.lastFrameTime = timestamp;
    this.updateInfluence(elapsed);
    this.drawFrame();
    this.animationFrameId = this.browserWindow?.requestAnimationFrame(this.animate) ?? 0;
  };

  constructor() {
    if (!isPlatformBrowser(this.platformId) || !this.browserWindow) {
      return;
    }

    afterNextRender(() => {
      if (this.destroyed) {
        return;
      }
      this.zone.runOutsideAngular(() => {
        try {
          this.setup();
        } finally {
          this.document.documentElement.classList.add('app-boot-ready');
        }
      });
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.policyEffect?.destroy();
    this.policyEffect = undefined;
    this.stopAnimation();
    this.detachPointerListeners();
    this.browserWindow?.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.dots = [];
    this.context = undefined;
    this.canvas = undefined;
  }

  private setup(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    this.canvas = canvas;
    this.context = context;
    this.palette = this.readPalette();
    this.resizeCanvas();

    this.resizeObserver = new this.browserWindow!.ResizeObserver(() => {
      this.zone.runOutsideAngular(() => this.resizeCanvas());
    });
    this.resizeObserver.observe(this.document.documentElement);
    this.browserWindow!.addEventListener('resize', this.onWindowResize, { passive: true });

    this.policyEffect = effect(() => {
      this.reconcilePolicy({
        tier: this.motion.qualityTier(),
        motionEnabled: this.motion.motionEnabled(),
        cursorEnabled: this.motion.cursorEffectsEnabled(),
        documentVisible: this.motion.documentVisible(),
        reducedMotion: this.motion.reducedMotion(),
        forcedFallback: this.motion.forcedFallback()
      });
    }, { injector: this.injector });
  }

  private readPalette(): ParticlePalette {
    const styles = this.browserWindow!.getComputedStyle(this.document.documentElement);
    const read = (token: string, fallback: string): string =>
      styles.getPropertyValue(token).trim() || fallback;

    return {
      phosphor: read('--color-phosphor-particle', PARTICLE_FALLBACKS.phosphor),
      cyan: read('--color-cyan-particle', PARTICLE_FALLBACKS.cyan),
      violet: read('--color-violet-particle', PARTICLE_FALLBACKS.violet)
    };
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.context || !this.browserWindow || this.destroyed) {
      return;
    }

    const width = this.browserWindow.innerWidth;
    const height = this.browserWindow.innerHeight;
    const dpr = Math.max(1, this.browserWindow.devicePixelRatio || 1);

    this.viewportWidth = width;
    this.viewportHeight = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.buildGrid();
    this.drawFrame();
  }

  private buildGrid(): void {
    const columns = Math.ceil(this.viewportWidth / GRID_SPACING) + 1;
    const rows = Math.ceil(this.viewportHeight / GRID_SPACING) + 1;
    const offsetX = (this.viewportWidth - (columns - 1) * GRID_SPACING) / 2;
    const offsetY = (this.viewportHeight - (rows - 1) * GRID_SPACING) / 2;
    const dots: GridDot[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        dots.push({
          x: offsetX + column * GRID_SPACING,
          y: offsetY + row * GRID_SPACING,
          influence: 0,
          baseColor: (row + column) % 3 === 0 ? this.palette.cyan : this.palette.violet
        });
      }
    }

    this.dots = dots;
  }

  private updateInfluence(elapsedSeconds: number): void {
    const radiusSquared = CURSOR_RADIUS * CURSOR_RADIUS;

    for (const dot of this.dots) {
      const dx = dot.x - this.pointer.x;
      const dy = dot.y - this.pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      const target = this.pointer.active && distanceSquared < radiusSquared
        ? Math.pow(1 - Math.sqrt(distanceSquared) / CURSOR_RADIUS, 2)
        : 0;
      const response = target > dot.influence ? 18 : 8;
      const easing = 1 - Math.exp(-response * elapsedSeconds);
      dot.influence += (target - dot.influence) * easing;
    }
  }

  private drawFrame(): void {
    if (!this.canvas || !this.context) {
      return;
    }

    const context = this.context;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.restore();

    for (const dot of this.dots) {
      context.beginPath();
      context.arc(dot.x, dot.y, 0.72 + dot.influence * 0.38, 0, Math.PI * 2);
      context.fillStyle = dot.baseColor;
      context.globalAlpha = 0.14 + dot.influence * 0.1;
      context.fill();

      if (dot.influence > 0.002) {
        context.beginPath();
        context.arc(dot.x, dot.y, 0.82 + dot.influence * 2.45, 0, Math.PI * 2);
        context.fillStyle = this.palette.phosphor;
        context.globalAlpha = 0.12 + dot.influence * 0.84;
        context.fill();
      }
    }

    context.globalAlpha = 1;
  }

  private reconcilePolicy(policy: MotionPolicy): void {
    const animate = policy.tier === 'high'
      && policy.motionEnabled
      && policy.documentVisible
      && !policy.reducedMotion
      && !policy.forcedFallback;
    const trackPointer = animate && policy.cursorEnabled;

    this.shouldAnimate = animate;
    if (trackPointer) {
      this.attachPointerListeners();
    } else {
      this.detachPointerListeners();
    }

    if (animate) {
      this.startAnimation();
      return;
    }

    this.stopAnimation();
    this.pointer.active = false;
    this.dots.forEach((dot) => {
      dot.influence = 0;
    });
    this.drawFrame();
  }

  private attachPointerListeners(): void {
    if (this.pointerListenersAttached) {
      return;
    }

    this.document.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.document.addEventListener('pointerleave', this.onPointerLeave);
    this.pointerListenersAttached = true;
  }

  private detachPointerListeners(): void {
    if (!this.pointerListenersAttached) {
      return;
    }

    this.document.removeEventListener('pointermove', this.onPointerMove);
    this.document.removeEventListener('pointerleave', this.onPointerLeave);
    this.pointerListenersAttached = false;
    this.pointer.active = false;
  }

  private startAnimation(): void {
    if (this.animationFrameId || !this.browserWindow || this.destroyed) {
      return;
    }

    this.lastFrameTime = 0;
    this.zone.runOutsideAngular(() => {
      this.animationFrameId = this.browserWindow!.requestAnimationFrame(this.animate);
    });
  }

  private stopAnimation(): void {
    if (!this.animationFrameId || !this.browserWindow) {
      return;
    }

    this.browserWindow.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = 0;
    this.lastFrameTime = 0;
  }
}
