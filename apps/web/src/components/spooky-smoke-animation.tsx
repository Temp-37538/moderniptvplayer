"use client";
import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
type Mode = "light" | "dark";
type ModeColor = string | { light: string; dark: string };

type ProgramWithUniforms = WebGLProgram & {
  resolution: WebGLUniformLocation | null;
  time:       WebGLUniformLocation | null;
  u_color:    WebGLUniformLocation | null;
  u_bg:       WebGLUniformLocation | null;
};

// ─── Module-level state ───────────────────────────────────────────────────────
//
// Survit aux unmounts/remounts React (portée module, pas de reset SPA).
//
// _hasInitialized : true après le premier montage réussi.
//   → Au retour sur la landing page, shouldStart = true immédiatement
//     (pas de re-délai lazy de 1200ms qui donne l'impression d'un écran vide).
//
// NOTE — _persistedMs intentionnellement absent :
//   performance.now() / RAF DOMHighResTimeStamp est MONOTONE dans une SPA
//   (pas de rechargement de page). Après 10s sur la landing, reveal = 1 pour
//   toujours. Au retour à t=45s, time = 45.0 → reveal = 1 naturellement.
//   Pas besoin d'accumuler quoi que ce soit.

let _hasInitialized = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hexToRgb = (hex: string): Rgb | null => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255]
    : null;
};

const resolveModeColor = (color: ModeColor, mode: Mode): string =>
  typeof color === "string" ? color : color[mode];

// ─── GLSL — source unique partagée Worker + Fallback ─────────────────────────

const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){ gl_Position = position; }`;

// 3 octaves fbm au lieu de 4 : −25% charge GPU, imperceptible visuellement.
const FRAG = `#version 300 es
precision mediump float;
out vec4 O;
uniform float time;
uniform vec2  resolution;
uniform vec3  u_color;
uniform vec3  u_bg;

#define FC gl_FragCoord.xy
#define R  resolution
#define T  (time + 660.)

float rnd(vec2 p) {
  p  = fract(p * vec2(12.9898, 78.233));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(
    mix(rnd(i),               rnd(i + vec2(1, 0)), u.x),
    mix(rnd(i + vec2(0, 1)),  rnd(i + 1.),         u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = .0, a = 1.;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= mat2(1., -1.2, .2, 1.2) * 2.;
    a *= .5;
  }
  return v;
}

void main() {
  vec2 uv = (FC - .5 * R) / R.y;
  vec3 col = vec3(1.);

  uv.x += .25;
  uv   *= vec2(2., 1.);

  float n    = fbm(uv * .28 - vec2(T * .01, 0.));
  n          = noise(uv * 3. + n * 2.);
  vec2 drift = vec2(0., T * .015);

  col.r -= fbm(uv         + drift + n);
  col.g -= fbm(uv * 1.003 + drift + n + .003);
  col.b -= fbm(uv * 1.006 + drift + n + .006);

  col = mix(col, u_color, dot(col, vec3(.21, .71, .07)));

  float reveal    = min(time * .1, 1.);
  float smokeMask = smoothstep(.18, .95, dot(col, vec3(.21, .71, .07)));

  col = mix(u_bg, col, smokeMask * reveal);
  col = clamp(col, 0., 1.);

  O = vec4(col, 1.);
}`;

// ─── Worker source ────────────────────────────────────────────────────────────
// VERT et FRAG injectés via template literal — pas de duplication, pas de
// fichier worker séparé.

const WORKER_SOURCE = /* js */`
"use strict";

const VERT = \`${VERT}\`;
const FRAG = \`${FRAG}\`;

class Renderer {
  constructor(canvas) {
    this.canvas   = canvas;
    this.gl       = canvas.getContext("webgl2");
    this.color    = [0.5, 0.5, 0.5];
    this.bg       = [0.08, 0.08, 0.08];
    this.vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
    this._setup();
    this._init();
  }

  updateColor(c) { this.color = c; }

  updateBg(c) {
    this.bg = c;
    this.gl.clearColor(c[0], c[1], c[2], 1);
  }

  updateScale(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  _compile(shader, src) {
    const { gl } = this;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.error("Shader error:", gl.getShaderInfoLog(shader));
  }

  _setup() {
    const { gl } = this;
    this.vs      = gl.createShader(gl.VERTEX_SHADER);
    this.fs      = gl.createShader(gl.FRAGMENT_SHADER);
    this.program = gl.createProgram();
    this._compile(this.vs, VERT);
    this._compile(this.fs, FRAG);
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      console.error("Link error:", gl.getProgramInfoLog(this.program));
  }

  _init() {
    const { gl, program } = this;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    program._res   = gl.getUniformLocation(program, "resolution");
    program._time  = gl.getUniformLocation(program, "time");
    program._color = gl.getUniformLocation(program, "u_color");
    program._bg    = gl.getUniformLocation(program, "u_bg");
  }

  render(now) {
    const { gl, program, buffer, canvas, color, bg } = this;
    if (!program || !gl.isProgram(program)) return;
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(program._res,    canvas.width, canvas.height);
    gl.uniform1f(program._time,   now * 1e-3);
    gl.uniform3fv(program._color, color);
    gl.uniform3fv(program._bg,    bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    const { gl, program, vs, fs, buffer } = this;
    if (vs && program)  { gl.detachShader(program, vs); gl.deleteShader(vs); }
    if (fs && program)  { gl.detachShader(program, fs); gl.deleteShader(fs); }
    if (program) gl.deleteProgram(program);
    if (buffer)  gl.deleteBuffer(buffer);
  }
}

let renderer = null;
let rafId    = null;
let lastTime = 0;

const INTERVAL = 1000 / 24;

function loop(now) {
  rafId = requestAnimationFrame(loop);
  const delta = now - lastTime;
  if (delta < INTERVAL) return;
  lastTime = now - (delta % INTERVAL);
  renderer?.render(now);
}

self.onmessage = ({ data }) => {
  switch (data.type) {
    case "init":
      renderer = new Renderer(data.canvas);
      renderer.updateScale(data.width, data.height);
      if (data.color) renderer.updateColor(data.color);
      if (data.bg)    renderer.updateBg(data.bg);
      rafId = requestAnimationFrame(loop);
      break;
    case "resize":
      renderer?.updateScale(data.width, data.height);
      break;
    case "color":
      renderer?.updateColor(data.color);
      break;
    case "bg":
      renderer?.updateBg(data.bg);
      break;
    case "pause":
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      break;
    case "resume":
      if (rafId === null) { rafId = requestAnimationFrame(loop); }
      break;
    case "destroy":
      if (rafId !== null) cancelAnimationFrame(rafId);
      renderer?.destroy();
      renderer = null;
      break;
  }
};
`;

// ─── FallbackRenderer (main thread) ──────────────────────────────────────────

class FallbackRenderer {
  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
  private gl!: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private program: ProgramWithUniforms | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private color: Rgb = [0.5, 0.5, 0.5];
  private bg: Rgb    = [0.08, 0.08, 0.08];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.setup();
    this.init();
  }

  updateColor(color: Rgb) { this.color = color; }

  updateBg(bg: Rgb) {
    this.bg = bg;
    this.gl.clearColor(bg[0], bg[1], bg[2], 1);
  }

  updateScale() {
    const dpr          = Math.min(Math.max(1, window.devicePixelRatio), 1.5);
    this.canvas.width  = window.innerWidth  * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compile(shader: WebGLShader, source: string) {
    const { gl } = this;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(shader));
  }

  private setup() {
    const { gl } = this;
    this.vs      = gl.createShader(gl.VERTEX_SHADER);
    this.fs      = gl.createShader(gl.FRAGMENT_SHADER);
    this.program = gl.createProgram() as ProgramWithUniforms;
    if (!this.vs || !this.fs || !this.program) return;
    this.compile(this.vs, VERT);
    this.compile(this.fs, FRAG);
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(this.program));
  }

  private init() {
    const { gl, program } = this;
    if (!program) return;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    Object.assign(program, {
      resolution: gl.getUniformLocation(program, "resolution"),
      time:       gl.getUniformLocation(program, "time"),
      u_color:    gl.getUniformLocation(program, "u_color"),
      u_bg:       gl.getUniformLocation(program, "u_bg"),
    });
  }

  render(now = 0) {
    const { gl, program, buffer, canvas } = this;
    if (!program || !gl.isProgram(program)) return;
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(program.resolution, canvas.width, canvas.height);
    gl.uniform1f(program.time,       now * 1e-3);
    gl.uniform3fv(program.u_color,   this.color);
    gl.uniform3fv(program.u_bg,      this.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    const { gl, program, vs, fs, buffer } = this;
    if (vs && program)  { gl.detachShader(program, vs); gl.deleteShader(vs); }
    if (fs && program)  { gl.detachShader(program, fs); gl.deleteShader(fs); }
    if (program) gl.deleteProgram(program);
    if (buffer)  gl.deleteBuffer(buffer);
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SmokeBackgroundProps {
  smokeColor?: string;
  bgColor?:    ModeColor;
  mode?:       Mode;
  lazy?:       boolean;
  lazyDelay?:  number;
  className?:  string;
  style?:      React.CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SmokeBackground: React.FC<SmokeBackgroundProps> = ({
  smokeColor = "#808080",
  bgColor    = { light: "#FBEAE6", dark: "#141414" },
  mode       = "dark",
  lazy       = true,
  lazyDelay  = 1200,
  className,
  style,
}) => {
  // Container div — le canvas est créé programmatiquement dans useLayoutEffect.
  //
  // POURQUOI : si on utilise <canvas ref={...}>, React peut réutiliser le même
  // élément DOM entre les runs de useLayoutEffect (React Strict Mode, HMR).
  // transferControlToOffscreen() ne peut être appelé qu'UNE FOIS par canvas.
  // Créer le canvas nous-mêmes garantit un élément FRAIS à chaque run.
  const containerRef    = useRef<HTMLDivElement>(null);
  const workerRef       = useRef<Worker | null>(null);
  const fallbackRef     = useRef<FallbackRenderer | null>(null);
  const rendererModeRef = useRef<"worker" | "fallback" | null>(null);
  const objectUrlRef    = useRef<string | null>(null);

  // Refs pour les valeurs initiales des couleurs.
  // Évite d'avoir smokeColor/resolvedBgColor dans les deps du useLayoutEffect
  // principal sans créer de stale closure.
  const initColorRef = useRef(smokeColor);
  const initBgRef    = useRef("");
  initColorRef.current = smokeColor;

  // _hasInitialized : déjà chargé une fois → pas de re-délai lazy au retour.
  const [shouldStart, setShouldStart] = useState(!lazy || _hasInitialized);

  const resolvedBgColor = useMemo(
    () => resolveModeColor(bgColor, mode),
    [bgColor, mode],
  );

  initBgRef.current = resolvedBgColor;

  // ── Lazy start ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // Déjà initialisé lors d'une session précédente → démarrage immédiat.
    if (!lazy || _hasInitialized) { setShouldStart(true); return; }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    const start = () => setShouldStart(true);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(start, { timeout: lazyDelay });
    } else {
      timeoutId = setTimeout(start, lazyDelay);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window)
        window.cancelIdleCallback(idleId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [lazy, lazyDelay]);

  // ── Renderer principal ───────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (!shouldStart) return;

    const container = containerRef.current;
    if (!container) return;

    // Canvas créé programmatiquement → toujours frais, jamais réutilisé.
    // Aucun flag __offscreenTransferred sur l'élément DOM = aucun risque de
    // blocage en Strict Mode ou après navigation SPA.
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    container.appendChild(canvas);

    _hasInitialized = true;

    const color  = hexToRgb(initColorRef.current) ?? ([0.5,  0.5,  0.5 ] as Rgb);
    const bg     = hexToRgb(initBgRef.current)    ?? ([0.08, 0.08, 0.08] as Rgb);
    const dpr    = Math.min(Math.max(1, window.devicePixelRatio), 1.5);
    const width  = window.innerWidth  * dpr;
    const height = window.innerHeight * dpr;

    const supportsOffscreen =
      typeof OffscreenCanvas !== "undefined" &&
      typeof canvas.transferControlToOffscreen === "function";

    // ── Mode Worker (OffscreenCanvas) ─────────────────────────────────────────

    if (supportsOffscreen) {
      rendererModeRef.current = "worker";

      const blob   = new Blob([WORKER_SOURCE], { type: "application/javascript" });
      const url    = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const worker = new Worker(url);
      workerRef.current = worker;

      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ type: "init", canvas: offscreen, width, height, color, bg }, [offscreen]);

      // Pause quand le canvas sort du viewport (scroll ou navigation SPA
      // avec router cache qui garde le composant monté mais caché).
      const io = new IntersectionObserver(
        ([e]) => worker.postMessage({ type: e.isIntersecting ? "resume" : "pause" }),
        { threshold: 0 },
      );
      io.observe(canvas);

      // Pause quand l'onglet est masqué.
      const onVisibility = () =>
        worker.postMessage({ type: document.hidden ? "pause" : "resume" });
      document.addEventListener("visibilitychange", onVisibility);

      // pageshow : couvre le retour depuis le bfcache navigateur.
      const onPageShow = (e: PageTransitionEvent) => {
        if (e.persisted) worker.postMessage({ type: "resume" });
      };
      window.addEventListener("pageshow", onPageShow);

      // Resize debounce 100ms.
      let resizeTimer: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const d = Math.min(Math.max(1, window.devicePixelRatio), 1.5);
          worker.postMessage({ type: "resize", width: window.innerWidth * d, height: window.innerHeight * d });
        }, 100);
      };
      window.addEventListener("resize", onResize);

      return () => {
        clearTimeout(resizeTimer);
        try { worker.postMessage({ type: "destroy" }); } catch { /* worker peut déjà être mort */ }
        worker.terminate();
        io.disconnect();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pageshow", onPageShow);
        document.removeEventListener("visibilitychange", onVisibility);
        if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
        canvas.remove();
        workerRef.current       = null;
        rendererModeRef.current = null;
      };
    }

    // ── Mode Fallback (main thread) ───────────────────────────────────────────

    rendererModeRef.current = "fallback";

    const renderer = new FallbackRenderer(canvas);
    fallbackRef.current = renderer;
    renderer.updateColor(color);
    renderer.updateBg(bg);
    renderer.updateScale();

    let rafId: number | null = null;
    let lastTime = 0;
    const INTERVAL = 1000 / 24;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const delta = now - lastTime;
      if (delta < INTERVAL) return;
      lastTime = now - (delta % INTERVAL);
      renderer.render(now);
    };

    rafId = requestAnimationFrame(loop);

    const pause = () => { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } };
    const resume = () => { if (rafId === null) { rafId = requestAnimationFrame(loop); } };

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? resume() : pause()),
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", onVisibility);

    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) resume(); };
    window.addEventListener("pageshow", onPageShow);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderer.updateScale(), 100);
    };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(resizeTimer);
      pause();
      renderer.destroy();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.remove();
      fallbackRef.current     = null;
      rendererModeRef.current = null;
    };
  }, [shouldStart]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ Intentionnel : smokeColor et resolvedBgColor sont gérés par leurs propres
  //   effets ci-dessous via postMessage. Les mettre ici détruirait le worker à
  //   chaque changement de couleur.

  // ── Mise à jour dynamique couleur fumée ───────────────────────────────────

  useEffect(() => {
    if (!shouldStart) return;
    const color = hexToRgb(smokeColor);
    if (!color) return;
    if (rendererModeRef.current === "worker") { workerRef.current?.postMessage({ type: "color", color }); return; }
    fallbackRef.current?.updateColor(color);
  }, [shouldStart, smokeColor]);

  // ── Mise à jour dynamique couleur fond ────────────────────────────────────

  useEffect(() => {
    if (!shouldStart) return;
    const bg = hexToRgb(resolvedBgColor);
    if (!bg) return;
    if (rendererModeRef.current === "worker") { workerRef.current?.postMessage({ type: "bg", bg }); return; }
    fallbackRef.current?.updateBg(bg);
  }, [shouldStart, resolvedBgColor]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display:         "block",
        width:           "100%",
        height:          "100%",
        overflow:        "hidden",
        backgroundColor: resolvedBgColor,
        ...style,
      }}
    />
  );
};