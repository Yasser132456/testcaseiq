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

declare global {
  interface Window {
    __welcomeFrameCosts?: number[];
  }
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
      class="wl-grid-live"
      data-testid="welcome-background-canvas"
      aria-hidden="true"
    ></canvas>
    <canvas #baseCanvas class="wl-grid-base" aria-hidden="true"></canvas>
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
    }

    .wl-grid-base {
      z-index: 0;
      background:
        radial-gradient(ellipse 42% 58% at 24% 43%, color-mix(in oklch, var(--color-bg) 94%, transparent) 0 38%, transparent 76%),
        radial-gradient(circle at 18% 20%, color-mix(in oklch, var(--color-cyan-particle) 7%, transparent), transparent 34%),
        radial-gradient(circle at 82% 68%, color-mix(in oklch, var(--color-violet-particle) 8%, transparent), transparent 38%),
        linear-gradient(145deg, var(--color-bg), oklch(11% 0.018 220));
    }

    .wl-grid-live {
      z-index: 1;
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
  private readonly baseCanvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('baseCanvas');
  private readonly browserWindow = this.document.defaultView;

  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private baseCanvas?: HTMLCanvasElement;
  private baseContext?: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private policyEffect?: EffectRef;
  private dots: GridDot[] = [];
  private activeDotIndices: number[] = [];
  private candidateDotIndices: number[] = [];
  private nextActiveDotIndices: number[] = [];
  private candidateMarks = new Uint8Array(0);
  private gridColumns = 0;
  private gridRows = 0;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private palette: ParticlePalette = PARTICLE_FALLBACKS;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private dirtyLeft = 0;
  private dirtyTop = 0;
  private dirtyWidth = 0;
  private dirtyHeight = 0;
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
    const frameCosts = this.browserWindow?.__welcomeFrameCosts;
    const frameStartedAt = frameCosts ? this.browserWindow!.performance.now() : 0;
    this.updateInfluence(elapsed);
    this.drawFrame();
    if (frameCosts && frameCosts.length < 180) {
      frameCosts.push(this.browserWindow!.performance.now() - frameStartedAt);
    }
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
    this.activeDotIndices.length = 0;
    this.candidateDotIndices.length = 0;
    this.nextActiveDotIndices.length = 0;
    this.candidateMarks = new Uint8Array(0);
    this.context = undefined;
    this.canvas = undefined;
    this.baseContext = undefined;
    this.baseCanvas = undefined;
  }

  private setup(): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    this.canvas = canvas;
    this.context = context;
    this.baseCanvas = this.baseCanvasRef().nativeElement;
    this.baseContext = this.baseCanvas.getContext('2d') ?? undefined;
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
    if (!this.canvas || !this.context || !this.baseCanvas || !this.baseContext || !this.browserWindow || this.destroyed) {
      return;
    }

    const width = this.browserWindow.innerWidth;
    const height = this.browserWindow.innerHeight;
    const dpr = Math.max(1, this.browserWindow.devicePixelRatio || 1);

    this.viewportWidth = width;
    this.viewportHeight = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.baseCanvas.width = this.canvas.width;
    this.baseCanvas.height = this.canvas.height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.baseContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirtyWidth = 0;
    this.dirtyHeight = 0;
    this.buildGrid();
    this.drawBaseLayer();
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
    this.gridColumns = columns;
    this.gridRows = rows;
    this.gridOffsetX = offsetX;
    this.gridOffsetY = offsetY;
    this.activeDotIndices.length = 0;
    this.candidateDotIndices.length = 0;
    this.nextActiveDotIndices.length = 0;
    this.candidateMarks = new Uint8Array(dots.length);
  }

  private updateInfluence(elapsedSeconds: number): void {
    const radiusSquared = CURSOR_RADIUS * CURSOR_RADIUS;
    const attackEasing = 1 - Math.exp(-18 * elapsedSeconds);
    const decayEasing = 1 - Math.exp(-8 * elapsedSeconds);
    const candidates = this.candidateDotIndices;
    candidates.length = 0;
    for (const index of this.activeDotIndices) this.addCandidate(index);
    if (this.pointer.active) {
      const minColumn = Math.max(0, Math.floor((this.pointer.x - CURSOR_RADIUS - this.gridOffsetX) / GRID_SPACING));
      const maxColumn = Math.min(this.gridColumns - 1, Math.ceil((this.pointer.x + CURSOR_RADIUS - this.gridOffsetX) / GRID_SPACING));
      const minRow = Math.max(0, Math.floor((this.pointer.y - CURSOR_RADIUS - this.gridOffsetY) / GRID_SPACING));
      const maxRow = Math.min(this.gridRows - 1, Math.ceil((this.pointer.y + CURSOR_RADIUS - this.gridOffsetY) / GRID_SPACING));
      for (let row = minRow; row <= maxRow; row += 1) {
        for (let column = minColumn; column <= maxColumn; column += 1) {
          this.addCandidate(row * this.gridColumns + column);
        }
      }
    }

    const nextActive = this.nextActiveDotIndices;
    nextActive.length = 0;
    for (const index of candidates) {
      const dot = this.dots[index];
      if (!dot) continue;
      const dx = dot.x - this.pointer.x;
      const dy = dot.y - this.pointer.y;
      const distanceSquared = dx * dx + dy * dy;
      const falloff = this.pointer.active && distanceSquared < radiusSquared
        ? 1 - Math.sqrt(distanceSquared) / CURSOR_RADIUS
        : 0;
      const target = falloff * falloff;
      const easing = target > dot.influence ? attackEasing : decayEasing;
      dot.influence += (target - dot.influence) * easing;
      if (dot.influence > 0.01) nextActive.push(index);
      this.candidateMarks[index] = 0;
    }
    this.nextActiveDotIndices = this.activeDotIndices;
    this.activeDotIndices = nextActive;
  }

  private addCandidate(index: number): void {
    if (this.candidateMarks[index] === 0) {
      this.candidateMarks[index] = 1;
      this.candidateDotIndices.push(index);
    }
  }

  private drawBaseLayer(): void {
    if (!this.baseCanvas || !this.baseContext) return;
    const context = this.baseContext;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    context.restore();
    for (const dot of this.dots) {
      context.beginPath();
      context.arc(dot.x, dot.y, 0.72, 0, Math.PI * 2);
      context.fillStyle = dot.baseColor;
      context.globalAlpha = 0.14;
      context.fill();
    }
    context.globalAlpha = 1;
  }

  private drawFrame(): void {
    if (!this.canvas || !this.context || !this.baseCanvas) {
      return;
    }

    const context = this.context;
    if (this.dirtyWidth > 0 && this.dirtyHeight > 0) {
      context.clearRect(this.dirtyLeft, this.dirtyTop, this.dirtyWidth, this.dirtyHeight);
    }

    let minX = this.viewportWidth;
    let minY = this.viewportHeight;
    let maxX = 0;
    let maxY = 0;

    context.beginPath();
    for (const index of this.activeDotIndices) {
      const dot = this.dots[index];
      if (!dot) continue;
      const radius = 0.82 + dot.influence * 2.45;
      context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      minX = Math.min(minX, dot.x - radius);
      minY = Math.min(minY, dot.y - radius);
      maxX = Math.max(maxX, dot.x + radius);
      maxY = Math.max(maxY, dot.y + radius);
    }

    if (minX <= maxX && minY <= maxY) {
      context.fillStyle = this.palette.phosphor;
      context.globalAlpha = 0.72;
      context.fill();
      const padding = 1;
      this.dirtyLeft = minX - padding;
      this.dirtyTop = minY - padding;
      this.dirtyWidth = maxX - minX + padding * 2;
      this.dirtyHeight = maxY - minY + padding * 2;
    } else {
      this.dirtyWidth = 0;
      this.dirtyHeight = 0;
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
    this.activeDotIndices.length = 0;
    this.nextActiveDotIndices.length = 0;
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
