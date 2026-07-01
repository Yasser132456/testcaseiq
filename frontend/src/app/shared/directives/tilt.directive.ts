import { AfterViewInit, Directive, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import type { TiltOptions } from 'vanilla-tilt';
import VanillaTilt from 'vanilla-tilt/lib/vanilla-tilt.es2015';

@Directive({ selector: '[glassTilt]', standalone: true })
export class TiltDirective implements AfterViewInit, OnChanges, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly finePointerQuery = window.matchMedia('(pointer: fine)');
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private instance?: VanillaTilt;
  private viewReady = false;
  private readonly reducedMotionListener = () => this.syncTilt();
  private readonly pointerListener = () => this.syncTilt();
  private readonly previousStyles = new Map<string, string>();

  @Input() glassTiltDisabled = false;
  @Input() glassTiltMaxDeg?: number | string;
  @Input() glassTiltPerspective?: number | string;
  @Input() glassTiltGlare = false;
  @Input() glassTiltMaxGlare = 0.18;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.finePointerQuery.addEventListener('change', this.pointerListener);
    this.reducedMotionQuery.addEventListener('change', this.reducedMotionListener);
    this.syncTilt();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (!this.viewReady) return;
    this.syncTilt();
  }

  ngOnDestroy(): void {
    this.finePointerQuery.removeEventListener('change', this.pointerListener);
    this.reducedMotionQuery.removeEventListener('change', this.reducedMotionListener);
    this.destroyTilt();
    this.restoreStyles();
  }

  private syncTilt(): void {
    const host = this.el.nativeElement;
    if (!this.canTilt()) {
      this.destroyTilt();
      host.dataset['tiltState'] = this.reducedMotionQuery.matches ? 'reduced-motion' : 'disabled';
      host.style.transform = 'none';
      return;
    }

    this.destroyTilt();
    this.prepareStyles();
    host.dataset['tiltState'] = 'active';
    this.instance = new VanillaTilt(host, this.options());
  }

  private canTilt(): boolean {
    return !this.glassTiltDisabled
      && typeof window.PointerEvent !== 'undefined'
      && this.finePointerQuery.matches
      && !this.reducedMotionQuery.matches;
  }

  private options(): TiltOptions {
    return {
      max: this.readNumericInput(this.glassTiltMaxDeg, '--tilt-max-deg', 6),
      perspective: this.readNumericInput(this.glassTiltPerspective, '--perspective', 1200),
      speed: this.readNumericToken('--dur-tilt', 180),
      easing: this.readToken('--ease-out-quart', 'cubic-bezier(0.25, 1, 0.5, 1)'),
      glare: this.glassTiltGlare,
      'max-glare': this.glassTiltMaxGlare,
      gyroscope: false,
      reset: true,
      transition: true
    };
  }

  private prepareStyles(): void {
    const host = this.el.nativeElement;
    this.rememberStyle('willChange');
    this.rememberStyle('transformStyle');
    this.rememberStyle('backfaceVisibility');
    this.rememberStyle('transform');
    host.style.willChange = 'transform';
    host.style.transformStyle = 'preserve-3d';
    host.style.backfaceVisibility = 'hidden';
    if (!host.style.transform) host.style.transform = 'translateZ(0)';
  }

  private destroyTilt(): void {
    this.instance?.destroy();
    this.instance = undefined;
  }

  private restoreStyles(): void {
    const hostStyle = this.el.nativeElement.style;
    this.previousStyles.forEach((value, property) => {
      hostStyle.setProperty(this.toKebabCase(property), value);
    });
    this.previousStyles.clear();
  }

  private rememberStyle(property: keyof CSSStyleDeclaration): void {
    const key = String(property);
    if (this.previousStyles.has(key)) return;
    this.previousStyles.set(key, String(this.el.nativeElement.style[property] ?? ''));
  }

  private readNumericInput(inputValue: number | string | undefined, token: string, fallback: number): number {
    if (inputValue !== undefined && inputValue !== null && inputValue !== '') {
      return this.parseNumber(inputValue, fallback);
    }
    return this.readNumericToken(token, fallback);
  }

  private readNumericToken(token: string, fallback: number): number {
    return this.parseNumber(this.readToken(token, String(fallback)), fallback);
  }

  private readToken(token: string, fallback: string): string {
    const value = getComputedStyle(this.el.nativeElement).getPropertyValue(token).trim();
    return value || fallback;
  }

  private parseNumber(value: number | string, fallback: number): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toKebabCase(property: string): string {
    return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
}
