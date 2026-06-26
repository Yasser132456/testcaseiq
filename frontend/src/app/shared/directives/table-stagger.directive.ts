import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { gsap } from 'gsap';

@Directive({ selector: '[tableStagger]', standalone: true })
export class TableStaggerDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLTableElement>);
  private observer?: MutationObserver;

  ngAfterViewInit(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    this.animateRows();
    const tbody = this.el.nativeElement.querySelector('tbody');
    if (!tbody) return;
    this.observer = new MutationObserver(() => this.animateRows());
    this.observer.observe(tbody, { childList: true });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private animateRows(): void {
    const rows = Array.from(this.el.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>)
      .filter(row => row.dataset['staggered'] !== 'true');
    rows.forEach((row, index) => {
      row.dataset['staggered'] = 'true';
      row.style.animationDelay = `${index * 35}ms`;
    });
    if (rows.length === 0) return;
    gsap.from(rows, { opacity: 0, y: 10, duration: 0.3, stagger: 0.035, ease: 'power2.out', clearProps: 'opacity,transform' });
  }
}
