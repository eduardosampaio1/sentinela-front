import { useEffect, useRef } from "react";

export function usePointerField<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (
      !element
      || window.matchMedia("(pointer: coarse)").matches
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    let frame = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const render = () => {
      current.x += (target.x - current.x) * 0.085;
      current.y += (target.y - current.y) * 0.085;

      element.style.setProperty("--ws-pointer-x", `${(current.x + 1) * 50}%`);
      element.style.setProperty("--ws-pointer-y", `${(current.y + 1) * 50}%`);
      element.style.setProperty("--ws-far-x", `${current.x * 7}px`);
      element.style.setProperty("--ws-far-y", `${current.y * 5}px`);
      element.style.setProperty("--ws-mid-x", `${current.x * 15}px`);
      element.style.setProperty("--ws-mid-y", `${current.y * 11}px`);
      element.style.setProperty("--ws-near-x", `${current.x * 24}px`);
      element.style.setProperty("--ws-near-y", `${current.y * 18}px`);
      element.style.setProperty("--ws-counter-x", `${current.x * -5}px`);
      element.style.setProperty("--ws-counter-y", `${current.y * -4}px`);
      element.style.setProperty("--ws-tilt-x", `${current.y * -2.4}deg`);
      element.style.setProperty("--ws-tilt-y", `${current.x * 3.2}deg`);

      if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
        frame = requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    const onMove = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
      requestRender();
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      requestRender();
    };

    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
