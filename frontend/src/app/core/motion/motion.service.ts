import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export type MotionQualityTier = 'high' | 'medium' | 'static';

const gsapPlugins = gsap.plugins as Record<string, unknown>;
if (!gsapPlugins['ScrollTrigger']) {
  gsap.registerPlugin(ScrollTrigger);
}

@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly reducedMotionState = signal(this.reducedMotionQuery.matches);

  readonly reducedMotion: Signal<boolean> = this.reducedMotionState.asReadonly();
  readonly qualityTier: Signal<MotionQualityTier> = signal(this.detectQualityTier()).asReadonly();
  readonly gsap = gsap;
  readonly ScrollTrigger = ScrollTrigger;

  private readonly onReducedMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotionState.set(event.matches);
  };

  constructor() {
    this.reducedMotionQuery.addEventListener('change', this.onReducedMotionChange);
    this.destroyRef.onDestroy(() => {
      this.reducedMotionQuery.removeEventListener('change', this.onReducedMotionChange);
    });
  }

  private detectQualityTier(): MotionQualityTier {
    const forcedFallback = new URLSearchParams(window.location.search).get('bg') === 'fallback';
    const cores = navigator.hardwareConcurrency || 2;

    if (forcedFallback || cores <= 2) {
      return 'static';
    }

    const mobileViewport = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    return mobileViewport ? 'medium' : 'high';
  }
}

