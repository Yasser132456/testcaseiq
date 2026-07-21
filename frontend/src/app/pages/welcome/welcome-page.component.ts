import { Component, ElementRef, Injector, OnDestroy, OnInit, afterNextRender, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionService } from '../../core/motion/motion.service';
import { AuthService } from '../../core/services/auth.service';
import { BackgroundSceneAccentName, BackgroundSceneService } from '../../shared/background/background-scene.service';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './welcome-page.component.html',
  styleUrl: './welcome-page.component.css'
})
export class WelcomePageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly motion = inject(MotionService);
  private readonly background = inject(BackgroundSceneService);

  private cleanupFns: Array<() => void> = [];
  private scrollTrigger?: ScrollTrigger;
  private activeBeatIndex = -1;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    afterNextRender(() => {
      this.runEntrance();
      this.bindMagneticCtas();
      this.setupScrollNarrative();
    }, { injector: this.injector });
  }

  private runEntrance(): void {
    const headlineLines = this.host.nativeElement.querySelectorAll('.wl-headline span');
    const baseSelector = '.wl-nav, .wl-system-line, .wl-sub, .wl-ctas';

    if (this.motion.reducedMotion()) {
      this.motion.gsap.set([headlineLines, baseSelector], { opacity: 1, y: 0, clipPath: 'inset(0 0 0 0)' });
      return;
    }

    this.motion.gsap.from(headlineLines, {
      opacity: 0,
      y: '110%',
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.72,
      ease: 'power4.out',
      stagger: 0.06
    });
    this.motion.gsap.from(baseSelector, {
      opacity: 0,
      y: 14,
      duration: 0.52,
      ease: 'power3.out',
      stagger: 0.045,
      delay: 0.14
    });
  }

  private setupScrollNarrative(): void {
    const element = this.host.nativeElement as HTMLElement;
    const root = element.querySelector('.wl-cinema') as HTMLElement | null;
    const pin = element.querySelector('.wl-cinema-pin') as HTMLElement | null;
    const beats = Array.from(element.querySelectorAll('[data-cinematic-beat]')) as HTMLElement[];

    if (!root || !pin || beats.length === 0 || this.motion.reducedMotion()) {
      beats.forEach((beat) => beat.classList.add('is-active'));
      this.background.setWelcomeProgress(1);
      return;
    }

    this.scrollTrigger = this.motion.ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: '+=300%',
      pin,
      scrub: 0.6,
      onUpdate: (self) => {
        this.background.setWelcomeProgress(self.progress);
        this.activateBeat(beats, self.progress);
      }
    });
    this.cleanupFns.push(() => this.scrollTrigger?.kill());
    this.activateBeat(beats, 0);
  }

  private activateBeat(beats: HTMLElement[], progress: number): void {
    const index = Math.min(beats.length - 1, Math.floor(progress * beats.length));
    if (index === this.activeBeatIndex) {
      return;
    }

    this.activeBeatIndex = index;
    beats.forEach((beat, beatIndex) => {
      beat.classList.toggle('is-active', beatIndex === index);
      this.motion.gsap.to(beat, {
        opacity: beatIndex === index ? 1 : 0,
        y: beatIndex === index ? 0 : 18,
        duration: 0.32,
        overwrite: true,
        ease: 'power2.out'
      });
    });

    const accent = (beats[index].dataset['accent'] ?? 'phosphor') as BackgroundSceneAccentName;
    this.background.setSceneAccent(accent);
  }

  private bindMagneticCtas(): void {
    if (this.motion.reducedMotion()) {
      return;
    }

    const element = this.host.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll('.wl-magnetic')) as HTMLElement[];
    buttons.forEach((button) => {
      const onMove = (event: PointerEvent) => {
        const rect = button.getBoundingClientRect();
        const x = Math.max(-6, Math.min(6, event.clientX - rect.left - rect.width / 2));
        const y = Math.max(-6, Math.min(6, event.clientY - rect.top - rect.height / 2));
        button.style.setProperty('--magnetic-x', `${x}px`);
        button.style.setProperty('--magnetic-y', `${y}px`);
      };
      const onLeave = () => {
        button.style.setProperty('--magnetic-x', '0px');
        button.style.setProperty('--magnetic-y', '0px');
      };

      button.addEventListener('pointermove', onMove, { passive: true });
      button.addEventListener('pointerleave', onLeave);
      button.addEventListener('blur', onLeave);
      this.cleanupFns.push(() => {
        button.removeEventListener('pointermove', onMove);
        button.removeEventListener('pointerleave', onLeave);
        button.removeEventListener('blur', onLeave);
      });
    });
  }

  ngOnDestroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];
    this.background.setWelcomeProgress(0);
    this.background.setSceneAccent('phosphor');
  }
}
