import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, booleanAttribute, inject, numberAttribute } from '@angular/core';
import { MotionService } from '../../core/motion/motion.service';

interface RevealTween {
  kill(): void;
}

@Directive({
  selector: '[tcqReveal]',
  standalone: true
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly motion = inject(MotionService);

  @Input({ transform: numberAttribute }) tcqReveal = 0;
  @Input({ transform: booleanAttribute }) tcqRevealActive = true;

  private observer?: IntersectionObserver;
  private tween?: RevealTween;
  private prepared = false;
  private previousOpacity = '';
  private previousTransform = '';

  ngAfterViewInit(): void {
    const host = this.element.nativeElement;

    if (!this.tcqRevealActive || this.motion.reducedMotion() || typeof window.IntersectionObserver !== 'function') {
      return;
    }

    this.previousOpacity = host.style.opacity;
    this.previousTransform = host.style.transform;
    this.prepared = true;
    this.motion.gsap.set(host, { opacity: 0, y: 12 });

    this.observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.target === host && entry.isIntersecting)) {
        return;
      }

      this.observer?.disconnect();
      this.tween = this.motion.gsap.to(host, {
        opacity: 1,
        y: 0,
        duration: 0.32,
        delay: Math.max(0, this.tcqReveal),
        ease: 'expo.out',
        clearProps: 'opacity,transform',
        onComplete: () => this.restoreStyles()
      });
    }, { threshold: 0.15 });
    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.tween?.kill();
    this.restoreStyles();
  }

  private restoreStyles(): void {
    if (!this.prepared) {
      return;
    }

    const style = this.element.nativeElement.style;
    style.opacity = this.previousOpacity;
    style.transform = this.previousTransform;
    this.prepared = false;
  }
}

