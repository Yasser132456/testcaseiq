import { Directive, ElementRef, HostListener, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { MotionService } from '../../core/motion/motion.service';

@Directive({
  selector: '[vtName]',
  standalone: true
})
export class VtNameDirective implements OnChanges, OnDestroy {
  private static activeName: string | null = null;
  private static readonly namedElements = new Set<HTMLElement>();
  private static fallbackTimer: ReturnType<typeof window.setTimeout> | null = null;

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly motionService = inject(MotionService);

  @Input() vtName = '';
  @Input() vtNameSource = true;
  @Input() vtNameTarget = false;

  ngOnChanges(): void {
    this.syncTargetName();
  }

  ngOnDestroy(): void {
    VtNameDirective.namedElements.delete(this.elementRef.nativeElement);
  }

  @HostListener('click')
  onClick(): void {
    if (!this.vtNameSource || !this.canUseViewTransitions() || !this.vtName) return;
    VtNameDirective.activate(this.vtName, this.elementRef.nativeElement);
  }

  static clearActiveName(): void {
    if (VtNameDirective.fallbackTimer) {
      window.clearTimeout(VtNameDirective.fallbackTimer);
      VtNameDirective.fallbackTimer = null;
    }
    for (const element of VtNameDirective.namedElements) {
      element.style.viewTransitionName = '';
    }
    VtNameDirective.namedElements.clear();
    VtNameDirective.activeName = null;
  }

  private static activate(name: string, element: HTMLElement): void {
    VtNameDirective.clearActiveName();
    VtNameDirective.activeName = name;
    VtNameDirective.applyName(element, name);
    VtNameDirective.fallbackTimer = window.setTimeout(() => {
      if (VtNameDirective.activeName === name) {
        VtNameDirective.clearActiveName();
      }
    }, 1000);
  }

  private static applyName(element: HTMLElement, name: string): void {
    element.style.viewTransitionName = name;
    VtNameDirective.namedElements.add(element);
  }

  private syncTargetName(): void {
    if (!this.vtNameTarget || !this.canUseViewTransitions() || VtNameDirective.activeName !== this.vtName) return;
    VtNameDirective.applyName(this.elementRef.nativeElement, this.vtName);
  }

  private canUseViewTransitions(): boolean {
    return typeof document !== 'undefined'
      && 'startViewTransition' in document
      && !this.motionService.reducedMotion();
  }
}

export function clearActiveViewTransitionNames(): void {
  VtNameDirective.clearActiveName();
}
