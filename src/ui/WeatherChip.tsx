import type { Weather } from '../data/weather';

interface Props {
  weather: Weather;
  resist: number;
}

export function WeatherChip({ weather, resist }: Props) {
  return (
    <div className="weather-chip">
      <span className="weather-emoji">{weather.emoji}</span>
      <span className="weather-name">{weather.name}</span>
      <span className="weather-blurb">{weather.blurb}</span>
      {resist > 0 && weather.mods.length > 0 && (
        <span className="weather-resist">−{Math.round(resist * 100)}% effect</span>
      )}
    </div>
  );
}
