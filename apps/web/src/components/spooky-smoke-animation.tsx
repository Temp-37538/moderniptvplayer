"use client";

import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];
type Mode = "light" | "dark";
type ModeColor = string | { light: string; dark: string };

type SafeCanvas = HTMLCanvasElement & {
	__offscreenTransferred?: boolean;
};

type ProgramWithUniforms = WebGLProgram & {
	resolution: WebGLUniformLocation | null;
	time: WebGLUniformLocation | null;
	u_color: WebGLUniformLocation | null;
	u_bg: WebGLUniformLocation | null;
};

// ─── Persistance inter-navigation ─────────────────────────────────────────────
//
// Ces deux variables survivent aux unmounts/remounts React (portée module).
// Elles permettent au reveal shader (min(time * .1, 1.)) de ne pas rejouer
// quand l'utilisateur revient sur la landing page.
//
// Fonctionnement :
//   - _persistedMs  : temps GPU accumulé lors des sessions précédentes
//   - _mountedAt    : performance.now() au montage courant
//
// Au cleanup : _persistedMs += performance.now() - _mountedAt
// Au rendu   : renderer.render(now + _persistedMs)
//
// => Après ~10s sur la page, reveal = 1 pour toujours. Au retour, la fumée
//    est immédiatement pleinement visible, sans re-fade.

let _persistedMs = 0;
let _mountedAt = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hexToRgb = (hex: string): Rgb | null => {
	const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return r
		? [
				parseInt(r[1], 16) / 255,
				parseInt(r[2], 16) / 255,
				parseInt(r[3], 16) / 255,
			]
		: null;
};

const resolveModeColor = (color: ModeColor, mode: Mode): string =>
	typeof color === "string" ? color : color[mode];

// ─── GLSL — source unique partagée entre Worker et Fallback ───────────────────

const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){ gl_Position = position; }`;

// Optimisation shader : 3 octaves fbm au lieu de 4 (−25% charge GPU,
// imperceptible visuellement sur un effet de fumée).
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
// VERT et FRAG sont injectés via template literal à la compilation du module
// (pas de duplication de code, pas de fichier worker séparé).

const WORKER_SOURCE = /* js */ `
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
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader error:", gl.getShaderInfoLog(shader));
    }
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
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error("Link error:", gl.getProgramInfoLog(this.program));
    }
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

let renderer   = null;
let rafId      = null;
let lastTime   = 0;
let timeOffset = 0; // injecté depuis le composant via message "init"

const FPS      = 30;
const INTERVAL = 1000 / FPS;

function loop(now) {
  rafId = requestAnimationFrame(loop);
  const delta = now - lastTime;
  if (delta < INTERVAL) return;
  lastTime = now - (delta % INTERVAL);
  renderer?.render(now + timeOffset);
}

self.onmessage = ({ data }) => {
  switch (data.type) {
    case "init":
      renderer   = new Renderer(data.canvas);
      timeOffset = data.timeOffset ?? 0;
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

// ─── FallbackRenderer ─────────────────────────────────────────────────────────
// Chemin principal thread (navigateurs sans OffscreenCanvas).
// Partage les mêmes VERT/FRAG que le worker.

class FallbackRenderer {
	private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
	private gl: WebGL2RenderingContext;
	private canvas: HTMLCanvasElement;
	private program: ProgramWithUniforms | null = null;
	private vs: WebGLShader | null = null;
	private fs: WebGLShader | null = null;
	private buffer: WebGLBuffer | null = null;
	private color: Rgb = [0.5, 0.5, 0.5];
	private bg: Rgb = [0.08, 0.08, 0.08];

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const gl = canvas.getContext("webgl2");
		if (!gl) throw new Error("WebGL2 not supported");
		this.gl = gl;
		this.setup();
		this.init();
	}

	updateColor(color: Rgb) {
		this.color = color;
	}

	updateBg(bg: Rgb) {
		this.bg = bg;
		this.gl.clearColor(bg[0], bg[1], bg[2], 1);
	}

	updateScale() {
		const dpr = Math.min(Math.max(1, window.devicePixelRatio), 1.5);
		this.canvas.width = window.innerWidth * dpr;
		this.canvas.height = window.innerHeight * dpr;
		this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	}

	private compile(shader: WebGLShader, source: string) {
		const { gl } = this;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
		}
	}

	private setup() {
		const { gl } = this;
		this.vs = gl.createShader(gl.VERTEX_SHADER);
		this.fs = gl.createShader(gl.FRAGMENT_SHADER);
		this.program = gl.createProgram() as ProgramWithUniforms;
		if (!this.vs || !this.fs || !this.program) return;
		this.compile(this.vs, VERT);
		this.compile(this.fs, FRAG);
		gl.attachShader(this.program, this.vs);
		gl.attachShader(this.program, this.fs);
		gl.linkProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(this.program));
		}
	}

	private init() {
		const { gl, program } = this;
		if (!program) return;
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(this.vertices),
			gl.STATIC_DRAW,
		);
		const pos = gl.getAttribLocation(program, "position");
		gl.enableVertexAttribArray(pos);
		gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
		Object.assign(program, {
			resolution: gl.getUniformLocation(program, "resolution"),
			time: gl.getUniformLocation(program, "time"),
			u_color: gl.getUniformLocation(program, "u_color"),
			u_bg: gl.getUniformLocation(program, "u_bg"),
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
		gl.uniform1f(program.time, now * 1e-3);
		gl.uniform3fv(program.u_color, this.color);
		gl.uniform3fv(program.u_bg, this.bg);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	destroy() {
		const { gl, program, vs, fs, buffer } = this;
		if (vs && program) {
			gl.detachShader(program, vs);
			gl.deleteShader(vs);
		}
		if (fs && program) {
			gl.detachShader(program, fs);
			gl.deleteShader(fs);
		}
		if (program) gl.deleteProgram(program);
		if (buffer) gl.deleteBuffer(buffer);
	}
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SmokeBackgroundProps {
	smokeColor?: string;
	bgColor?: ModeColor;
	mode?: Mode;
	lazy?: boolean;
	lazyDelay?: number;
	className?: string;
	style?: React.CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SmokeBackground: React.FC<SmokeBackgroundProps> = ({
	smokeColor = "#808080",
	bgColor = { light: "#FBEAE6", dark: "#141414" },
	mode = "dark",
	lazy = true,
	lazyDelay = 1200,
	className,
	style,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const workerRef = useRef<Worker | null>(null);
	const fallbackRef = useRef<FallbackRenderer | null>(null);
	const rendererModeRef = useRef<"worker" | "fallback" | null>(null);
	const objectUrlRef = useRef<string | null>(null);
	const [isMounted, setIsMounted] = useState(false);
	const [canvasEpoch, setCanvasEpoch] = useState(0);

	// Refs pour la valeur initiale des couleurs — évite d'avoir smokeColor /
	// resolvedBgColor dans les deps du useLayoutEffect principal tout en gardant
	// les valeurs fraîches au moment du montage (et sans warning exhaustive-deps).
	const initColorRef = useRef(smokeColor);
	const initBgRef = useRef<string>("");

	const [shouldStart, setShouldStart] = useState(!lazy);

	const resolvedBgColor = useMemo(
		() => resolveModeColor(bgColor, mode),
		[bgColor, mode],
	);

	// Maintenir les refs à jour à chaque render (avant les effets)
	initColorRef.current = smokeColor;
	initBgRef.current = resolvedBgColor;

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!isMounted) return;

		const handlePageShow = (event: PageTransitionEvent) => {
			if (!event.persisted) return;
			setCanvasEpoch((epoch) => epoch + 1);
		};

		window.addEventListener("pageshow", handlePageShow);

		return () => {
			window.removeEventListener("pageshow", handlePageShow);
		};
	}, [isMounted]);

	// ── Lazy start ──────────────────────────────────────────────────────────────

	useEffect(() => {
		if (!lazy) {
			setShouldStart(true);
			return;
		}

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
	//
	// Deps intentionnellement limitées à [shouldStart, canvasEpoch] :
	//   - smokeColor et resolvedBgColor sont gérés par leurs propres useEffect
	//     via postMessage/updateColor — pas besoin de recréer le worker.
	//   - Les valeurs initiales sont lues via initColorRef/initBgRef.

	useLayoutEffect(() => {
		if (!isMounted || !shouldStart) return;
		void canvasEpoch;

		const canvas = canvasRef.current as SafeCanvas | null;
		if (!canvas) return;

		_mountedAt = performance.now();

		const color = hexToRgb(initColorRef.current) ?? ([0.5, 0.5, 0.5] as Rgb);
		const bg = hexToRgb(initBgRef.current) ?? ([0.08, 0.08, 0.08] as Rgb);
		const dpr = Math.min(Math.max(1, window.devicePixelRatio), 1.5);
		const width = window.innerWidth * dpr;
		const height = window.innerHeight * dpr;

		const supportsOffscreen =
			typeof OffscreenCanvas !== "undefined" &&
			typeof canvas.transferControlToOffscreen === "function";

		// ── Mode Worker (OffscreenCanvas) ─────────────────────────────────────────

		if (supportsOffscreen) {
			// Guard contre le double-appel React Strict Mode / HMR sur la même instance
			if (canvas.__offscreenTransferred) return;
			canvas.__offscreenTransferred = true;
			rendererModeRef.current = "worker";

			const blob = new Blob([WORKER_SOURCE], {
				type: "application/javascript",
			});
			const url = URL.createObjectURL(blob);
			objectUrlRef.current = url;

			const worker = new Worker(url);
			workerRef.current = worker;

			const offscreen = canvas.transferControlToOffscreen();
			worker.postMessage(
				{
					type: "init",
					canvas: offscreen,
					width,
					height,
					color,
					bg,
					timeOffset: _persistedMs, // ← reprend le temps où on s'est arrêté
				},
				[offscreen],
			);

			// Pause quand le canvas sort du viewport
			const intersectionObserver = new IntersectionObserver(
				([entry]) =>
					worker.postMessage({
						type: entry.isIntersecting ? "resume" : "pause",
					}),
				{ threshold: 0 },
			);
			intersectionObserver.observe(canvas);

			// Pause quand l'onglet est masqué
			const handleVisibility = () =>
				worker.postMessage({ type: document.hidden ? "pause" : "resume" });
			document.addEventListener("visibilitychange", handleVisibility);

			// Resize avec debounce 100ms pour ne pas flooder le worker
			let resizeTimer: ReturnType<typeof setTimeout>;
			const handleResize = () => {
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(() => {
					const d = Math.min(Math.max(1, window.devicePixelRatio), 1.5);
					worker.postMessage({
						type: "resize",
						width: window.innerWidth * d,
						height: window.innerHeight * d,
					});
				}, 100);
			};
			window.addEventListener("resize", handleResize);

			return () => {
				// Accumuler le temps avant destruction pour la prochaine session
				_persistedMs += performance.now() - _mountedAt;

				clearTimeout(resizeTimer);
				try {
					worker.postMessage({ type: "destroy" });
				} catch {
					/* worker peut déjà être mort */
				}
				worker.terminate();
				intersectionObserver.disconnect();
				window.removeEventListener("resize", handleResize);
				document.removeEventListener("visibilitychange", handleVisibility);

				if (objectUrlRef.current) {
					URL.revokeObjectURL(objectUrlRef.current);
					objectUrlRef.current = null;
				}

				workerRef.current = null;
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
		const interval = 1000 / 30;

		const loop = (now: number) => {
			rafId = requestAnimationFrame(loop);
			const delta = now - lastTime;
			if (delta < interval) return;
			lastTime = now - (delta % interval);
			renderer.render(now + _persistedMs); // ← temps continu inter-navigation
		};

		rafId = requestAnimationFrame(loop);

		// Pause quand le canvas sort du viewport
		const intersectionObserver = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting && rafId !== null) {
					cancelAnimationFrame(rafId);
					rafId = null;
				}
				if (entry.isIntersecting && rafId === null) {
					rafId = requestAnimationFrame(loop);
				}
			},
			{ threshold: 0 },
		);
		intersectionObserver.observe(canvas);

		// Pause quand l'onglet est masqué
		const handleVisibility = () => {
			if (document.hidden) {
				if (rafId !== null) {
					cancelAnimationFrame(rafId);
					rafId = null;
				}
			} else {
				if (rafId === null) {
					rafId = requestAnimationFrame(loop);
				}
			}
		};
		document.addEventListener("visibilitychange", handleVisibility);

		// Resize avec debounce 100ms
		let resizeTimer: ReturnType<typeof setTimeout>;
		const handleResize = () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => renderer.updateScale(), 100);
		};
		window.addEventListener("resize", handleResize);

		return () => {
			_persistedMs += performance.now() - _mountedAt;

			clearTimeout(resizeTimer);
			if (rafId !== null) cancelAnimationFrame(rafId);
			renderer.destroy();
			intersectionObserver.disconnect();
			window.removeEventListener("resize", handleResize);
			document.removeEventListener("visibilitychange", handleVisibility);

			fallbackRef.current = null;
			rendererModeRef.current = null;
		};
	}, [isMounted, shouldStart, canvasEpoch]); // eslint-disable-line react-hooks/exhaustive-deps
	// ^ Intentionnel : smokeColor et resolvedBgColor sont gérés par leurs propres
	//   effets ci-dessous. Les ajouter ici détruirait le worker à chaque changement
	//   de couleur, ce qui annulerait le bénéfice des mises à jour dynamiques.

	// ── Mise à jour dynamique — couleur fumée ──────────────────────────────────

	useEffect(() => {
		if (!shouldStart) return;
		const color = hexToRgb(smokeColor);
		if (!color) return;
		if (rendererModeRef.current === "worker") {
			workerRef.current?.postMessage({ type: "color", color });
			return;
		}
		fallbackRef.current?.updateColor(color);
	}, [shouldStart, smokeColor]);

	// ── Mise à jour dynamique — couleur fond ───────────────────────────────────

	useEffect(() => {
		if (!shouldStart) return;
		const bg = hexToRgb(resolvedBgColor);
		if (!bg) return;
		if (rendererModeRef.current === "worker") {
			workerRef.current?.postMessage({ type: "bg", bg });
			return;
		}
		fallbackRef.current?.updateBg(bg);
	}, [shouldStart, resolvedBgColor]);

	return isMounted ? (
		<canvas
			key={canvasEpoch}
			ref={canvasRef}
			className={className}
			style={{
				display: "block",
				width: "100%",
				height: "100%",
				backgroundColor: resolvedBgColor,
				...style,
			}}
		/>
	) : null;
};
