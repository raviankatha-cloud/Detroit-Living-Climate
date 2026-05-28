import "server-only";

export type OutdoorWeather = {
  location: string;
  temperatureF: number | null;
  observedAt: string | null;
  source: string;
  isLive: boolean;
  error?: string;
};

const DETROIT_WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=42.3314&longitude=-83.0458&current=temperature_2m&temperature_unit=fahrenheit&timezone=America%2FDetroit";

export async function getDetroitOutdoorWeather(): Promise<OutdoorWeather> {
  try {
    const response = await fetch(DETROIT_WEATHER_URL, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error(`Weather request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      current?: {
        temperature_2m?: number;
        time?: string;
      };
    };
    const temperatureF = Number(payload.current?.temperature_2m);

    return {
      location: "Detroit, Michigan",
      temperatureF: Number.isFinite(temperatureF) ? temperatureF : null,
      observedAt: payload.current?.time ?? null,
      source: "Open-Meteo",
      isLive: Number.isFinite(temperatureF)
    };
  } catch (error) {
    return {
      location: "Detroit, Michigan",
      temperatureF: null,
      observedAt: null,
      source: "Open-Meteo",
      isLive: false,
      error: error instanceof Error ? error.message : "Weather is unavailable."
    };
  }
}

