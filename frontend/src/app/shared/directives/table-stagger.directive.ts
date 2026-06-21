import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';
import { gsap } from 'gsap';

@Directive({ selector: '[tableStagger]', standalone: true })
export class TableStaggerDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLTableElement>);

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rows = this.el.nativeElement.querySelectorAll('tbody tr');
    gsap.from(rows, { opacity: 0, y: 10, duration: 0.3, stagger: 0.03, ease: 'power2.out', clearProps: 'all' });
  }
}
