"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
};

export function CountUp({ value, decimals = 0, suffix = "", duration = 900 }: Props) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const startVal = 0;
    const endVal = value;
    const start = performance.now();
    startRef.current = start;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startVal + (endVal - startVal) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className="tabular">
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}
