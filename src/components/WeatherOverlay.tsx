export function WeatherOverlay({ type }: { type?: string }) {
  const className =
    type === "BROUILLARD" ? "weather-fog" :
    type === "CANICULE" ? "weather-heat" :
    type === "VERGLAS" ? "weather-ice" :
    null;

  if (!className) return null;

  return (
    <div key={type} className="fixed inset-0 z-40 pointer-events-none weather-enter" aria-hidden="true">
      <div className={`w-full h-full ${className}`} />
    </div>
  );
}
