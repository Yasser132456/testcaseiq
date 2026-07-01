import { Component, Injector, OnDestroy, OnInit, afterNextRender, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { AuthService } from '../../core/services/auth.service';
import { TiltDirective } from '../../shared/directives/tilt.directive';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [RouterLink, TiltDirective],
  templateUrl: './welcome-page.component.html',
  styleUrl: './welcome-page.component.css'
})
export class WelcomePageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  private lenisRafId = 0;
  private lenis?: Lenis;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    afterNextRender(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        this.lenis = new Lenis({
          duration: 1.05,
          easing: (t) => 1 - Math.pow(1 - t, 4)
        });

        const lenisFrame = (time: number) => {
          this.lenis?.raf(time);
          this.lenisRafId = requestAnimationFrame(lenisFrame);
        };

        this.lenisRafId = requestAnimationFrame(lenisFrame);
      }

      this.runEntrance();
    }, { injector: this.injector });
  }

  private runEntrance(): void {
    const selector = '.wl-nav, .wl-hero-copy, .wl-flow-card, .wl-pulse';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(selector, { opacity: 1, y: 0, x: 0, scale: 1 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.from('.wl-nav', { opacity: 0, y: -12, duration: 0.45 }, 0)
      .from('.wl-hero-copy', { opacity: 0, y: 18, duration: 0.62 }, 0.12)
      .from('.wl-flow-card', { opacity: 0, y: 12, stagger: 0.07, duration: 0.42 }, 0.5)
      .from('.wl-pulse', { opacity: 0, scale: 0.92, duration: 0.35 }, 0.7);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.lenisRafId);
    this.lenis?.destroy();
  }
}
