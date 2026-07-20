import { DestroyRef, Injectable, InjectionToken, Signal, effect, inject, signal, untracked } from '@angular/core';
import Lenis, { LenisOptions } from 'lenis';
import { MotionService } from './motion.service';

export type LenisFactory = (options: LenisOptions) => Lenis;

export const LENIS_FACTORY = new InjectionToken<LenisFactory>('LENIS_FACTORY', {
  providedIn: 'root',
  factory: () => (options: LenisOptions) => new Lenis(options)
});

@Injectable({ providedIn: 'root' })
export class LenisService {
  private readonly motion = inject(MotionService);
  private readonly createLenis = inject(LENIS_FACTORY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wrapper = signal<HTMLElement | null>(null);
  private readonly content = signal<HTMLElement | null>(null);
  private readonly scrollVelocityState = signal(0);

  readonly scrollVelocity: Signal<number> = this.scrollVelocityState.asReadonly();

  private lenis?: Lenis;
  private unsubscribeScroll?: () => void;
  private readonly tick = (time: number): void => {
    this.lenis?.raf(time * 1000);
  };

  private readonly policyEffect = effect(() => {
    const wrapper = this.wrapper();
    const content = this.content();
    const enabled = !this.motion.reducedMotion() && this.motion.qualityTier() !== 'static';

    untracked(() => this.reconcile(wrapper, content, enabled));
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.policyEffect.destroy();
      this.detach();
    });
  }

  attach(wrapper: HTMLElement, content: HTMLElement): void {
    this.wrapper.set(wrapper);
    this.content.set(content);
  }

  detach(): void {
    this.wrapper.set(null);
    this.content.set(null);
    this.stop();
  }

  private reconcile(wrapper: HTMLElement | null, content: HTMLElement | null, enabled: boolean): void {
    this.stop();

    if (!enabled || !wrapper || !content) {
      return;
    }

    this.lenis = this.createLenis({
      wrapper,
      content,
      autoRaf: false,
      anchors: true,
      allowNestedScroll: true,
      prevent: (node) => Boolean(node.closest('[role="dialog"], [popover], [data-lenis-prevent]'))
    });
    this.unsubscribeScroll = this.lenis.on('scroll', (event) => {
      this.scrollVelocityState.set(event.velocity);
      this.motion.ScrollTrigger.update();
    });
    this.motion.gsap.ticker.lagSmoothing(0);
    this.motion.gsap.ticker.add(this.tick);
  }

  private stop(): void {
    if (!this.lenis) {
      return;
    }

    this.motion.gsap.ticker.remove(this.tick);
    this.unsubscribeScroll?.();
    this.unsubscribeScroll = undefined;
    this.scrollVelocityState.set(0);
    this.lenis.destroy();
    this.lenis = undefined;
  }
}

