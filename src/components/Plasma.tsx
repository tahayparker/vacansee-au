import React, { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

interface PlasmaProps {
  color?: string;
  speed?: number;
  direction?: "forward" | "reverse" | "pingpong";
  scale?: number;
  opacity?: number;
  mouseInteractive?: boolean;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 0.5, 0.2];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
};

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const createFragmentShader = (iterations: number) => `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;

  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);

  float i = 0.0;
  float d, z;
  float T = iTime * uSpeed * uDirection;
  vec3 O = vec3(0.0);
  vec3 p, S;

  for (vec2 r = iResolution.xy, Q; ++i < ${iterations.toFixed(1)}; O += o.w/d*o.xyz) {
    p = z*normalize(vec3(C-.5*r,r.y));
    p.z -= 4.;
    S = p;
    d = p.y-T;

    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05);
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T));
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4;
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }

  o.xyz = tanh(O/1e4);
}

bool finite1(float x){ return !(isnan(x) || isinf(x)); }
vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);

  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));

  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`;

export const Plasma: React.FC<PlasmaProps> = ({
  color = "#ffffff",
  speed = 1,
  direction = "forward",
  scale = 1,
  opacity = 1,
  mouseInteractive = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Detect device capabilities
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const cores =
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    const isLowPower = isMobile || cores <= 4;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Performance parameters based on device profile:
    // DPR capped at 1.0 (or 0.65 on low power) to drastically reduce fragment shading
    const targetDpr = isLowPower
      ? 0.65
      : Math.min(
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
          1.0,
        );
    const iterations = isLowPower ? 18 : 30;
    const targetFpsInterval = isLowPower ? 1000 / 30 : 1000 / 60;

    const useCustomColor = color ? 1.0 : 0.0;
    const customColorRgb = color ? hexToRgb(color) : [1, 1, 1];
    const directionMultiplier = direction === "reverse" ? -1.0 : 1.0;

    let renderer: Renderer | null = null;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        antialias: false,
        dpr: targetDpr,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    const gl = renderer.gl;
    if (!gl) return;

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    containerRef.current.appendChild(canvas);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex,
      fragment: createFragmentShader(iterations),
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: { value: new Float32Array(customColorRgb) },
        uUseCustomColor: { value: useCustomColor },
        uSpeed: { value: speed * 0.4 },
        uDirection: { value: directionMultiplier },
        uScale: { value: scale },
        uOpacity: { value: opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: mouseInteractive ? 1.0 : 0.0 },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInteractive || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
      const mouseUniform = program.uniforms.uMouse.value as Float32Array;
      mouseUniform[0] = mousePos.current.x;
      mouseUniform[1] = mousePos.current.y;
    };

    if (mouseInteractive) {
      containerRef.current.addEventListener("mousemove", handleMouseMove, {
        passive: true,
      });
    }

    const setSize = () => {
      if (!containerRef.current || !renderer) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height);
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(containerRef.current);
    setSize();

    let raf = 0;
    let isPaused = false;
    let isScrolling = false;
    let scrollTimeout: any = null;
    let lastRenderTime = performance.now();
    const t0 = performance.now();

    // Pause on visibility change (tab hidden)
    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused && !prefersReducedMotion) {
        lastRenderTime = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Throttle / pause during rapid user scroll for 60/120fps UI fluidity
    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 120);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const loop = (t: number) => {
      if (isPaused) return;

      const elapsed = t - lastRenderTime;
      if (elapsed < targetFpsInterval || (isScrolling && isLowPower)) {
        raf = requestAnimationFrame(loop);
        return;
      }
      lastRenderTime = t - (elapsed % targetFpsInterval);

      const timeValue = (t - t0) * 0.001;

      if (direction === "pingpong") {
        const cycle = Math.sin(timeValue * 0.5) * directionMultiplier;
        (program.uniforms.uDirection as any).value = cycle;
      }

      (program.uniforms.iTime as any).value = timeValue;
      if (renderer) {
        renderer.render({ scene: mesh });
      }

      if (prefersReducedMotion) {
        return;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    const currentContainer = containerRef.current;
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (mouseInteractive && currentContainer) {
        currentContainer.removeEventListener("mousemove", handleMouseMove);
      }
      try {
        currentContainer?.removeChild(canvas);
      } catch {}
      try {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {}
    };
  }, [color, speed, direction, scale, opacity, mouseInteractive]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
    />
  );
};

export default Plasma;
