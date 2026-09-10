import { useEffect, useRef } from "react";
import type {
  LisboaExperienceResult,
  LisboaExperienceState,
} from "../experience/types";

type Props = {
  state: LisboaExperienceState;
  result: LisboaExperienceResult | null;
};

type Signal = {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  phase: number;
};

const order: LisboaExperienceState[] = [
  "idle",
  "aware",
  "receiving",
  "understanding",
  "evaluating",
  "deciding",
  "controlling",
  "responding",
  "complete",
  "resting",
  "error",
];

function routeKind(result: LisboaExperienceResult | null) {
  const route = result?.decision.route ?? "efficient";
  if (/controlled|block|restrict/i.test(route)) return "controlled";
  if (/deterministic|bypass/i.test(route)) return "bypass";
  return "efficient";
}

export function SignalWorld({ state, result }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const resultRef = useRef(result);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) return;
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = 1;
    let height = 1;
    let animationFrame = 0;
    let frame = 0;
    let seed = 0x6a09e667;
    const random = () =>
      ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const signals: Signal[] = Array.from({ length: 118 }, () => ({
      angle: random() * Math.PI * 2,
      radius: 0.08 + random() * 0.48,
      speed: 0.001 + random() * 0.0026,
      size: 0.45 + random() * 1.9,
      phase: random() * 8,
    }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.7);
      width = box.width;
      height = box.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const current = stateRef.current;
      const active = !["idle", "resting"].includes(current);
      const stage = Math.max(0, order.indexOf(current));
      const centerX = width * 0.54;
      const centerY = height * 0.47;
      const unit = Math.min(width, height);
      const kind = routeKind(resultRef.current);
      const routeColor = kind === "controlled" ? "255,156,130" : kind === "bypass" ? "202,255,48" : "116,255,220";

      context.clearRect(0, 0, width, height);
      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, unit * 0.43);
      halo.addColorStop(0, active ? `rgba(${routeColor},.14)` : "rgba(128,164,255,.08)");
      halo.addColorStop(0.46, active ? `rgba(${routeColor},.035)` : "rgba(128,164,255,.025)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      for (let ring = 0; ring < 7; ring += 1) {
        const rotation = frame * (ring % 2 ? -0.0014 : 0.001) + ring;
        const radius = unit * (0.09 + ring * 0.045);
        context.save();
        context.translate(centerX, centerY);
        context.rotate(rotation);
        context.strokeStyle = ring === stage % 7 ? `rgba(${routeColor},.62)` : "rgba(201,214,255,.13)";
        context.lineWidth = ring === stage % 7 ? 1.3 : 0.65;
        context.setLineDash([2 + ring, 8 + ring * 2]);
        context.beginPath();
        context.ellipse(0, 0, radius * 1.42, radius, ring * 0.08, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }
      context.setLineDash([]);

      signals.forEach((signal, index) => {
        if (!reduced) signal.angle += signal.speed * (active ? 3.6 : 1);
        const compression = active ? 0.78 + stage * 0.026 : 1;
        const x = centerX + Math.cos(signal.angle + signal.phase) * signal.radius * unit * 1.24 * compression;
        const y = centerY + Math.sin(signal.angle * 0.82 + signal.phase) * signal.radius * unit * 0.72 * compression;
        const flare = active && index % 7 === stage % 7;
        context.fillStyle = flare ? `rgba(${routeColor},.98)` : "rgba(211,221,255,.35)";
        context.beginPath();
        context.arc(x, y, signal.size + (flare ? 1.5 : 0), 0, Math.PI * 2);
        context.fill();
        if (flare) {
          context.strokeStyle = `rgba(${routeColor},.18)`;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(centerX, centerY);
          context.stroke();
        }
      });

      const pulse = active ? 1 + Math.sin(frame * 0.055) * 0.055 : 1 + Math.sin(frame * 0.018) * 0.025;
      context.save();
      context.translate(centerX, centerY);
      context.scale(pulse, pulse);
      context.rotate(frame * 0.002);
      context.strokeStyle = active ? `rgba(${routeColor},.96)` : "rgba(201,214,255,.58)";
      context.lineWidth = 1.2;
      context.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = (index * Math.PI) / 3 - Math.PI / 2;
        const x = Math.cos(angle) * unit * 0.055;
        const y = Math.sin(angle) * unit * 0.055;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();
      context.fillStyle = active ? `rgba(${routeColor},.08)` : "rgba(201,214,255,.04)";
      context.fill();
      context.restore();

      if (active) {
        const target = kind === "controlled" ? height * 0.25 : kind === "bypass" ? height * 0.7 : height * 0.48;
        const progress = (frame * 0.012) % 1;
        const startX = centerX + unit * 0.08;
        const endX = width * 0.92;
        context.strokeStyle = `rgba(${routeColor},.24)`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(startX, centerY);
        context.bezierCurveTo(width * 0.68, centerY, width * 0.75, target, endX, target);
        context.stroke();
        const remaining = 1 - progress;
        const beaconX = remaining ** 3 * startX + 3 * remaining ** 2 * progress * width * 0.68 + 3 * remaining * progress ** 2 * width * 0.75 + progress ** 3 * endX;
        const beaconY = remaining ** 3 * centerY + 3 * remaining ** 2 * progress * centerY + 3 * remaining * progress ** 2 * target + progress ** 3 * target;
        context.fillStyle = `rgb(${routeColor})`;
        context.shadowBlur = 20;
        context.shadowColor = `rgb(${routeColor})`;
        context.beginPath();
        context.arc(beaconX, beaconY, 3.2, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }

      frame += 1;
      if (!reduced) animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="wsl-canvas" aria-hidden="true" />;
}
