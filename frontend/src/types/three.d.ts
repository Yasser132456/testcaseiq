declare module 'three' {
  export const AdditiveBlending: number;

  export class BufferGeometry {
    setAttribute(name: string, attribute: Float32BufferAttribute): void;
    dispose(): void;
  }

  export class Color {
    constructor(hex: number);
    r: number;
    g: number;
    b: number;
  }

  export class Float32BufferAttribute {
    constructor(array: number[], itemSize: number);
  }

  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    aspect: number;
    position: { set(x: number, y: number, z: number): void; x: number; y: number; z: number };
    updateProjectionMatrix(): void;
  }

  export class Points {
    constructor(geometry: BufferGeometry, material: PointsMaterial);
    rotation: { x: number; y: number; z: number };
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

  export class Scene {
    add(object: Points): void;
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
