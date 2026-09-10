import { useEffect, useRef } from "react";

export function usePointerField<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      element.style.setProperty("--lx", `${Math.max(0, Math.min(1, x))}`);
      element.style.setProperty("--ly", `${Math.max(0, Math.min(1, y))}`);
    };
    element.addEventListener("pointermove", update, { passive: true });
    return () => element.removeEventListener("pointermove", update);
  }, []);
  return ref;
}
