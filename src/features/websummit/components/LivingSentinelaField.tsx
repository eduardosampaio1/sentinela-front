import { memo, useEffect, useRef } from "react";
import type { ExperienceState } from "../experience/types";

type FieldPreset = {
  coherence: number;
  energy: number;
  speed: number;
  spread: number;
};

const presets: Record<ExperienceState, FieldPreset> = {
  idle: { coherence: 0.28, energy: 0.34, speed: 0.34, spread: 1 },
  aware: { coherence: 0.38, energy: 0.48, speed: 0.46, spread: 0.98 },
  listening: { coherence: 0.52, energy: 0.68, speed: 0.58, spread: 0.92 },
  understanding: { coherence: 0.7, energy: 0.88, speed: 0.82, spread: 0.8 },
  deciding: { coherence: 0.94, energy: 1, speed: 1.12, spread: 0.62 },
  responding: { coherence: 0.76, energy: 0.96, speed: 1.34, spread: 0.78 },
  complete: { coherence: 0.58, energy: 0.7, speed: 0.48, spread: 0.9 },
  error: { coherence: 0.22, energy: 0.4, speed: 0.24, spread: 1.08 },
};

export const LivingSentinelaField = memo(function LivingSentinelaField({ state }: { state: ExperienceState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const pointer = { x: 0.62, y: 0.42, tx: 0.62, ty: 0.42, active: false };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let frame = 0;
    let raf = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
      pointer.ty = (event.clientY - bounds.top) / Math.max(bounds.height, 1);
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.tx = 0.62;
      pointer.ty = 0.42;
      pointer.active = false;
    };

    const render = (now: number) => {
      const preset = presets[stateRef.current];
      const time = now * 0.00032 * preset.speed;
      pointer.x += (pointer.tx - pointer.x) * 0.045;
      pointer.y += (pointer.ty - pointer.y) * 0.045;

      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = "lighter";

      const cx = width * (0.57 + (pointer.x - 0.5) * 0.1);
      const cy = height * (0.47 + (pointer.y - 0.5) * 0.08);
      const minSide = Math.min(width, height);
      const loopCount = width < 620 ? 17 : 26;
      const segments = width < 620 ? 76 : 112;

      const aura = context.createRadialGradient(cx, cy, minSide * 0.02, cx, cy, minSide * 0.52);
      aura.addColorStop(0, `rgba(108, 194, 255, ${0.22 * preset.energy})`);
      aura.addColorStop(0.38, `rgba(45, 126, 190, ${0.09 * preset.energy})`);
      aura.addColorStop(1, "rgba(7, 9, 13, 0)");
      context.fillStyle = aura;
      context.fillRect(0, 0, width, height);

      for (let ring = loopCount - 1; ring >= 0; ring -= 1) {
        const depth = ring / Math.max(loopCount - 1, 1);
        const radius = minSide * (0.105 + depth * 0.39) * preset.spread;
        const wobble = (1 - preset.coherence) * (12 + depth * 30);
        const pointerAngle = Math.atan2(pointer.y * height - cy, pointer.x * width - cx);
        const hueMix = ring % 5 === 0;

        context.beginPath();
        for (let step = 0; step <= segments; step += 1) {
          const angle = (step / segments) * Math.PI * 2;
          const harmonic =
            Math.sin(angle * 3 + time * 4.2 + ring * 0.31) * wobble +
            Math.sin(angle * 7 - time * 2.5 + ring * 0.17) * wobble * 0.28;
          const attention = pointer.active
            ? Math.cos(angle - pointerAngle) * (1 - depth) * 18 * preset.energy
            : 0;
          const responsePull = stateRef.current === "responding" ? Math.max(0, Math.cos(angle)) * 38 * (1 - depth) : 0;
          const rx = radius * (1.05 + depth * 0.22) + harmonic + attention + responsePull;
          const ry = radius * (0.72 + depth * 0.08) + harmonic * 0.52;
          const twist = angle + depth * 0.48 + Math.sin(time + depth * 2.4) * 0.05;
          const x = cx + Math.cos(twist) * rx;
          const y = cy + Math.sin(twist) * ry;
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.lineWidth = ring % 6 === 0 ? 1.15 : 0.62;
        context.strokeStyle = hueMix
          ? `rgba(171, 220, 250, ${0.22 + (1 - depth) * 0.34 * preset.energy})`
          : `rgba(52, 143, 211, ${0.085 + (1 - depth) * 0.26 * preset.energy})`;
        context.shadowColor = "rgba(63, 159, 226, 0.32)";
        context.shadowBlur = ring % 6 === 0 ? 10 : 2;
        context.stroke();
      }

      const filamentCount = width < 620 ? 12 : 22;
      for (let filament = 0; filament < filamentCount; filament += 1) {
        const seed = filament / filamentCount;
        const travel = (time * (0.08 + seed * 0.04) + seed) % 1;
        const angle = seed * Math.PI * 2 + Math.sin(time + filament) * 0.2;
        const distance = minSide * (0.12 + travel * 0.42) * preset.spread;
        const x = cx + Math.cos(angle) * distance * 1.1;
        const y = cy + Math.sin(angle) * distance * 0.76;
        context.beginPath();
        context.arc(x, y, filament % 4 === 0 ? 1.8 : 0.8, 0, Math.PI * 2);
        context.fillStyle = `rgba(151, 213, 250, ${(1 - travel) * 0.44 * preset.energy})`;
        context.fill();
      }

      context.restore();
      frame += 1;
      if (!reducedMotion.matches || frame < 2) raf = window.requestAnimationFrame(render);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave);
    resize();
    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <div className="ws-living-field" data-state={state} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="ws-living-field__lens" />
      <div className="ws-living-field__edge" />
    </div>
  );
});
