import { useEffect, useRef } from "react";
import type { LisboaExperienceState } from "../experience/types";

interface Props {
  state: LisboaExperienceState;
  active: boolean;
}

const stateEnergy: Record<LisboaExperienceState, number> = {
  idle: 0.08,
  aware: 0.22,
  receiving: 0.38,
  understanding: 0.52,
  evaluating: 0.72,
  deciding: 0.9,
  controlling: 1,
  responding: 0.82,
  complete: 0.62,
  resting: 0.2,
  error: 0.16,
};

export function LivingSystem({ state, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let visible = true;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const draw = (time: number) => {
      if (!visible) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const energy = stateEnergy[state];
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(239, 239, 233, 0.16)";
      context.fillRect(0, 0, width, height);
      const cx = width * 0.54;
      const cy = height * 0.5;
      const mobile = width < 620;
      const lanes = mobile ? 22 : 38;
      const amplitude = Math.min(width, height) * (0.06 + energy * 0.025);
      const travel = reduce ? 0 : time * 0.00034;

      for (let lane = 0; lane < lanes; lane += 1) {
        const ratio = lane / Math.max(1, lanes - 1);
        const yBase = height * (0.18 + ratio * 0.64);
        const closeness = 1 - Math.abs(ratio - 0.5) * 2;
        context.beginPath();
        for (let step = 0; step <= 64; step += 1) {
          const x = (step / 64) * width;
          const distance = Math.abs(x - cx) / width;
          const convergence = Math.exp(-distance * (5 + energy * 7));
          const wave = Math.sin(
            step * 0.34 + lane * 0.62 + travel * (2 + energy * 3),
          );
          const decisionPull = (cy - yBase) * convergence * energy * 0.68;
          const y =
            yBase +
            decisionPull +
            wave * amplitude * (0.16 + energy * 0.34) * (0.3 + closeness);
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle =
          lane % 5 === 0
            ? `rgba(136, 198, 42, ${0.12 + energy * 0.34})`
            : `rgba(28, 31, 28, ${0.055 + energy * 0.105})`;
        context.lineWidth = lane % 5 === 0 ? 1.15 : 0.7;
        context.stroke();
      }

      const pulse = reduce ? 1 : 0.72 + Math.sin(time * 0.003) * 0.18;
      context.beginPath();
      context.arc(cx, cy, 3 + 6 * energy * pulse, 0, Math.PI * 2);
      context.fillStyle =
        state === "error"
          ? "#8c3a32"
          : `rgba(132, 199, 31, ${0.45 + energy * 0.5})`;
      context.fill();

      if (state === "responding" || state === "complete") {
        context.beginPath();
        context.moveTo(cx + 12, cy);
        context.lineTo(width * 0.94, cy);
        context.strokeStyle = "rgba(132, 199, 31, 0.74)";
        context.lineWidth = 1.4;
        context.stroke();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [active, state]);

  if (!active) return null;
  return (
    <canvas ref={canvasRef} className="lx-living-canvas" aria-hidden="true" />
  );
}
