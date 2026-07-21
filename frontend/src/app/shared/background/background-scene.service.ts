import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, NgZone, Signal, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import type * as Three from 'three';
import { LenisService } from '../../core/motion/lenis.service';
import { MotionQualityTier, MotionService } from '../../core/motion/motion.service';

export type BackgroundSceneMode = 'live' | 'static' | 'fallback';
export type BackgroundSceneRenderMode = 'ambient' | 'welcome';
export type BackgroundSceneAccentName = 'phosphor' | 'violet' | 'cyan' | 'green';

export interface BackgroundSceneAccent {
  name: BackgroundSceneAccentName;
  token: string;
  cssColor: string;
}

export function operationAccentEnabledForMotion(
  tier: MotionQualityTier,
  reducedMotion: boolean,
  documentVisible = true
): boolean {
  return tier === 'high' && !reducedMotion && documentVisible;
}

interface ParticleLayer {
  geometry: Three.BufferGeometry;
  material: Three.ShaderMaterial;
  points: Three.Points;
  speedX: number;
  speedY: number;
}

interface SceneHandles {
  camera: Three.PerspectiveCamera;
  cursorLight: { x: number; y: number; targetX: number; targetY: number; enabled: number };
  cursorDrift: { x: number; y: number };
  layers: ParticleLayer[];
  renderer: Three.WebGLRenderer;
  resizeObserver: ResizeObserver;
  scene: Three.Scene;
  staticRender: boolean;
  tint: { r: number; g: number; b: number };
  vignette: { r: number; g: number; b: number };
  welcome?: WelcomeSceneHandles;
}

interface WelcomeSceneHandles {
  geometry: Three.BufferGeometry;
  material: Three.ShaderMaterial;
  points: Three.Points;
  prism?: {
    geometry: Three.BoxGeometry;
    material: Three.MeshPhysicalMaterial;
    mesh: Three.Mesh;
  };
}

const SCENE_ACCENTS: Record<BackgroundSceneAccentName, Omit<BackgroundSceneAccent, 'cssColor'>> = {
  phosphor: { name: 'phosphor', token: '--color-phosphor-particle' },
  violet: { name: 'violet', token: '--color-violet-particle' },
  cyan: { name: 'cyan', token: '--color-cyan-particle' },
  green: { name: 'green', token: '--color-green-particle' }
};

const FALLBACK_ACCENT_COLORS: Record<BackgroundSceneAccentName, string> = {
  phosphor: 'oklch(86% 0.26 130)',
  violet: 'oklch(75% 0.24 300)',
  cyan: 'oklch(82% 0.20 205)',
  green: 'oklch(72% 0.23 150)'
};

export function backgroundSceneAccentNameForRoute(url: string): BackgroundSceneAccentName {
  const path = url.split('?')[0].split('#')[0].toLowerCase();

  if (path.startsWith('/stories') || path.includes('/analysis')) {
    return 'violet';
  }

  if (path.startsWith('/test-suites') || path.includes('/test-generation') || path.includes('/test-cases')) {
    return 'cyan';
  }

  if (path.startsWith('/review-board')) {
    return 'green';
  }

  return 'phosphor';
}

export function backgroundSceneModeForRoute(url: string): BackgroundSceneRenderMode {
  const path = url.split('?')[0].split('#')[0];
  return path === '/' || path === '' ? 'welcome' : 'ambient';
}

@Injectable({ providedIn: 'root' })
export class BackgroundSceneService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lenis = inject(LenisService);
  private readonly zone = inject(NgZone);
  private readonly motion = inject(MotionService);
  private readonly router = inject(Router);

  private animationFrame = 0;
  private accentPalette?: Record<BackgroundSceneAccentName, Three.Color>;
  private handles?: SceneHandles;
  private pointerCleanup?: () => void;
  private operationAccentName: Extract<BackgroundSceneAccentName, 'violet' | 'cyan'> | null = null;
  private operationAccentTween?: { kill(): void };
  private readonly operationAccentMix = { amount: 0 };
  private scrollParallaxY = 0;
  private readonly particleCount = 700;
  private readonly dprCap = 1.5;
  private readonly sceneAccentState = signal<BackgroundSceneAccent>(this.resolveAccent(this.router.url));

  readonly sceneAccent: Signal<BackgroundSceneAccent> = this.sceneAccentState.asReadonly();

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => this.setRouteAccent(event.urlAfterRedirects || event.url));

    effect(() => {
      this.syncMotionPolicy(
        this.motion.sceneEffectsEnabled(),
        this.motion.cursorEffectsEnabled()
      );
    });
  }

  async init(
    host: HTMLElement,
    signal?: AbortSignal,
    renderMode: BackgroundSceneRenderMode = 'ambient'
  ): Promise<BackgroundSceneMode> {
    this.dispose();

    if (this.motion.forcedFallback() || this.motion.qualityTier() === 'static' || !this.hasWebGLContext()) {
      return 'fallback';
    }

    this.throwIfAborted(signal);

    const THREE = await import('three');
    this.throwIfAborted(signal);

    this.accentPalette = this.readAccentPalette(THREE);
    const reducedMotion = this.motion.reducedMotion();
    this.createScene(THREE, host, reducedMotion, renderMode);

    return reducedMotion ? 'static' : 'live';
  }

  dispose(): void {
    this.operationAccentTween?.kill();
    this.operationAccentTween = undefined;
    this.operationAccentMix.amount = 0;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }

    this.pointerCleanup?.();
    this.pointerCleanup = undefined;

    if (!this.handles) {
      return;
    }

    const { layers, renderer, resizeObserver } = this.handles;
    resizeObserver.disconnect();
    layers.forEach((layer) => {
      layer.geometry.dispose();
      layer.material.dispose();
    });
    this.handles.welcome?.geometry.dispose();
    this.handles.welcome?.material.dispose();
    this.handles.welcome?.prism?.geometry.dispose();
    this.handles.welcome?.prism?.material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    this.handles = undefined;
  }

  setWelcomeProgress(progress: number): void {
    const welcome = this.handles?.welcome;
    if (!welcome) {
      return;
    }

    welcome.material.uniforms['uProgress'].value = Math.max(0, Math.min(1, progress));
  }

  setSceneAccent(name: BackgroundSceneAccentName): void {
    const token = SCENE_ACCENTS[name].token;
    const accent = {
      ...SCENE_ACCENTS[name],
      cssColor: this.readCssToken(token, FALLBACK_ACCENT_COLORS[name])
    };
    this.sceneAccentState.set(accent);
    this.applyAccent(name);
  }

  setOperationAccent(name: Extract<BackgroundSceneAccentName, 'violet' | 'cyan'> | null): void {
    if (name === null) {
      this.operationAccentName = null;
      this.pauseOperationAccentPulse();
      return;
    }

    this.operationAccentName = name;
    const enabled = operationAccentEnabledForMotion(
      this.motion.qualityTier(),
      this.motion.reducedMotion(),
      this.motion.documentVisible()
    );

    if (!enabled) {
      this.pauseOperationAccentPulse();
      return;
    }

    if (this.operationAccentName === name && this.operationAccentTween) {
      return;
    }

    this.startOperationAccentPulse();
  }

  private createScene(
    THREE: typeof Three,
    host: HTMLElement,
    reducedMotion: boolean,
    renderMode: BackgroundSceneRenderMode
  ): void {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    const accentColor = this.currentAccentColor(THREE);
    scene.fog = new THREE.FogExp2(accentColor.clone(), 0.018);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    host.appendChild(renderer.domElement);

    const layers = renderMode === 'welcome' ? [] : this.buildParticleLayers(THREE, accentColor);
    layers.forEach(({ points }) => scene.add(points));
    const welcome = renderMode === 'welcome'
      ? this.buildWelcomeScene(THREE, renderer, accentColor, reducedMotion)
      : undefined;
    if (welcome) {
      scene.add(welcome.points);
      if (welcome.prism) {
        scene.add(welcome.prism.mesh);
      }
    }

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      layers.forEach(({ material }) => {
        material.uniforms['uPixelRatio'].value = Math.min(window.devicePixelRatio || 1, this.dprCap);
      });
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    this.handles = {
      camera,
      cursorLight: { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, enabled: 0 },
      cursorDrift: { x: 0, y: 0 },
      layers,
      renderer,
      resizeObserver,
      scene,
      staticRender: reducedMotion,
      tint: { r: accentColor.r, g: accentColor.g, b: accentColor.b },
      vignette: { r: accentColor.r, g: accentColor.g, b: accentColor.b },
      welcome
    };
    resize();

    this.syncMotionPolicy(
      this.motion.sceneEffectsEnabled(),
      this.motion.cursorEffectsEnabled()
    );
  }

  private animate(): void {
    if (!this.handles || !this.motion.sceneEffectsEnabled() || !this.motion.documentVisible()) {
      this.animationFrame = 0;
      return;
    }

    const { camera, cursorDrift, cursorLight, layers, renderer, scene, welcome } = this.handles;
    const targetScroll = this.motion.qualityTier() === 'static'
      ? 0
      : Math.max(-0.4, Math.min(0.4, this.lenis.scrollVelocity() * 0.035));
    this.scrollParallaxY += (targetScroll - this.scrollParallaxY) * 0.11;
    camera.position.x = cursorDrift.x;
    camera.position.y = cursorDrift.y + this.scrollParallaxY;

    cursorLight.x += (cursorLight.targetX - cursorLight.x) * 0.06;
    cursorLight.y += (cursorLight.targetY - cursorLight.y) * 0.06;
    layers.forEach((layer) => {
      layer.points.rotation.y += layer.speedY;
      layer.points.rotation.x += layer.speedX;
      layer.material.uniforms['uCursor'].value.set(cursorLight.x, cursorLight.y);
      layer.material.uniforms['uLightEnabled'].value = cursorLight.enabled;
    });
    if (welcome) {
      welcome.material.uniforms['uTime'].value += 0.016;
      if (welcome.prism) {
        welcome.prism.mesh.rotation.x += 0.0022;
        welcome.prism.mesh.rotation.y += 0.0035;
        welcome.prism.mesh.rotation.z += 0.0012;
      }
    }
    renderer.render(scene, camera);
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = 0;
      this.animate();
    });
  }

  private bindPointerInteraction(): void {
    if (!this.handles || this.pointerCleanup || !this.motion.cursorEffectsEnabled()) {
      return;
    }

    const { cursorDrift, cursorLight } = this.handles;
    const moveX = this.motion.gsap.quickTo(cursorDrift, 'x', { duration: 0.42, ease: 'power3.out' });
    const moveY = this.motion.gsap.quickTo(cursorDrift, 'y', { duration: 0.42, ease: 'power3.out' });

    const onPointerMove = (event: PointerEvent) => {
      const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      moveX(x * 0.75);
      moveY(y * -0.45);
      cursorLight.targetX = x + 0.5;
      cursorLight.targetY = 1 - (y + 0.5);
      cursorLight.enabled = 1;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    this.pointerCleanup = () => window.removeEventListener('pointermove', onPointerMove);
  }

  private syncMotionPolicy(sceneEnabled: boolean, cursorEnabled: boolean): void {
    if (!sceneEnabled) {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
      }
      this.pointerCleanup?.();
      this.pointerCleanup = undefined;
      if (this.handles) {
        this.handles.cursorLight.enabled = 0;
      }
      this.pauseOperationAccentPulse();
      return;
    }

    if (cursorEnabled) {
      this.bindPointerInteraction();
    } else {
      this.pointerCleanup?.();
      this.pointerCleanup = undefined;
      if (this.handles) {
        this.handles.cursorLight.enabled = 0;
      }
    }

    if (this.handles && !this.animationFrame) {
      this.zone.runOutsideAngular(() => this.animate());
    }
    if (this.operationAccentName) {
      this.startOperationAccentPulse();
    }
  }

  private buildParticleLayers(THREE: typeof Three, color: Three.Color): ParticleLayer[] {
    const bands = [
      { count: Math.floor(this.particleCount * 0.34), opacity: 0.28, size: 22, zMin: -9.5, zMax: -5.2, speedX: 0.00008, speedY: 0.00016 },
      { count: Math.floor(this.particleCount * 0.38), opacity: 0.46, size: 28, zMin: -5.2, zMax: -1.2, speedX: 0.00014, speedY: 0.00032 },
      { count: 0, opacity: 0.62, size: 36, zMin: -1.2, zMax: 2.4, speedX: 0.0002, speedY: 0.00048 }
    ];
    bands[2].count = this.particleCount - bands[0].count - bands[1].count;

    return bands.map((band) => {
      const positions: number[] = [];
      const sizeScales: number[] = [];

      for (let i = 0; i < band.count; i += 1) {
        const radius = 2.6 + Math.random() * 8.6;
        const theta = Math.random() * Math.PI * 2;
        const z = band.zMin + Math.random() * (band.zMax - band.zMin);
        positions.push(
          radius * Math.cos(theta),
          radius * Math.sin(theta),
          z
        );
        sizeScales.push(0.72 + Math.random() * 0.64);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('sizeScale', new THREE.Float32BufferAttribute(sizeScales, 1));

      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: color.clone() },
          uCursor: { value: new THREE.Vector2(0.5, 0.5) },
          uLightEnabled: { value: 0 },
          uLightRadius: { value: 0.18 },
          uOpacity: { value: band.opacity },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, this.dprCap) },
          uSize: { value: band.size },
          uVignette: { value: color.clone() }
        },
        vertexShader: `
          uniform float uPixelRatio;
          uniform float uSize;
          attribute float sizeScale;
          varying vec2 vScreenUv;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vec4 projected = projectionMatrix * mvPosition;
            gl_Position = projected;
            vScreenUv = projected.xy / projected.w * 0.5 + 0.5;
            gl_PointSize = uSize * sizeScale * uPixelRatio * (12.0 / max(-mvPosition.z, 0.1));
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec2 uCursor;
          uniform float uLightEnabled;
          uniform float uLightRadius;
          uniform float uOpacity;
          uniform vec3 uVignette;
          varying vec2 vScreenUv;

          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) {
              discard;
            }

            float particleAlpha = smoothstep(0.5, 0.12, d) * uOpacity;
            float cursorFalloff = 1.0 - smoothstep(0.0, uLightRadius, length(vScreenUv - uCursor));
            float brightness = 1.0 + (0.2 * cursorFalloff * uLightEnabled);
            float edgeTint = smoothstep(0.28, 0.88, length(vScreenUv - vec2(0.5)));
            vec3 graded = mix(uColor * brightness, uVignette * 0.42, edgeTint * 0.22);
            gl_FragColor = vec4(graded, particleAlpha);
          }
        `
      });

      return {
        geometry,
        material,
        points: new THREE.Points(geometry, material),
        speedX: band.speedX,
        speedY: band.speedY
      };
    });
  }

  private buildWelcomeScene(
    THREE: typeof Three,
    renderer: Three.WebGLRenderer,
    color: Three.Color,
    reducedMotion: boolean
  ): WelcomeSceneHandles {
    const particleTotal = this.motion.qualityTier() === 'high' ? 960 : 640;
    const positions: number[] = [];
    const targets: number[] = [];
    const phases: number[] = [];

    for (let i = 0; i < particleTotal; i += 1) {
      const row = i % 8;
      const column = Math.floor(i / 8) % 12;
      const x = -9.5 - Math.random() * 4.5;
      const y = (Math.random() - 0.5) * 5.4;
      const z = (Math.random() - 0.5) * 3.6;
      positions.push(x, y, z);
      targets.push((column - 5.5) * 0.42 + 4.8, (row - 3.5) * 0.42, (Math.floor(i / 96) % 5 - 2) * 0.22);
      phases.push(Math.random() * Math.PI * 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('targetPosition', new THREE.Float32BufferAttribute(targets, 3));
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: color.clone() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, this.dprCap) },
        uProgress: { value: reducedMotion ? 1 : 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        uniform float uPixelRatio;
        uniform float uProgress;
        uniform float uTime;
        attribute vec3 targetPosition;
        attribute float phase;
        varying float vOrder;

        void main() {
          float gate = smoothstep(0.08, 0.82, uProgress + sin(phase) * 0.025);
          vec3 chaos = position;
          chaos.x += uProgress * 8.2;
          chaos.y += sin(uTime * 1.7 + phase) * (1.0 - gate) * 0.34;
          chaos.z += cos(uTime * 1.3 + phase) * (1.0 - gate) * 0.28;
          vec3 transformed = mix(chaos, targetPosition, gate);
          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = (18.0 + gate * 10.0) * uPixelRatio * (12.0 / max(-mvPosition.z, 0.1));
          vOrder = gate;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vOrder;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) {
            discard;
          }
          float alpha = smoothstep(0.5, 0.08, d) * mix(0.32, 0.82, vOrder);
          gl_FragColor = vec4(uColor * mix(0.55, 1.35, vOrder), alpha);
        }
      `
    });

    const points = new THREE.Points(geometry, material);
    const handles: WelcomeSceneHandles = { geometry, material, points };

    if (this.motion.qualityTier() === 'high' && !reducedMotion) {
      const envCanvas = this.document.createElement('canvas');
      envCanvas.width = 32;
      envCanvas.height = 16;
      const context = envCanvas.getContext('2d');
      if (context) {
        const gradient = context.createLinearGradient(0, 0, envCanvas.width, envCanvas.height);
        gradient.addColorStop(0, '#b8ff5a');
        gradient.addColorStop(0.45, '#9be7ff');
        gradient.addColorStop(1, '#c99bff');
        context.fillStyle = gradient;
        context.fillRect(0, 0, envCanvas.width, envCanvas.height);
      }
      const texture = new THREE.CanvasTexture(envCanvas);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envMap = pmrem.fromEquirectangular(texture).texture;
      pmrem.dispose();
      const prismGeometry = new THREE.BoxGeometry(1.8, 2.8, 1.8);
      const prismMaterial = new THREE.MeshPhysicalMaterial({
        color: color.clone(),
        transmission: 1,
        roughness: 0.08,
        thickness: 1.5,
        ior: 1.5,
        transparent: true,
        opacity: 0.72,
        envMap
      });
      const mesh = new THREE.Mesh(prismGeometry, prismMaterial);
      mesh.position.set(0.25, 0, -0.4);
      handles.prism = { geometry: prismGeometry, material: prismMaterial, mesh };
    }

    return handles;
  }

  private setRouteAccent(url: string): void {
    const accent = this.resolveAccent(url);
    this.sceneAccentState.set(accent);
    if (!this.operationAccentTween) {
      this.applyAccent(accent.name);
    }
  }

  private startOperationAccentPulse(): void {
    this.operationAccentTween?.kill();
    this.operationAccentTween = undefined;
    this.operationAccentMix.amount = 0;

    if (
      !this.handles
      || !this.operationAccentName
      || !operationAccentEnabledForMotion(
        this.motion.qualityTier(),
        this.motion.reducedMotion(),
        this.motion.documentVisible()
      )
    ) {
      return;
    }

    this.operationAccentTween = this.motion.gsap.to(this.operationAccentMix, {
      amount: 0.1,
      duration: 0.7,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      onUpdate: () => this.renderOperationAccentMix()
    });
  }

  private stopOperationAccentPulse(): void {
    this.operationAccentName = null;
    this.pauseOperationAccentPulse();
  }

  private pauseOperationAccentPulse(): void {
    const hadPulse = !!this.operationAccentTween || this.operationAccentMix.amount !== 0;
    this.operationAccentTween?.kill();
    this.operationAccentTween = undefined;
    this.operationAccentMix.amount = 0;

    if (hadPulse) {
      this.applyAccentImmediately(this.sceneAccent().name);
    }
  }

  private applyAccentImmediately(name: BackgroundSceneAccentName): void {
    if (!this.handles) {
      return;
    }

    const color = this.currentAccentColor(undefined, name);
    Object.assign(this.handles.tint, { r: color.r, g: color.g, b: color.b });
    Object.assign(this.handles.vignette, { r: color.r, g: color.g, b: color.b });
    this.handles.layers.forEach(({ material }) => {
      material.uniforms['uColor'].value.setRGB(color.r, color.g, color.b);
      material.uniforms['uVignette'].value.setRGB(color.r, color.g, color.b);
      material.uniforms['uLightEnabled'].value = 0;
    });
    if (this.handles.scene.fog) {
      this.handles.scene.fog.color.setRGB(color.r, color.g, color.b);
    }
    this.handles.renderer.render(this.handles.scene, this.handles.camera);
  }

  private renderOperationAccentMix(): void {
    if (!this.handles || !this.operationAccentName) {
      return;
    }

    const base = this.currentAccentColor(undefined, this.sceneAccent().name);
    const operation = this.currentAccentColor(undefined, this.operationAccentName);
    const amount = this.operationAccentMix.amount;
    const r = base.r + (operation.r - base.r) * amount;
    const g = base.g + (operation.g - base.g) * amount;
    const b = base.b + (operation.b - base.b) * amount;

    Object.assign(this.handles.tint, { r, g, b });
    Object.assign(this.handles.vignette, { r, g, b });
    this.handles.layers.forEach(({ material }) => {
      material.uniforms['uColor'].value.setRGB(r, g, b);
      material.uniforms['uVignette'].value.setRGB(r, g, b);
    });
    if (this.handles.scene.fog) {
      this.handles.scene.fog.color.setRGB(r, g, b);
    }
  }

  private applyAccent(name: BackgroundSceneAccentName): void {
    if (!this.handles) {
      return;
    }

    if (!this.motion.sceneEffectsEnabled()) {
      this.applyAccentImmediately(name);
      return;
    }

    const color = this.currentAccentColor(undefined, name);
    const duration = this.handles.staticRender ? 0 : this.sceneDurationSeconds();
    const target = { r: color.r, g: color.g, b: color.b };

    this.motion.gsap.to(this.handles.tint, {
      ...target,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        this.handles?.layers.forEach(({ material }) => {
          material.uniforms['uColor'].value.setRGB(this.handles!.tint.r, this.handles!.tint.g, this.handles!.tint.b);
        });
        if (this.handles?.staticRender) {
          this.handles.renderer.render(this.handles.scene, this.handles.camera);
        }
      }
    });

    this.motion.gsap.to(this.handles.vignette, {
      ...target,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (this.handles?.scene.fog) {
          this.handles.scene.fog.color.setRGB(this.handles.vignette.r, this.handles.vignette.g, this.handles.vignette.b);
        }
        this.handles?.layers.forEach(({ material }) => {
          material.uniforms['uVignette'].value.setRGB(this.handles!.vignette.r, this.handles!.vignette.g, this.handles!.vignette.b);
        });
      }
    });
  }

  private sceneDurationSeconds(): number {
    const token = getComputedStyle(this.document.documentElement).getPropertyValue('--dur-scene').trim();
    const milliseconds = /([\d.]+)ms/.exec(token);
    if (milliseconds) {
      return Number(milliseconds[1]) / 1000;
    }

    const seconds = /([\d.]+)s/.exec(token);
    return seconds ? Number(seconds[1]) : 0.7;
  }

  private resolveAccent(url: string): BackgroundSceneAccent {
    const name = this.accentNameForRoute(url);
    const token = SCENE_ACCENTS[name].token;
    return {
      ...SCENE_ACCENTS[name],
      cssColor: this.readCssToken(token, FALLBACK_ACCENT_COLORS[name])
    };
  }

  private accentNameForRoute(url: string): BackgroundSceneAccentName {
    return backgroundSceneAccentNameForRoute(url);
  }

  private readAccentPalette(THREE: typeof Three): Record<BackgroundSceneAccentName, Three.Color> {
    return {
      phosphor: this.cssColorToThree(THREE, this.readCssToken('--color-phosphor-particle', FALLBACK_ACCENT_COLORS.phosphor)),
      violet: this.cssColorToThree(THREE, this.readCssToken('--color-violet-particle', FALLBACK_ACCENT_COLORS.violet)),
      cyan: this.cssColorToThree(THREE, this.readCssToken('--color-cyan-particle', FALLBACK_ACCENT_COLORS.cyan)),
      green: this.cssColorToThree(THREE, this.readCssToken('--color-green-particle', FALLBACK_ACCENT_COLORS.green))
    };
  }

  private currentAccentColor(THREE?: typeof Three, name = this.sceneAccent().name): Three.Color {
    const color = this.accentPalette?.[name];
    if (color) {
      return color.clone();
    }

    if (!THREE) {
      throw new Error('Background accent palette has not been initialized.');
    }

    return this.cssColorToThree(THREE, this.sceneAccent().cssColor);
  }

  private readCssToken(token: string, fallback: string): string {
    return getComputedStyle(this.document.documentElement).getPropertyValue(token).trim() || fallback;
  }

  private cssColorToThree(THREE: typeof Three, cssColor: string): Three.Color {
    const rgb = this.oklchToSrgb(cssColor);
    return new THREE.Color(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  }

  private oklchToSrgb(cssColor: string): { r: number; g: number; b: number } {
    const match = /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*[\d.]+%?)?\s*\)/i.exec(cssColor);
    if (!match) {
      return { r: 184, g: 255, b: 90 };
    }

    const lightness = Number(match[1]) / 100;
    const chroma = Number(match[2]);
    const hue = Number(match[3]) * Math.PI / 180;
    const a = Math.cos(hue) * chroma;
    const b = Math.sin(hue) * chroma;

    const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const sPrime = lightness - 0.0894841775 * a - 1.2914855480 * b;

    const l = lPrime ** 3;
    const m = mPrime ** 3;
    const s = sPrime ** 3;

    const red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const blue = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    return {
      r: this.linearToSrgbByte(red),
      g: this.linearToSrgbByte(green),
      b: this.linearToSrgbByte(blue)
    };
  }

  private linearToSrgbByte(channel: number): number {
    const clamped = Math.max(0, Math.min(1, channel));
    const srgb = clamped <= 0.0031308
      ? clamped * 12.92
      : 1.055 * (clamped ** (1 / 2.4)) - 0.055;
    return Math.round(srgb * 255);
  }

  private hasWebGLContext(): boolean {
    if (this.isForcedNoWebGL()) {
      return false;
    }

    const canvas = this.document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
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
