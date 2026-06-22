import { Component, Injector, OnDestroy, OnInit, afterNextRender, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CountUp } from 'countup.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import VanillaTilt from 'vanilla-tilt';
import { AuthService } from '../../core/services/auth.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './welcome-page.component.html',
  styleUrl: './welcome-page.component.css'
})
export class WelcomePageComponent implements OnInit, OnDestroy {
  private readonly router  = inject(Router);
  private readonly auth    = inject(AuthService);
  private readonly injector = inject(Injector);

  private mouseX = 0;
  private mouseY = 0;
  private lerpX  = 0;
  private lerpY  = 0;
  private rafId  = 0;
  private mouseFn!: (e: MouseEvent) => void;
  private countObserver?: IntersectionObserver;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    afterNextRender(() => {
      this.runEntrance();
      this.initTilt();
      this.initCounters();
      this.initParallax();
      this.initScrollReveal();
    }, { injector: this.injector });
  }

  /* ── Entrance timeline ─────────────────────────────── */
  private runEntrance(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.from('.wl-nav',     { opacity: 0, y: -16, duration: 0.65 }, 0)
      .from('.wl-eyebrow', { opacity: 0,          duration: 0.55 }, 0.3)
      .from('.wl-word',    { opacity: 0, y: 48, stagger: 0.11, duration: 0.72 }, 0.45)
      .from('.wl-sub',     { opacity: 0, y: 28, duration: 0.65 }, 0.95)
      .from('.wl-ctas',    { opacity: 0, y: 20, duration: 0.55 }, 1.1)
      .from('.wl-cards',   { opacity: 0, duration: 0.7 }, 1.2)
      .from('.wl-scroll-cue', { opacity: 0, duration: 0.5 }, 1.55)
      .from('.wl-stat',    { opacity: 0, y: 14, stagger: 0.09, duration: 0.45 }, 1.6);
  }

  /* ── VanillaTilt on cards ──────────────────────────── */
  private initTilt(): void {
    document.querySelectorAll<HTMLElement>('.wl-card').forEach(card => {
      VanillaTilt.init(card, { max: 9, speed: 600, glare: true, 'max-glare': 0.06, scale: 1.02 });
    });
  }

  /* ── CountUp on stat numbers ───────────────────────── */
  private initCounters(): void {
    const statsEl = document.querySelector('.wl-stats');
    if (!statsEl) return;

    this.countObserver = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      this.countObserver?.disconnect();

      document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => {
        const target = +(el.dataset['count'] ?? 0);
        const cu = new CountUp(el, target, { duration: 1.4, useEasing: true, useGrouping: true });
        if (!cu.error) cu.start();
      });
    }, { threshold: 0.6 });

    this.countObserver.observe(statsEl);
  }

  /* ── Smooth mouse parallax on atmosphere orbs ──────── */
  private initParallax(): void {
    const orbs = document.querySelectorAll<HTMLElement>('.wl-orb');

    this.mouseFn = (e: MouseEvent) => {
      this.mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    document.addEventListener('mousemove', this.mouseFn);

    const tick = () => {
      this.lerpX += (this.mouseX - this.lerpX) * 0.04;
      this.lerpY += (this.mouseY - this.lerpY) * 0.04;
      const x = this.lerpX, y = this.lerpY;
      orbs[0]?.style.setProperty('transform', `translate(${x * -55}px, ${y * -35}px)`);
      orbs[1]?.style.setProperty('transform', `translate(${x *  45}px, ${y *  28}px)`);
      orbs[2]?.style.setProperty('transform', `translate(${x *  28}px, ${y * -45}px) scale(1.05)`);
      orbs[3]?.style.setProperty('transform', `translate(${x * -20}px, ${y *  30}px)`);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /* ── GSAP ScrollTrigger reveals for lower sections ─── */
  private initScrollReveal(): void {
    gsap.utils.toArray<HTMLElement>('.wl-reveal').forEach((el, i) => {
      gsap.from(el, {
        opacity: 0, y: 32,
        duration: 0.75,
        delay: i * 0.07,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.mouseFn);
    cancelAnimationFrame(this.rafId);
    this.countObserver?.disconnect();
    ScrollTrigger.getAll().forEach(t => t.kill());
    document.querySelectorAll<HTMLElement & { vanillaTilt?: { destroy(): void } }>('.wl-card')
      .forEach(card => card.vanillaTilt?.destroy());
  }
}
