import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import { gsap } from 'gsap';
import type * as Three from 'three';

export type BackgroundSceneMode = 'live' | 'static' | 'fallback';

interface SceneHandles {
  camera: Three.PerspectiveCamera;
  geometry: Three.BufferGeometry;
  material: Three.PointsMaterial;
  points: Three.Points;
  renderer: Three.WebGLRenderer;
  resizeObserver: ResizeObserver;
  scene: Three.Scene;
}

@Injectable({ providedIn: 'root' })
export class BackgroundSceneService {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);

  private animationFrame = 0;
  private handles?: SceneHandles;
  private pointerCleanup?: () => void;
  private readonly particleCount = 700;
  private readonly dprCap = 1.5;

  async init(host: HTMLElement, reducedMotion: boolean, signal?: AbortSignal): Promise<BackgroundSceneMode> {
    this.dispose();

    if (this.isForcedFallback() || !this.hasWebGLContext() || this.isLowEndDevice()) {
      return 'fallback';
    }

    this.throwIfAborted(signal);

    if (!reducedMotion && !(await this.passesFpsProbe())) {
      return 'fallback';
    }

    this.throwIfAborted(signal);

    const THREE = await import('three');
    this.throwIfAborted(signal);

    this.createScene(THREE, host, reducedMotion);

    return reducedMotion ? 'static' : 'live';
  }

  dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.pointerCleanup?.();
    this.pointerCleanup = undefined;

    if (!this.handles) {
      return;
    }

    const { geometry, material, renderer, resizeObserver } = this.handles;
    resizeObserver.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    this.handles = undefined;
  }

  private createScene(THREE: typeof Three, host: HTMLElement, reducedMotion: boolean): void {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    host.appendChild(renderer.domElement);

    const { positions, colors } = this.buildParticleAttributes(THREE);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    this.handles = { camera, geometry, material, points, renderer, resizeObserver, scene };
    resize();

    if (reducedMotion) {
      renderer.render(scene, camera);
      return;
    }

    this.bindPointerParallax(camera);
    this.zone.runOutsideAngular(() => this.animate());
  }

  private animate(): void {
    if (!this.handles) {
      return;
    }

    const { camera, points, renderer, scene } = this.handles;
    points.rotation.y += 0.00045;
    points.rotation.x += 0.00018;
    renderer.render(scene, camera);
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  private bindPointerParallax(camera: Three.PerspectiveCamera): void {
    const moveX = gsap.quickTo(camera.position, 'x', { duration: 0.42, ease: 'power3.out' });
    const moveY = gsap.quickTo(camera.position, 'y', { duration: 0.42, ease: 'power3.out' });

    const onPointerMove = (event: PointerEvent) => {
      const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      moveX(x * 0.75);
      moveY(y * -0.45);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    this.pointerCleanup = () => window.removeEventListener('pointermove', onPointerMove);
  }

  private buildParticleAttributes(THREE: typeof Three): { positions: number[]; colors: number[] } {
    const positions: number[] = [];
    const colors: number[] = [];
    const palette = [0xb8ff5a, 0x9be7ff, 0xc99bff, 0x75f0a2, 0xffd35a, 0xff7a78]
      .map((hex) => new THREE.Color(hex));

    for (let i = 0; i < this.particleCount; i += 1) {
      const radius = 2.8 + Math.random() * 8.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi) - 2
      );

      const color = palette[i % palette.length];
      colors.push(color.r, color.g, color.b);
    }

    return { positions, colors };
  }

  private hasWebGLContext(): boolean {
    if (this.isForcedNoWebGL()) {
      return false;
    }

    const canvas = this.document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  }

  private isLowEndDevice(): boolean {
    const cores = navigator.hardwareConcurrency || 2;
    const mobileViewport = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    return cores <= 4 || mobileViewport;
  }

  private async passesFpsProbe(): Promise<boolean> {
    const frameCount = 18;

    return new Promise((resolve) => {
      let frames = 0;
      let start = 0;

      const tick = (time: number) => {
        if (!start) {
          start = time;
        }

        frames += 1;

        if (frames >= frameCount) {
          const elapsed = Math.max(time - start, 1);
          resolve((frames / elapsed) * 1000 >= 45);
          return;
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }

  private isForcedFallback(): boolean {
    return new URLSearchParams(window.location.search).get('bg') === 'fallback';
  }

  private isForcedNoWebGL(): boolean {
    return new URLSearchParams(window.location.search).get('bg') === 'no-webgl';
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new DOMException('Background scene boot aborted.', 'AbortError');
    }
  }
}
