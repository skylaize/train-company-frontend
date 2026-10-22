/* ============================================================
   Le Grand Chantier (2.0) : le tunnel du Mont-Blanc, creusé par tout le
   serveur. Chaque trajet voyageurs le fait avancer d'un mètre.
   ============================================================ */

export interface WorldData {
  id: string;
  name: string;
  target: number;
  progress: number;
  completedAt: string | null;
  stations: string[];
  contributors: number;
  mine: number;
  builderMin: number;
  top: { rank: number; name: string; liveryColor: string; amount: number; isMe: boolean }[];
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

export function WorldCard({ data, compact = false }: { data: WorldData; compact?: boolean }) {
  const pct = Math.min(100, (data.progress / Math.max(1, data.target)) * 100);
  const open = Boolean(data.completedAt);
  return (
    <div className="border border-line px-4 py-3.5 rounded-card bg-navy-900/40">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold font-body">{data.name}</span>
        <span className="font-mono2 text-[12.5px] text-amber tabular-nums">{open ? "ouvert" : `${pct.toFixed(1).replace(".", ",")} %`}</span>
      </div>
      {/* la galerie : creusée à mesure des trajets de tout le réseau */}
      <svg viewBox="0 0 300 46" className="w-full h-[46px] mt-2" aria-hidden="true">
        <path d="M0 46 L40 14 L70 26 L110 4 L150 22 L190 8 L230 24 L262 10 L300 30 L300 46 Z" fill="rgb(var(--c-navy-900))" stroke="rgb(var(--c-line))" />
        <path d="M110 4 L118 10 L104 12 Z M190 8 L198 14 L184 15 Z" fill="#e2e8f0" opacity="0.7" />
        <rect x="14" y="34" width="272" height="5" fill="rgb(var(--c-line))" />
        <rect x="14" y="34" width={(272 * pct) / 100} height="5" fill="rgb(var(--c-amber))" />
        <circle cx={14 + (272 * pct) / 100} cy="36.5" r="3.5" fill="rgb(var(--c-amber))" />
      </svg>
      <p className="text-[12.5px] text-slate2 font-body mt-1.5">
        {open
          ? `${data.stations.join(" et ")} ont rejoint la carte.`
          : `${fmt(data.progress)} trajets sur ${fmt(data.target)}. À l'ouverture, ${data.stations.join(" et ")} rejoignent la carte.`}{" "}
        Vous : <span className="font-mono2 text-offwhite">{fmt(data.mine)}</span>
        {data.mine >= data.builderMin ? ", emblème du tunnel gagné." : `, l'emblème du tunnel à ${data.builderMin}.`}
      </p>
      {!compact && data.top.length > 0 && (
        <div className="mt-2.5">
          {data.top.map((t) => (
            <div key={t.rank} className="flex items-center gap-2 text-[13px] font-body py-0.5">
              <span className="font-mono2 text-slate2 w-4">{t.rank}</span>
              <span className="w-2 h-2 rounded-[3px]" style={{ background: t.liveryColor }} />
              <span className={`flex-1 truncate ${t.isMe ? "font-semibold" : ""}`}>{t.name}</span>
              <span className="font-mono2 tabular-nums">{fmt(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
