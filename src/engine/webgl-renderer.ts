import type { MeshPoint, GlobalEngineSettings } from '../types/mesh';
import { hexToRgba } from './color-utils';

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

#define MAX_POINTS 64

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform int u_numPoints;
uniform vec2 u_points[MAX_POINTS];
uniform vec4 u_colors[MAX_POINTS]; // r, g, b, a in linear or oklab
uniform vec2 u_pointParams[MAX_POINTS]; // x: radius, y: intensity

uniform float u_smoothness; // Blend exponent (1.0 .. 6.0)
uniform int u_colorSpace; // 0: OKLab, 1: Linear sRGB, 2: sRGB
uniform float u_contrast;
uniform float u_saturation;
uniform float u_brightness;
uniform float u_hueShift; // in radians
uniform float u_noiseIntensity;
uniform float u_noiseScale;
uniform float u_seed;
uniform float u_vignetteIntensity;
uniform float u_vignetteRadius;
uniform int u_transparent;
uniform vec4 u_bgColor;

// sRGB to Linear
vec3 sRGBToLinear(vec3 c) {
  return pow(c, vec3(2.2));
}

// Linear to sRGB
vec3 linearTosRGB(vec3 c) {
  return pow(c, vec3(1.0 / 2.2));
}

// sRGB to OKLab
vec3 sRGBToOKLab(vec3 c) {
  vec3 lrgb = sRGBToLinear(c);
  float l = 0.4122214708 * lrgb.r + 0.5363325363 * lrgb.g + 0.0514459929 * lrgb.b;
  float m = 0.2119034982 * lrgb.r + 0.6806995451 * lrgb.g + 0.1073969566 * lrgb.b;
  float s = 0.0883024619 * lrgb.r + 0.2817188376 * lrgb.g + 0.6299787005 * lrgb.b;

  float l_ = pow(max(0.0, l), 1.0 / 3.0);
  float m_ = pow(max(0.0, m), 1.0 / 3.0);
  float s_ = pow(max(0.0, s), 1.0 / 3.0);

  return vec3(
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  );
}

// OKLab to sRGB
vec3 oklabTosRGB(vec3 lab) {
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;

  vec3 lrgb = vec3(
    +4.0767434753 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );

  return linearTosRGB(clamp(lrgb, 0.0, 1.0));
}

// Procedural film grain noise
float hash21(vec2 p, float seed) {
  p = fract(p * vec2(123.34, 456.21) + seed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Hue rotation
vec3 rotateHue(vec3 color, float angle) {
  const vec3 k = vec3(0.57735, 0.57735, 0.57735);
  float cosAngle = cos(angle);
  return color * cosAngle + cross(k, color) * sin(angle) + k * dot(k, color) * (1.0 - cosAngle);
}

void main() {
  // Flip Y coordinate so (0,0) is top-left matching DOM/Canvas coordinates
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);

  if (u_numPoints == 0) {
    if (u_transparent == 1) {
      gl_FragColor = vec4(0.0);
    } else {
      gl_FragColor = u_bgColor;
    }
    return;
  }

  // Inverse Distance Weighting with smooth falloffs
  vec4 accumulatedColor = vec4(0.0);
  float totalWeight = 0.0;

  for (int i = 0; i < MAX_POINTS; i++) {
    if (i >= u_numPoints) break;

    vec2 p = u_points[i];
    float radius = max(0.05, u_pointParams[i].x);
    float intensity = max(0.01, u_pointParams[i].y);

    float d = distance(uv, p);
    
    // Normalized distance scaled by radius
    float scaledDist = d / radius;

    // Smooth singularity-free inverse distance weight
    float w = intensity / (pow(scaledDist + 0.0002, u_smoothness));

    accumulatedColor += u_colors[i] * w;
    totalWeight += w;
  }

  vec4 blended = accumulatedColor / max(0.00001, totalWeight);

  // Convert blended color back to standard sRGB
  vec3 rgb;
  if (u_colorSpace == 0) {
    rgb = oklabTosRGB(blended.rgb);
  } else if (u_colorSpace == 1) {
    rgb = linearTosRGB(clamp(blended.rgb, 0.0, 1.0));
  } else {
    rgb = clamp(blended.rgb, 0.0, 1.0);
  }
  float alpha = clamp(blended.a, 0.0, 1.0);

  // Contrast adjustment
  rgb = (rgb - 0.5) * u_contrast + 0.5;

  // Saturation adjustment
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(luma), rgb, u_saturation);

  // Brightness adjustment
  rgb = rgb * u_brightness;

  // Hue shift
  if (abs(u_hueShift) > 0.001) {
    rgb = rotateHue(rgb, u_hueShift);
  }

  // Vignette effect
  if (u_vignetteIntensity > 0.001) {
    vec2 centerOffset = uv - vec2(0.5);
    float distFromCenter = length(centerOffset);
    float vignette = smoothstep(u_vignetteRadius, u_vignetteRadius - 0.5, distFromCenter);
    rgb = mix(rgb * vignette, rgb, 1.0 - u_vignetteIntensity);
  }

  // Procedural film grain noise
  if (u_noiseIntensity > 0.001) {
    vec2 noiseCoord = gl_FragCoord.xy * (u_noiseScale * 0.8);
    float noise = hash21(noiseCoord, u_seed) * 2.0 - 1.0;
    rgb += noise * (u_noiseIntensity * 0.25);
  }

  rgb = clamp(rgb, 0.0, 1.0);

  // Background blend if alpha < 1.0 and not transparent
  if (u_transparent == 0 && alpha < 1.0) {
    rgb = mix(u_bgColor.rgb, rgb, alpha);
    alpha = 1.0;
  }

  gl_FragColor = vec4(rgb * (u_transparent == 1 ? alpha : 1.0), alpha);
}
`;

export class WebGLMeshRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private canvas: HTMLCanvasElement;
  private uniformLocations: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initWebGL();
  }

  private initWebGL() {
    const gl = this.canvas.getContext('webgl', {
      premultipliedAlpha: false,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      console.warn('WebGL not supported, rendering may fail.');
      return;
    }

    this.gl = gl;

    const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    if (!vertShader || !fragShader) {
      console.error('Shader compilation error.');
      return;
    }

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;

    // Fullscreen quad [-1, -1] to [1, 1]
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Cache uniforms
    this.uniformLocations = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_numPoints: gl.getUniformLocation(program, 'u_numPoints'),
      u_smoothness: gl.getUniformLocation(program, 'u_smoothness'),
      u_colorSpace: gl.getUniformLocation(program, 'u_colorSpace'),
      u_contrast: gl.getUniformLocation(program, 'u_contrast'),
      u_saturation: gl.getUniformLocation(program, 'u_saturation'),
      u_brightness: gl.getUniformLocation(program, 'u_brightness'),
      u_hueShift: gl.getUniformLocation(program, 'u_hueShift'),
      u_noiseIntensity: gl.getUniformLocation(program, 'u_noiseIntensity'),
      u_noiseScale: gl.getUniformLocation(program, 'u_noiseScale'),
      u_seed: gl.getUniformLocation(program, 'u_seed'),
      u_vignetteIntensity: gl.getUniformLocation(program, 'u_vignetteIntensity'),
      u_vignetteRadius: gl.getUniformLocation(program, 'u_vignetteRadius'),
      u_transparent: gl.getUniformLocation(program, 'u_transparent'),
      u_bgColor: gl.getUniformLocation(program, 'u_bgColor'),
    };
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile log:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  public render(points: MeshPoint[], settings: GlobalEngineSettings, width: number, height: number) {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program) return;

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);

    // Setup quad geometry
    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Resolution
    gl.uniform2f(this.uniformLocations.u_resolution, width, height);

    // Points count
    const count = Math.min(points.length, 64);
    gl.uniform1i(this.uniformLocations.u_numPoints, count);

    // Prepare point arrays
    const pointCoords: number[] = [];
    const pointColors: number[] = [];
    const pointParams: number[] = [];

    const colorSpaceId = settings.colorSpace === 'oklab' ? 0 : settings.colorSpace === 'linear' ? 1 : 2;

    for (let i = 0; i < count; i++) {
      const pt = points[i];
      pointCoords.push(pt.x, pt.y);

      const rgba = hexToRgba(pt.color, pt.alpha);
      const r = rgba.r / 255;
      const g = rgba.g / 255;
      const b = rgba.b / 255;

      if (colorSpaceId === 0) {
        // Pre-convert to OKLab on CPU for performance
        const oklab = rgbToOKLab(r, g, b);
        pointColors.push(oklab[0], oklab[1], oklab[2], rgba.a);
      } else if (colorSpaceId === 1) {
        // Linear sRGB
        pointColors.push(Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2), rgba.a);
      } else {
        // Standard sRGB
        pointColors.push(r, g, b, rgba.a);
      }

      pointParams.push(pt.radius, pt.intensity);
    }

    // Set array uniforms
    for (let i = 0; i < count; i++) {
      const pLoc = gl.getUniformLocation(program, `u_points[${i}]`);
      const cLoc = gl.getUniformLocation(program, `u_colors[${i}]`);
      const paramLoc = gl.getUniformLocation(program, `u_pointParams[${i}]`);

      if (pLoc) gl.uniform2f(pLoc, pointCoords[i * 2], pointCoords[i * 2 + 1]);
      if (cLoc) gl.uniform4f(cLoc, pointColors[i * 4], pointColors[i * 4 + 1], pointColors[i * 4 + 2], pointColors[i * 4 + 3]);
      if (paramLoc) gl.uniform2f(paramLoc, pointParams[i * 2], pointParams[i * 2 + 1]);
    }

    // Settings uniforms
    gl.uniform1f(this.uniformLocations.u_smoothness, settings.smoothness);
    gl.uniform1i(this.uniformLocations.u_colorSpace, colorSpaceId);
    gl.uniform1f(this.uniformLocations.u_contrast, settings.contrast);
    gl.uniform1f(this.uniformLocations.u_saturation, settings.saturation);
    gl.uniform1f(this.uniformLocations.u_brightness, settings.brightness);
    gl.uniform1f(this.uniformLocations.u_hueShift, (settings.hueShift * Math.PI) / 180);
    gl.uniform1f(this.uniformLocations.u_noiseIntensity, settings.noiseIntensity);
    gl.uniform1f(this.uniformLocations.u_noiseScale, settings.noiseScale);
    gl.uniform1f(this.uniformLocations.u_seed, settings.seed);
    gl.uniform1f(this.uniformLocations.u_vignetteIntensity, settings.vignetteIntensity);
    gl.uniform1f(this.uniformLocations.u_vignetteRadius, settings.vignetteRadius);
    gl.uniform1i(this.uniformLocations.u_transparent, settings.transparentBackground ? 1 : 0);

    const bgRgba = hexToRgba(settings.backgroundColor || '#000000');
    gl.uniform4f(
      this.uniformLocations.u_bgColor,
      bgRgba.r / 255,
      bgRgba.g / 255,
      bgRgba.b / 255,
      bgRgba.a
    );

    // Draw full screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.program) gl.deleteProgram(this.program);
    this.gl = null;
  }
}

// CPU OKLab helper for uniforms
function rgbToOKLab(r: number, g: number, b: number): [number, number, number] {
  const lr = Math.pow(r, 2.2);
  const lg = Math.pow(g, 2.2);
  const lb = Math.pow(b, 2.2);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(Math.max(0, l));
  const m_ = Math.cbrt(Math.max(0, m));
  const s_ = Math.cbrt(Math.max(0, s));

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}
