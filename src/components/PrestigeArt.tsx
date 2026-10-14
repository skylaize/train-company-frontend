import { useEffect, useRef } from "react";
import { createCabScene } from "./cabScene";
import { TrainPicture } from "./TrainPicture";
import { StaffFigure } from "./StaffFigure";
import { PosterCanvas, PosterStyle } from "./PosterArt";

/* ============================================================
   2.1 : les visuels de l'atelier de prestige, pour les vignettes et la
   une de la boutique. Chaque objet se montre tel qu'on l'aura : la gare
   habillée avec la rame à quai, l'affiche, les plaques gravées, les
   tenues portées, la salle du musée.
   ============================================================ */

export const PLATE_STYLE_LABELS: Record<string, string> = { laiton: "Laiton poli", email: "Émail bleu", bois: "Bois verni" };
export const SOUND_LABELS: Record<string, string> = { carillon: "Carillon 1930", vapeur: "Sifflet vapeur", trompe: "Trompe moderne" };
export const STATION_SKIN_LABELS: Record<string, string> = { "belle-epoque": "Belle Époque", beton: "Années 70", verriere: "Verrière" };

const SAMPLE_POSTER = {
  company: "Votre compagnie",
  livery: "#a8483a",
  lines: [["Paris", "Dijon", "Lyon"], ["Lyon", "Marseille"], ["Paris", "Lille"], ["Bordeaux", "Toulouse"], ["Paris", "Rennes"]],
};

/* une plaque gravée, en HTML : nette à toutes les tailles */
export function NamePlate({ style, children, className = "" }: { style: string; children: React.ReactNode; className?: string }) {
  const s =
    style === "email"
      ? { background: "linear-gradient(#2a5aa8,#173a78)", color: "#f2f4f8", border: "1px solid #f2f4f8", fontFamily: "var(--font-body)" }
      : style === "bois"
      ? { background: "linear-gradient(#8a5a32,#5e3b1f)", color: "#f3e3c3", border: "1px solid #c9a36b", fontFamily: "Bitter, serif" }
      : { background: "linear-gradient(#f6e3a0 0%,#e9c56a 30%,#b98a2c 100%)", color: "#3a2a0a", border: "1px solid #7a5a1a", fontFamily: "Bitter, serif" };
  return (
    <span className={`relative inline-flex items-center gap-2 px-3 py-1 font-bold uppercase tracking-[0.12em] shadow-[0_2px_6px_rgba(0,0,0,0.45)] ${className}`} style={{ ...s, borderRadius: 3 }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.border.split(" ").pop() }} />
      {children}
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.border.split(" ").pop() }} />
    </span>
  );
}

/* une image fixe de la gare habillée, la rame à quai, de nuit */
export function StationThumb({ skin, livery = "#4f7fa3", name = "Votre gare", night = true, className = "" }: { skin: string | null; livery?: string; name?: string; night?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const { sc, frame } = createCabScene(ctx);
    const paint = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!r.width) return;
      sc.W = r.width;
      sc.H = r.height;
      sc.dpr = dpr;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sc.weather = night ? "nuit" : "clair";
      sc.livery = livery;
      sc.stationSkin = skin;
      sc.v = 0;
      sc.dep = name;
      sc.arr = "";
      sc.depDist = 0;
      sc.arrDist = 1e9;
      frame(1);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [skin, livery, name, night]);
  return <canvas ref={ref} className={`block w-full h-full ${className}`} role="img" aria-label={`Gare ${STATION_SKIN_LABELS[skin ?? ""] ?? ""}`} />;
}

/* la salle du musée : trois rames d'époque sur leurs socles, sous les projecteurs */
export function MuseumHall({ pieces, compact = false }: { pieces?: { skin: string; livery: string; label: string }[]; compact?: boolean }) {
  const list = pieces?.length ? pieces : [
    { skin: "vapeur", livery: "#24493a", label: "141 R" },
    { skin: "pullman", livery: "#5b1e2d", label: "Voiture Pullman" },
    { skin: "micheline", livery: "#c99a3e", label: "Micheline" },
  ];
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "linear-gradient(180deg,#120e0b 0%,#1d1712 60%,#2a2119 100%)" }}>
      {/* parquet */}
      <div className="absolute inset-x-0 bottom-0 h-[26%]" style={{ background: "repeating-linear-gradient(90deg,#3a2a1c 0 38px,#33251a 38px 40px)" }} />
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0,1fr))` }}>
        {list.map((p, i) => (
          <div key={i} className="relative flex flex-col items-center justify-end pb-[9%]">
            {/* faisceau du projecteur */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-[82%]" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,228,170,0.32), rgba(255,228,170,0) 70%)", clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)" }} />
            <div className="relative w-[92%]">
              <TrainPicture skin={p.skin} livery={p.livery} height={compact ? 34 : 64} track={false} label={p.label} />
            </div>
            {/* socle et cartel */}
            <div className="relative w-[86%] h-[10px] bg-[#0c0a08] border-t border-[#6b5a40]" />
            {!compact && <div className="relative mt-2 px-2 py-0.5 bg-[#efe6d2] text-[#2a2119] font-display text-[12px]">{p.label}</div>}
          </div>
        ))}
      </div>
      {/* fronton */}
      <div className="absolute top-2 inset-x-0 text-center text-[#d9b46a] font-display tracking-[0.3em] text-[11px] uppercase">Musée</div>
    </div>
  );
}

/* la vignette d'un objet de l'atelier de prestige */
export function PrestigeThumb({ item, big = false, livery = "#4f7fa3" }: { item: { kind: string; posters?: string[]; trainPlates?: string[]; sounds?: string[]; stationSkins?: string[]; uniforms?: string[]; allianceLiveries?: string[] }; big?: boolean; livery?: string }) {
  switch (item.kind) {
    case "AFFICHE":
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-2 px-3 py-2" style={{ background: "radial-gradient(ellipse at 50% 100%, #3a2a1a, #0b0f19 70%)" }}>
          {(item.posters ?? []).slice(0, big ? 3 : 2).map((p, i) => (
            <div key={p} className="h-full shadow-[0_6px_16px_rgba(0,0,0,0.6)]" style={{ aspectRatio: "1200/1700", transform: `rotate(${(i - 1) * 3}deg)` }}>
              <PosterCanvas style={p as PosterStyle} data={SAMPLE_POSTER} />
            </div>
          ))}
        </div>
      );
    case "PLAQUE_RAME":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "linear-gradient(180deg,#1b2433,#0b0f19)" }}>
          {(item.trainPlates ?? []).map((p) => (
            <NamePlate key={p} style={p} className={big ? "text-[15px]" : "text-[11px]"}>
              Étoile du Nord
            </NamePlate>
          ))}
        </div>
      );
    case "SONS":
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-2 px-5" style={{ background: "linear-gradient(180deg,#14202f,#0b0f19)" }}>
          {(item.sounds ?? []).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full border border-amber/60 text-amber inline-flex items-center justify-center text-[11px]">▶</span>
              <svg viewBox="0 0 120 20" className="flex-1 h-5" aria-hidden="true">
                {Array.from({ length: 40 }).map((_, k) => {
                  const hgt = 3 + Math.abs(Math.sin(k * (0.5 + i * 0.3)) * 14) * (1 - k / 60);
                  return <rect key={k} x={k * 3} y={10 - hgt / 2} width="1.8" height={hgt} fill="#f59e0b" opacity={0.85} />;
                })}
              </svg>
              {big && <span className="text-[12px] text-slate2 font-body w-28">{SOUND_LABELS[s]}</span>}
            </div>
          ))}
        </div>
      );
    case "GARE":
      return (
        <div className="absolute inset-0">
          <StationThumb skin={item.stationSkins?.[0] ?? null} livery={livery} name="Votre gare" />
        </div>
      );
    case "MUSEE":
      return (
        <div className="absolute inset-0">
          <MuseumHall compact={!big} />
        </div>
      );
    case "TENUES":
      return (
        <div className="absolute inset-0 flex items-end justify-center gap-1" style={{ background: "linear-gradient(180deg,#22324a,#0b0f19)" }}>
          {(item.uniforms ?? []).map((u, i) => (
            <StaffFigure key={u} uniform={u} seed={["Odette", "Louis", "Amina"][i]} size={big ? 92 : 58} />
          ))}
        </div>
      );
    case "ALLIANCE":
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-0.5 px-2" style={{ background: "linear-gradient(180deg,#1a1626,#0b0f19)" }}>
          {(item.allianceLiveries ?? []).map((c, i) => (
            <div key={c} style={{ marginLeft: `${i * 6}%` }}>
              <TrainPicture livery={c} model="EXPRESS" height={big ? 40 : 26} track={false} fit={false} align="right" label={`Livrée ${c}`} />
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export const PRESTIGE_KINDS = new Set(["AFFICHE", "PLAQUE_RAME", "SONS", "GARE", "MUSEE", "TENUES", "ALLIANCE"]);
