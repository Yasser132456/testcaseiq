import {
  Component,
  EffectRef,
  ElementRef,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  effect,
  inject
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MotionService } from '../../core/motion/motion.service';
import { AuthService } from '../../core/services/auth.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { WelcomeBackgroundComponent } from './welcome-background.component';
import { WelcomeReviewGateComponent } from './welcome-review-gate.component';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [RouterLink, RevealDirective, WelcomeBackgroundComponent, WelcomeReviewGateComponent],
  templateUrl: './welcome-page.component.html',
  styleUrl: './welcome-page.component.css'
})
export class WelcomePageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly motion = inject(MotionService);

  private cursorPolicyEffect?: EffectRef;
  private magneticCleanupFns: Array<() => void> = [];

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard');
      return;
    }

    afterNextRender(() => {
      this.runEntrance();
      this.cursorPolicyEffect = effect(
        () => this.reconcileMagneticCtas(this.motion.cursorEffectsEnabled()),
        { injector: this.injector }
      );
    }, { injector: this.injector });
  }

  private runEntrance(): void {
    const headlineLines = this.host.nativeElement.querySelectorAll('.wl-headline-line');
    const supportingElements = this.host.nativeElement.querySelectorAll('.wl-hero-support');
    if (!this.motion.motionEnabled()) {
      return;
    }

    this.motion.gsap.set(headlineLines, {
      opacity: 0,
      y: '110%',
      clipPath: 'inset(0 0 100% 0)',
      willChange: 'transform,opacity,clip-path'
    });
    this.motion.gsap.set(supportingElements, {
      opacity: 0,
      y: 12,
      willChange: 'transform,opacity'
    });

    this.motion.gsap.timeline()
      .to(headlineLines, {
      opacity: 1,
      y: '0%',
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.72,
      ease: 'power4.out',
      stagger: 0.06,
      clearProps: 'opacity,transform,clipPath,willChange'
    })
      .to(supportingElements, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'expo.out',
        stagger: 0.05,
        clearProps: 'opacity,transform,willChange'
      }, '-=0.42');
  }

  private reconcileMagneticCtas(enabled: boolean): void {
    this.clearMagneticCtas();
    if (!enabled) {
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
      this.magneticCleanupFns.push(() => {
        onLeave();
        button.removeEventListener('pointermove', onMove);
        button.removeEventListener('pointerleave', onLeave);
        button.removeEventListener('blur', onLeave);
      });
    });
  }

  private clearMagneticCtas(): void {
    this.magneticCleanupFns.forEach((cleanup) => cleanup());
    this.magneticCleanupFns = [];
  }

  ngOnDestroy(): void {
    this.cursorPolicyEffect?.destroy();
    this.clearMagneticCtas();
  }
}
