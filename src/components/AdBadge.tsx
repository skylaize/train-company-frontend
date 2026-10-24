/* 2.3 : la rame publicitaire. Une marque (inventée) loue la rame pour une
   semaine : elle porte ses couleurs, et le badge dit jusqu'à quand. */
export interface AdFields {
  adBrand?: string | null;
  adColor?: string | null;
  adUntil?: string | null;
}

export const adActive = (t: AdFields) => Boolean(t.adBrand && t.adUntil && new Date(t.adUntil).getTime() > Date.now());

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export function AdBadge({ t, long = false }: { t: AdFields; long?: boolean }) {
  if (!adActive(t)) return null;
  const d = daysLeft(t.adUntil!);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-body text-offwhite"
      style={{ background: `color-mix(in srgb, ${t.adColor ?? "#888"} 26%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${t.adColor ?? "#888"} 55%, transparent)` }}
      title={`Rame louée à ${t.adBrand} : billets −7 % sur sa ligne, payée d'avance.`}
    >
      <span className="w-2 h-2 rounded-[2px]" style={{ background: t.adColor ?? "#888" }} aria-hidden="true" />
      Pub · {t.adBrand}
      {long && <span className="text-slate2">, encore {d} jour{d > 1 ? "s" : ""}</span>}
    </span>
  );
}
