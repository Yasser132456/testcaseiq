declare module 'three' {
  export const AdditiveBlending: number;

  export class BufferGeometry {
    setAttribute(name: string, attribute: Float32BufferAttribute): void;
    dispose(): void;
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number);
  }

  export class Color {
    constructor(hex: number);
    constructor(style: string);
    r: number;
    g: number;
    b: number;
    clone(): Color;
    setRGB(r: number, g: number, b: number): this;
  }

  export class FogExp2 {
    constructor(color: Color, density?: number);
    color: Color;
  }

  export class Float32BufferAttribute {
    constructor(array: number[], itemSize: number);
  }

  export class CanvasTexture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    aspect: number;
    position: { set(x: number, y: number, z: number): void; x: number; y: number; z: number };
    updateProjectionMatrix(): void;
  }

  export class Points {
    constructor(geometry: BufferGeometry, material: PointsMaterial | ShaderMaterial);
    rotation: { x: number; y: number; z: number };
  }

  export class Mesh {
    constructor(geometry: BufferGeometry, material: MeshPhysicalMaterial);
    rotation: { x: number; y: number; z: number };
    position: { set(x: number, y: number, z: number): void; x: number; y: number; z: number };
  }

  export interface MeshPhysicalMaterialParameters {
    color?: Color | number;
    transmission?: number;
    roughness?: number;
    thickness?: number;
    ior?: number;
    transparent?: boolean;
    opacity?: number;
    envMap?: unknown;
  }

  export class MeshPhysicalMaterial {
    constructor(parameters?: MeshPhysicalMaterialParameters);
    dispose(): void;
  }

  export interface PointsMaterialParameters {
    size?: number;
    vertexColors?: boolean;
    transparent?: boolean;
    opacity?: number;
    depthWrite?: boolean;
    blending?: number;
  }

  export class PointsMaterial {
    constructor(parameters?: PointsMaterialParameters);
    dispose(): void;
  }

  export interface ShaderMaterialParameters {
    transparent?: boolean;
    depthWrite?: boolean;
    blending?: number;
    uniforms?: Record<string, { value: unknown }>;
    vertexShader?: string;
    fragmentShader?: string;
  }

  export class ShaderMaterial {
    constructor(parameters?: ShaderMaterialParameters);
    uniforms: Record<string, { value: any }>;
    dispose(): void;
  }

  export class Scene {
    fog: FogExp2 | null;
    add(object: Points | Mesh): void;
  }

  export class Vector2 {
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
  }

  export class PMREMGenerator {
    constructor(renderer: WebGLRenderer);
    fromEquirectangular(texture: CanvasTexture): { texture: unknown };
    dispose(): void;
  }

  export interface WebGLRendererParameters {
    alpha?: boolean;
    antialias?: boolean;
    powerPreference?: WebGLPowerPreference;
  }

  export class WebGLRenderer {
    constructor(parameters?: WebGLRendererParameters);
    domElement: HTMLCanvasElement;
    setClearColor(color: number, alpha?: number): void;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }
}
