import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { TrainPicture } from "./TrainPicture";
import { minutesLeft } from "../models";

/* ============================================================
   2.0 : les épaves. De vieilles rames abandonnées près des gares : la
   première compagnie qui les rachète les ramène au dépôt, les restaure
   organe par organe, et les remet en service avec leur numéro d'origine.
   ============================================================ */

export interface WreckOrgan {
  organ: string;
  label: string;
  damage: number;
  restored: boolean;
  working: boolean;
  partsNeeded: number;
  partLabel: string;
  fromStock: number;
  cost: number;
  minutes: number;
}
export interface Wreck {
  id: string;
  kind: string;
  label: string;
  rarity: "COMMUNE" | "RARE" | "LEGENDAIRE";
  rarityLabel: string;
  model: string;
  skin: string;
  livery: string;
  prestige: number;
  station: string;
  serial: string;
  year: number;
  history: string;
  price: number;
  spent: number;
  expiresAt: string;
  workUntil: string | null;
  progress: number;
  ready: boolean;
  organs: WreckOrgan[];
}
export interface WreckData {
  open: Wreck[];
  mine: Wreck[];
  recent: { label: string; rarity: string; serial: string; station: string; company: string; mine: boolean; commissioned: boolean; at: string }[];
  depot: { used: number; max: number };
  limit: number;
}
export interface Commissioned {
  train: { id: string; name: string; model: string };
  heritage: { label: string; serial: string; skin: string; livery: string; prestige: number; year: number };
}

export const RARITY_COLOR: Record<string, string> = { COMMUNE: "#9aa7b8", RARE: "#6f9fe0", LEGENDAIRE: "#e0b44a" };
const fmt = (n: number) => n.toLocaleString("fr-FR");

export function duration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
const seedOf = (id: string) => [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
const defaultName = (w: { serial: string; label: string }) => (w.serial.startsWith("Rame") ? w.serial : `${w.label.split(" ")[0]} ${w.serial}`);
const prestigeLabel = (p: number) => `billet +${Math.round((p - 1) * 100)} %`;

export async function loadWrecks(): Promise<WreckData | null> {
  try {
    const { data } = await api.get("/wrecks");
    return data;
  } catch {
    return null;
  }
}

function RarityTag({ rarity, label }: { rarity: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-body" style={{ color: RARITY_COLOR[rarity] }}>
      <span className="w-2 h-2 rotate-45" style={{ background: RARITY_COLOR[rarity] }} />
      {label}
    </span>
  );
}

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`;
}

export function WreckYard({ balance, onChange, onCommissioned }: { balance: number; onChange: () => void; onCommissioned: (c: Commissioned) => void }) {
  const [data, setData] = useState<WreckData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [, tick] = useState(0);
  const { showToast, showComposter } = useToast();

  const reload = async () => setData(await loadWrecks());
  useEffect(() => {
    void reload();
    const t = setInterval(() => {
      tick((n) => n + 1);
      void reload();
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  async function act(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key);
    try {
      await fn();
      if (done) showComposter(done);
      await reload();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error ?? "Erreur", "error");
      await reload();
    } finally {
      setBusy(null);
    }
  }

  if (!data) return null;
  const { open, mine, recent, depot, limit } = data;
  const depotFull = depot.used >= depot.max;
  const atLimit = mine.length >= limit;

  return (
    <section className="mt-10" aria-labelledby="epaves-titre">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-4">
        <div className="min-w-0">
          <h2 id="epaves-titre" className="font-display text-[24px] leading-tight">Épaves</h2>
          <p className="text-[14px] text-slate2 font-body mt-1 max-w-[64ch]">
            De vieilles rames dorment près des gares. La première compagnie qui en rachète une la restaure à l'atelier, et elle reprend du service avec son numéro d'origine et sa livrée d'époque.
          </p>
        </div>
        <span className={`text-[13px] font-body ${depotFull ? "text-rail-red" : "text-slate2"}`}>
          Dépôt : {depot.used} place{depot.used > 1 ? "s" : ""} prise{depot.used > 1 ? "s" : ""} sur {depot.max}
        </span>
      </div>

      {/* ---------- au dépôt : les restaurations en cours ---------- */}
      {mine.map((w) => {
        const done = w.organs.filter((o) => o.restored).length;
        const working = w.organs.find((o) => o.working);
        const rust = 1 - (done / 4) * 0.92;
        return (
          <article key={w.id} className="border border-line bg-navy-900/60 mb-4" style={w.rarity === "LEGENDAIRE" ? { borderColor: "rgba(224,180,74,0.55)" } : undefined}>
            <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="p-4 md:border-r border-line">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <RarityTag rarity={w.rarity} label={w.rarityLabel} />
                  <span className="font-mono2 text-[12px] text-slate2">{w.serial}</span>
                </div>
                <h3 className="font-display text-[21px] leading-tight mt-1">{w.label}</h3>
                <div className="mt-3 bg-navy-950/60 border border-line px-2 pt-3">
                  <TrainPicture model={w.model} skin={w.skin} livery={w.livery} rust={rust} seed={seedOf(w.id)} height={78} track fit label={`${w.label}, restaurée à ${w.progress} %`} />
                </div>
                <p className="text-[13px] text-slate2 font-body mt-3 italic">{w.history}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex-1 h-[6px] bg-[#3a2f25]" aria-hidden>
                    <div className="h-full bg-amber transition-all duration-700" style={{ width: `${(done / 4) * 100}%` }} />
                  </div>
                  <span className="text-[13px] font-body text-offwhite whitespace-nowrap">{done} organe{done > 1 ? "s" : ""} sur 4</span>
                </div>
              </div>

              <div className="p-4">
                {w.ready ? (
                  <div className="h-full flex flex-col justify-center">
                    <div className="text-[14px] font-body text-rail-green">Restauration terminée</div>
                    <p className="text-[13.5px] font-body text-slate2 mt-1">
                      Elle roulera comme une rame {w.model === "EXPRESS" ? "express" : w.model === "COUCHETTES" ? "couchettes" : "standard"}, avec un {prestigeLabel(w.prestige)} grâce à son prestige. Le vieux matériel s'use un peu plus vite.
                    </p>
                    <label className="text-[12.5px] font-body text-slate2 mt-4" htmlFor={`nom-${w.id}`}>
                      Son nom
                    </label>
                    <input
                      id={`nom-${w.id}`}
                      value={names[w.id] ?? defaultName(w)}
                      onChange={(e) => setNames((n) => ({ ...n, [w.id]: e.target.value }))}
                      maxLength={40}
                      className="mt-1 bg-navy-950 border border-line px-3 py-2 text-[15px] font-body focus:border-amber outline-none"
                    />
                    <button
                      disabled={busy !== null}
                      onClick={() =>
                        act(`c:${w.id}`, async () => {
                          const { data: r } = await api.post(`/wrecks/${w.id}/commission`, { name: names[w.id] ?? defaultName(w) });
                          onCommissioned(r);
                        })
                      }
                      className="mt-3 bg-amber text-onaccent px-4 py-2.5 text-[15px] font-semibold font-body hover:brightness-110 disabled:opacity-50"
                    >
                      {busy === `c:${w.id}` ? "Un instant…" : "Remettre en service"}
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {w.organs.map((o) => {
                      const left = o.working && w.workUntil ? minutesLeft(w.workUntil) : 0;
                      return (
                        <li key={o.organ} className="py-2.5 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className={`text-[14.5px] font-body font-semibold ${o.restored ? "text-rail-green" : "text-offwhite"}`}>{o.label}</span>
                              {!o.restored && <span className="font-mono2 text-[11.5px] text-[#c98a5a]">{o.damage} % rongé</span>}
                            </div>
                            <div className="text-[12.5px] font-body text-slate2 mt-0.5">
                              {o.restored
                                ? "Restauré"
                                : o.working
                                ? `À l'atelier, encore ${duration(left)}`
                                : `${o.partsNeeded} ${o.partLabel.toLowerCase()}${o.fromStock ? `, ${o.fromStock} en stock` : ""} · ${duration(o.minutes)}`}
                            </div>
                          </div>
                          {o.restored ? (
                            <span className="text-rail-green text-[18px] leading-none" aria-label="Restauré">✓</span>
                          ) : o.working ? (
                            <span className="w-2 h-2 rounded-full bg-amber animate-pulse" aria-hidden />
                          ) : (
                            <button
                              disabled={busy !== null || Boolean(working) || o.cost > balance}
                              title={working ? "L'atelier travaille déjà sur cette épave" : o.cost > balance ? "Trésorerie insuffisante" : undefined}
                              onClick={() =>
                                act(`r:${w.id}:${o.organ}`, () => api.post(`/wrecks/${w.id}/restore`, { organ: o.organ }), `${o.label} : chantier lancé`)
                              }
                              className="shrink-0 border border-amber/60 text-amber px-3 py-1.5 text-[13px] font-body hover:bg-amber/10 disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                              {busy === `r:${w.id}:${o.organ}` ? "…" : o.cost ? `Restaurer · ${fmt(o.cost)} pi.` : "Restaurer"}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </article>
        );
      })}

      {/* ---------- à l'abandon près des gares ---------- */}
      <h3 className="font-display text-[18px] mt-6 mb-3">À l'abandon près des gares</h3>
      {open.length === 0 ? (
        <p className="text-[14px] font-body text-slate2 border border-dashed border-line px-4 py-5">
          Aucune épave en vue pour l'instant. Il en apparaît de nouvelles au fil de la journée, la Gazette annonce les légendaires.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {open.map((w) => {
            const left = minutesLeft(w.expiresAt);
            const reason = atLimit ? `Deux restaurations à la fois au plus` : depotFull ? "Dépôt plein : l'épave y prend une place" : w.price > balance ? "Trésorerie insuffisante" : null;
            return (
              <article key={w.id} className="border bg-navy-900/50 flex flex-col" style={{ borderColor: w.rarity === "LEGENDAIRE" ? "rgba(224,180,74,0.6)" : "rgb(var(--c-line))" }}>
                <div className="px-3 pt-3 bg-navy-950/50 border-b border-line">
                  <TrainPicture model={w.model} skin={w.skin} livery={w.livery} rust={1} seed={seedOf(w.id)} height={56} track fit label={`Épave : ${w.label}`} />
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <RarityTag rarity={w.rarity} label={w.rarityLabel} />
                    <span className={`text-[12px] font-body ${left < 120 ? "text-rail-red" : "text-slate2"}`}>Ferraille dans {duration(left)}</span>
                  </div>
                  <h4 className="font-display text-[18px] leading-tight mt-1.5">{w.label}</h4>
                  <div className="font-mono2 text-[12px] text-slate2">
                    {w.serial} · {w.year}
                  </div>
                  <p className="text-[13px] font-body text-slate2 mt-2 flex-1">{w.history}</p>
                  <div className="text-[12.5px] font-body text-slate2 mt-2">Une fois restaurée : {prestigeLabel(w.prestige)}</div>
                  <button
                    disabled={busy !== null || Boolean(reason)}
                    title={reason ?? undefined}
                    onClick={() => act(`b:${w.id}`, () => api.post(`/wrecks/${w.id}/buy`), `${w.label} rachetée`)}
                    className="mt-3 bg-amber text-onaccent px-3 py-2 text-[14px] font-semibold font-body hover:brightness-110 disabled:opacity-40"
                  >
                    {busy === `b:${w.id}` ? "Un instant…" : `Racheter · ${fmt(w.price)} pi.`}
                  </button>
                  {reason && <div className="text-[12px] font-body text-slate2 mt-1.5">{reason}</div>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ---------- ce que les autres ont trouvé ---------- */}
      {recent.length > 0 && (
        <>
          <h3 className="font-display text-[18px] mt-6 mb-2">Dernières trouvailles</h3>
          <ul className="text-[13.5px] font-body text-slate2 space-y-1">
            {recent.map((r, i) => (
              <li key={i}>
                <span className={r.mine ? "text-amber" : "text-offwhite"}>{r.mine ? "Vous" : r.company}</span>{" "}
                {r.mine ? (r.commissioned ? "avez remis en service" : "avez racheté") : r.commissioned ? "a remis en service" : "a racheté"} :{" "}
                <span style={{ color: RARITY_COLOR[r.rarity] }}>{r.label}</span> {r.serial}, près de {r.station}, {ago(r.at)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
