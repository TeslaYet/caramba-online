"use client";

import { useEffect, useRef } from "react";

export function AnimatedScore({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const current = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }
    const start = current.current;
    const reduced = document.documentElement.classList.contains("reduce-motion");
    if (start === value || reduced) {
      node.textContent = String(value);
      current.current = value;
      return;
    }
    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / 420);
      const eased = 1 - (1 - progress) ** 3;
      node.textContent = String(Math.round(start + (value - start) * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      current.current = value;
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span ref={nodeRef} className="tabular-nums">
      {value}
    </span>
  );
}
