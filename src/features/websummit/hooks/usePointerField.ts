import { useEffect, useRef } from "react";

export function usePointerField<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--ws-pointer-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        element.style.setProperty("--ws-pointer-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      });
    };
    element.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      element.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}
