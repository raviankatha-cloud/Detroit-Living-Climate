"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="live-clock" aria-live="off" aria-label="Current time">
      <span className="live-clock-time">{timeStr}</span>
      <span className="live-clock-date">{dateStr}</span>
    </div>
  );
}
