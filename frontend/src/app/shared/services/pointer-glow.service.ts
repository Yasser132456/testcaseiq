import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PointerGlowService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly finePointer = window.matchMedia('(pointer: fine)');
  private readonly hoverPointer = window.matchMedia('(hover: hover)');
  private readonly coarsePointer = window.matchMedia('(pointer: coarse)');
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly activeElements = new Set<HTMLElement>();
  private started = false;
  private listening = false;
  private frame = 0;
  private x = 0;
  private y = 0;

  private readonly pointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    this.x = event.clientX;
    this.y = event.clientY;
    if (this.frame) return;
    this.frame = window.requestAnimationFrame(() => this.updateGlowTargets());
  };

  private readonly mediaChange = () => this.syncListener();

  start(): void {
    if (this.started) return;
    this.started = true;
    this.finePointer.addEventListener('change', this.mediaChange);
    this.hoverPointer.addEventListener('change', this.mediaChange);
    this.coarsePointer.addEventListener('change', this.mediaChange);
    this.reducedMotion.addEventListener('change', this.mediaChange);
    this.syncListener();
  }

  private syncListener(): void {
    const canTrack = this.finePointer.matches
      && this.hoverPointer.matches
      && !this.coarsePointer.matches
      && !this.reducedMotion.matches;

    if (canTrack && !this.listening) {
      this.zone.runOutsideAngular(() => {
        this.document.addEventListener('pointermove', this.pointerMove, { passive: true });
      });
      this.listening = true;
      return;
    }

    if (!canTrack && this.listening) {
      this.document.removeEventListener('pointermove', this.pointerMove);
      this.listening = false;
      this.clearActiveElements();
    }
  }

  private updateGlowTargets(): void {
    this.frame = 0;
    const nextActive = new Set<HTMLElement>();
    const updates: Array<{ target: HTMLElement; x: number; y: number }> = [];
    const targets = this.document.querySelectorAll<HTMLElement>('.glass-surface--live');

    targets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      const distance = this.distanceToRect(this.x, this.y, rect);
      if (distance > 120) return;

      updates.push({
        target,
        x: Math.round(this.x - rect.left),
        y: Math.round(this.y - rect.top)
      });
    });

    updates.forEach(({ target, x, y }) => {
      target.style.setProperty('--pointer-x', `${x}px`);
      target.style.setProperty('--pointer-y', `${y}px`);
      target.style.setProperty('--pointer-active', '1');
      nextActive.add(target);
    });

    this.activeElements.forEach((target) => {
      if (!nextActive.has(target)) this.clearElement(target);
    });

    this.activeElements.clear();
    nextActive.forEach((target) => this.activeElements.add(target));
  }

  private distanceToRect(x: number, y: number, rect: DOMRect): number {
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    return Math.hypot(dx, dy);
  }

  private clearActiveElements(): void {
    this.activeElements.forEach((target) => this.clearElement(target));
    this.activeElements.clear();
  }

  private clearElement(target: HTMLElement): void {
    target.style.removeProperty('--pointer-active');
    target.style.removeProperty('--pointer-x');
    target.style.removeProperty('--pointer-y');
  }
}
