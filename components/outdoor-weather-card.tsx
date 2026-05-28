import { CloudSun } from "lucide-react";
import type { OutdoorWeather } from "@/lib/weather";

export function OutdoorWeatherCard({
  weather,
  compact = false
}: {
  weather: OutdoorWeather;
  compact?: boolean;
}) {
  const value = weather.temperatureF === null ? "Unavailable" : `${weather.temperatureF.toFixed(1)}F`;

  return (
    <section className={`weather-card ${compact ? "compact-weather" : ""}`} aria-label="Detroit outdoor temperature">
      <div className="weather-icon">
        <CloudSun size={22} />
      </div>
      <div>
        <span className="eyebrow">Detroit Outdoor Temperature</span>
        <strong>{value}</strong>
        <p>
          {weather.isLive
            ? `${weather.location} live outdoor context for heating and mild-day logic.`
            : "Detroit weather could not be reached. ecobee readings will still display when synced."}
        </p>
        <span className="weather-meta">
          {weather.isLive ? `Source ${weather.source}${weather.observedAt ? ` | Updated ${formatWeatherTime(weather.observedAt)}` : ""}` : weather.error}
        </span>
      </div>
    </section>
  );
}

function formatWeatherTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

