import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';
import { gsap } from 'gsap';

export type MotionQualityTier = 'high' | 'medium' | 'static';

type ScrollTriggerPlugin = typeof import('gsap/ScrollTrigger').ScrollTrigger;

@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserWindow = this.document.defaultView;
  private readonly reducedMotionQuery = this.browserWindow?.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly mobileQuery = this.browserWindow?.matchMedia('(max-width: 760px), (pointer: coarse)');
  private readonly finePointerQuery = this.browserWindow?.matchMedia('(pointer: fine)');
  private readonly hoverQuery = this.browserWindow?.matchMedia('(hover: hover)');
  private readonly coarsePointerQuery = this.browserWindow?.matchMedia('(pointer: coarse)');
  private readonly reducedMotionState = signal(this.reducedMotionQuery?.matches ?? false);
  private readonly mobileState = signal(this.mobileQuery?.matches ?? false);
  private readonly finePointerState = signal(this.finePointerQuery?.matches ?? false);
  private readonly hoverState = signal(this.hoverQuery?.matches ?? false);
  private readonly coarsePointerState = signal(this.coarsePointerQuery?.matches ?? false);
  private readonly documentVisibleState = signal(this.document.visibilityState !== 'hidden');
  private readonly forcedFallbackState = signal(
    new URLSearchParams(this.browserWindow?.location.search ?? '').get('bg') === 'fallback'
  );
  private readonly hardwareConcurrency = this.browserWindow?.navigator.hardwareConcurrency || 2;
  private scrollTrigger?: ScrollTriggerPlugin;
  private scrollTriggerPromise?: Promise<ScrollTriggerPlugin>;

  readonly reducedMotion: Signal<boolean> = this.reducedMotionState.asReadonly();
  readonly documentVisible: Signal<boolean> = this.documentVisibleState.asReadonly();
  readonly forcedFallback: Signal<boolean> = this.forcedFallbackState.asReadonly();
  readonly qualityTier: Signal<MotionQualityTier> = computed(() => {
    if (this.forcedFallbackState() || this.hardwareConcurrency <= 2) {
      return 'static';
    }

    return this.mobileState() ? 'medium' : 'high';
  });
  readonly motionEnabled: Signal<boolean> = computed(() =>
    this.documentVisibleState() && !this.reducedMotionState() && this.qualityTier() !== 'static'
  );
  readonly cursorEffectsEnabled: Signal<boolean> = computed(() =>
    this.motionEnabled()
    && !this.forcedFallbackState()
    && this.finePointerState()
    && this.hoverState()
    && !this.coarsePointerState()
  );
  readonly sceneEffectsEnabled: Signal<boolean> = computed(() =>
    this.motionEnabled() && !this.forcedFallbackState() && this.qualityTier() !== 'static'
  );
  readonly gsap = gsap;

  private readonly onReducedMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotionState.set(event.matches);
  };
  private readonly onMobileChange = (event: MediaQueryListEvent): void => {
    this.mobileState.set(event.matches);
  };
  private readonly onFinePointerChange = (event: MediaQueryListEvent): void => {
    this.finePointerState.set(event.matches);
  };
  private readonly onHoverChange = (event: MediaQueryListEvent): void => {
    this.hoverState.set(event.matches);
  };
  private readonly onCoarsePointerChange = (event: MediaQueryListEvent): void => {
    this.coarsePointerState.set(event.matches);
  };
  private readonly onVisibilityChange = (): void => {
    const visible = this.document.visibilityState !== 'hidden';
    this.documentVisibleState.set(visible);
    this.document.documentElement.dataset['motionPaused'] = String(!visible);
  };

  constructor() {
    this.reducedMotionQuery?.addEventListener('change', this.onReducedMotionChange);
    this.mobileQuery?.addEventListener('change', this.onMobileChange);
    this.finePointerQuery?.addEventListener('change', this.onFinePointerChange);
    this.hoverQuery?.addEventListener('change', this.onHoverChange);
    this.coarsePointerQuery?.addEventListener('change', this.onCoarsePointerChange);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange();

    this.destroyRef.onDestroy(() => {
      this.reducedMotionQuery?.removeEventListener('change', this.onReducedMotionChange);
      this.mobileQuery?.removeEventListener('change', this.onMobileChange);
      this.finePointerQuery?.removeEventListener('change', this.onFinePointerChange);
      this.hoverQuery?.removeEventListener('change', this.onHoverChange);
      this.coarsePointerQuery?.removeEventListener('change', this.onCoarsePointerChange);
      this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.document.documentElement.removeAttribute('data-motion-paused');
    });
  }

  loadScrollTrigger(): Promise<ScrollTriggerPlugin> {
    this.scrollTriggerPromise ??= import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      const gsapPlugins = this.gsap.plugins as Record<string, unknown>;
      if (!gsapPlugins['ScrollTrigger']) {
        this.gsap.registerPlugin(ScrollTrigger);
      }
      this.scrollTrigger = ScrollTrigger;
      return ScrollTrigger;
    });

    return this.scrollTriggerPromise;
  }

  updateScrollTrigger(): void {
    this.scrollTrigger?.update();
  }
}
