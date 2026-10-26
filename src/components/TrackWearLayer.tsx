import { useEffect, useState } from "react";
import { api } from "../api/client";
import { STATION_COORDS } from "../geo";

/* 2.4 : sur la carte, les voies usées — orange sous 60 %, rouge sous 30 % —
   et un trait doré sur les liaisons concédées. Relu toutes les deux minutes. */
type Seg = { key: string; condition: number; concession: boolean };

export function TrackWearLayer({ k }: { k: number }) {
  const [segs, setSegs] = useState<Seg[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get("/economy/track/map")
        .then((r) => alive && setSegs(r.data?.segments ?? []))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <g aria-hidden="true" pointerEvents="none">
      {segs.map((s) => {
        const [a, b] = s.key.split("|");
        const p = STATION_COORDS[a];
        const q = STATION_COORDS[b];
        if (!p || !q) return null;
        const worn = s.condition < 60;
        return (
          <g key={s.key}>
            {s.concession && <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#d4a017" strokeWidth={5 * k} strokeOpacity={0.25} strokeLinecap="round" />}
            {worn && (
              <line
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke={s.condition < 30 ? "rgb(var(--c-rail-red))" : "rgb(var(--c-amber))"}
                strokeWidth={1.6 * k}
                strokeDasharray={`${2 * k} ${2.5 * k}`}
                strokeLinecap="round"
              >
                <title>{`${a} – ${b} : voie à ${s.condition} %`}</title>
              </line>
            )}
          </g>
        );
      })}
    </g>
  );
}
