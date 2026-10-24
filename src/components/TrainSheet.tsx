import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { modelLabel, hhmm, minutesLeft, PART_LABEL, PART_NEED } from "../models";
import { playAlert, playChime } from "../sfx";
import { ResaleOutlook, TrainSchedule } from "./PremiumTools";
import { NamePlate, PLATE_STYLE_LABELS } from "./PrestigeArt";
import { isFreightLoco } from "../freight";
import { AdBadge, adActive } from "./AdBadge";

/* ============================================================
   La fiche atelier d'une rame (2.0).

   Tout ce qui touche à l'état d'une rame au même endroit : ses quatre
   organes, la réparation quand elle a cassé (pièce du magasin, commande,
   express), la révision maintenant ou programmée, l'équipage à bord et,
   en Premium, la revente.
   ============================================================ */

export interface SheetTrain {
  id: string;
  name: string;
  model: string;
  status: string;
  wear: number;
  lineId?: string | null;
  line?: { departureStation: string; arrivalStation: string } | null;
  organs?: { id: string; label: string; wear: number; broken: boolean }[];
  brokenPart?: string | null;
  partsEta?: string | null;
  workshopUntil?: string | null;
  serviceAt?: number | null;
  resaleValue?: number;
  serviceFrom?: number | null; // 2.1.1 (Premium) : horaires
  plateStyle?: string | null; // 2.1 : plaque nominative
  serviceTo?: number | null;
  departedAt?: string | null;
  crew?: { id: string; name: string; role: string; level: number }[];
  heritage?: { label: string; serial: string; history: string; prestige: number } | null; // 2.0 : rame de collection
  adBrand?: string | null; // 2.3 : rame publicitaire
  adColor?: string | null;
  adUntil?: string | null;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  level?: number;
  trainId?: string | null;
}

interface PartsInfo {
  stock: Record<string, number>;
  limit: number;
  catalog: { id: string; label: string; part: string; price: number; delayMin: number; express: number; expressMin: number }[];
}

const SERVICE_DISCOUNT = 0.6;
const serviceMinutes = (wear: number) => 3 + Math.ceil(Math.max(0, wear) / 10);
const fmt = (n: number) => n.toLocaleString("fr-FR");

export async function loadParts(): Promise<PartsInfo | null> {
  try {
    const { data } = await api.get("/trains/parts");
    return data;
  } catch {
    return null;
  }
}

export function TrainSheet({
  train,
  trains,
  balance,
  isPremium,
  plateStyles = [],
  costPerPoint,
  crew,
  onClose,
  onChange,
  onGoStaff,
  onGoPremium,
}: {
  train: SheetTrain;
  trains: { id: string; name: string }[];
  balance: number;
  isPremium: boolean;
  plateStyles?: string[]; // 2.1 : plaques de rame achetées en boutique
  costPerPoint: number;
  crew: CrewMember[];
  onClose: () => void;
  onChange: () => void;
  onGoStaff: () => void;
  onGoPremium: () => void;
}) {
  const { showToast, showComposter } = useToast();
  const [parts, setParts] = useState<PartsInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmSell, setConfirmSell] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void loadParts().then(setParts);
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function post(key: string, url: string, body: object, done: string, after?: () => void) {
    if (busy) return;
    setBusy(key);
    try {
      await api.post(url, body);
      showComposter(done);
      after?.();
      onChange();
      void loadParts().then(setParts);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  const broken = train.status === "MAINTENANCE" && !train.workshopUntil;
  const inWorkshop = Boolean(train.workshopUntil);
  const part = train.brokenPart ?? null;
  const labor = Math.ceil(train.wear * costPerPoint);
  const serviceCost = Math.ceil(train.wear * costPerPoint * SERVICE_DISCOUNT);
  const cat = parts?.catalog.find((c) => c.id === part);
  const inStock = part ? parts?.stock[part] ?? 0 : 0;
  const organs = train.organs ?? [];
  const weakest = organs.length ? organs.reduce((a, b) => (b.wear > a.wear ? b : a)) : null;
  const onFreight = train.status === "EN_ROUTE" && !train.lineId;
  const controleur = train.crew?.find((c) => c.role === "CONTROLEUR") ?? null;
  const conducteur = train.crew?.find((c) => c.role === "CONDUCTEUR") ?? null;
  const trainName = (id?: string | null) => trains.find((t) => t.id === id)?.name ?? null;

  return createPortal(
    <div data-modal className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-navy-900 border border-line sheet-up sm:animate-none rounded-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Atelier : ${train.name}`}
      >
        {/* en-tête */}
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line">
          <div className="min-w-0">
            <h3 className="font-display text-[22px] leading-tight truncate">{train.name}</h3>
            <p className="text-[13px] text-slate2 font-body mt-0.5">
              {train.heritage ? `${train.heritage.label} ${train.heritage.serial}` : modelLabel(train.model)}
              {train.line ? `, sur ${train.line.departureStation} – ${train.line.arrivalStation}` : ", au dépôt"}
            </p>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-offwhite text-xl leading-none px-1" aria-label="Fermer">
            ×
          </button>
        </div>

        {adActive(train) && (
          <p className="px-5 py-3 border-b border-line text-[13px] font-body text-slate2 flex flex-wrap items-center gap-2">
            <AdBadge t={train} long />
            Elle roule aux couleurs de la marque ; la semaine est déjà payée, mais les billets de sa ligne coûtent 7 % de moins.
          </p>
        )}
        {train.heritage && (
          <p className="px-5 py-3 border-b border-line text-[13px] font-body text-slate2 italic">
            {train.heritage.history} Rame de collection : billet +{Math.round((train.heritage.prestige - 1) * 100)} %, usure un peu plus rapide.
          </p>
        )}

        {/* ce qui se passe maintenant */}
        <section className="px-5 py-4 border-b border-line">
          {inWorkshop ? (
            <StatusLine tone="cobalt" title={`En révision à l'atelier`} body={`Sortie à ${hhmm(train.workshopUntil!)}, dans ${minutesLeft(train.workshopUntil!, now)} min. La rame reprendra sa ligne d'elle-même.`} />
          ) : broken && part && train.partsEta ? (
            <>
              <StatusLine
                tone="amber"
                title={`${PART_LABEL[part]} en route`}
                body={`Livraison à ${hhmm(train.partsEta)}, dans ${minutesLeft(train.partsEta, now)} min. La rame repartira dès que la pièce sera posée.`}
              />
              {cat && minutesLeft(train.partsEta, now) > cat.expressMin && (
                <button
                  onClick={() => post("express", "/trains/repair", { trainId: train.id, mode: "express" }, "Livraison express demandée")}
                  disabled={!!busy || balance < cat.express - cat.price}
                  className="mt-3 text-[13.5px] font-body border border-amber/50 text-amber px-3 py-2 hover:bg-amber/10 disabled:opacity-40 rounded-control"
                >
                  Passer en express, +{fmt(cat.express - cat.price)} pi. (livrée en {cat.expressMin} min)
                </button>
              )}
            </>
          ) : broken && part ? (
            <>
              <StatusLine tone="red" title={`${organs.find((o) => o.id === part)?.label ?? "Un organe"} hors service`} body={`Il faut ${PART_NEED[part] ?? "la pièce"} pour la remettre en ligne. Main-d'œuvre : ${fmt(labor)} pi.`} />
              <div className="grid sm:grid-cols-3 gap-2 mt-3">
                <RepairOption
                  title="Pièce du magasin"
                  detail={inStock > 0 ? `${inStock} en stock, réparée tout de suite` : "Aucune en stock"}
                  price={labor}
                  disabled={!!busy || inStock <= 0 || balance < labor}
                  onClick={() => post("stock", "/trains/repair", { trainId: train.id, mode: "stock" }, "Rame réparée avec une pièce du magasin")}
                />
                <RepairOption
                  title="Commander"
                  detail={cat ? `Livrée dans ${cat.delayMin} min` : "Livraison normale"}
                  price={labor + (cat?.price ?? 0)}
                  disabled={!!busy || balance < labor + (cat?.price ?? 0)}
                  onClick={() => post("order", "/trains/repair", { trainId: train.id, mode: "order" }, "Pièce commandée")}
                />
                <RepairOption
                  title="Express"
                  detail={cat ? `Livrée dans ${cat.expressMin} min` : "Livraison rapide"}
                  price={labor + (cat?.express ?? 0)}
                  accent
                  disabled={!!busy || balance < labor + (cat?.express ?? 0)}
                  onClick={() => post("express", "/trains/repair", { trainId: train.id, mode: "express" }, "Pièce commandée en express")}
                />
              </div>
            </>
          ) : broken ? (
            <>
              <StatusLine tone="red" title="En panne" body="Une panne d'avant l'atelier : elle se répare comme avant, sans pièce." />
              <button
                onClick={() => post("legacy", "/trains/repair", { trainId: train.id }, "Rame réparée et remise en service")}
                disabled={!!busy || balance < labor}
                className="mt-3 text-[14px] font-semibold font-body bg-rail-red text-white px-3.5 py-2 hover:bg-rail-red/90 disabled:opacity-40 rounded-control"
              >
                Réparer, {fmt(labor)} pi.
              </button>
            </>
          ) : (
            <>
              <StatusLine
                tone={train.wear >= 85 ? "red" : train.wear >= 60 ? "amber" : "green"}
                title={train.wear >= 85 ? "À réviser d'urgence" : train.wear >= 60 ? "Une révision serait bienvenue" : "En bon état"}
                body={
                  train.wear >= 85
                    ? "Au-delà de 85 %, une rame peut casser avant d'atteindre 100 %, et il faudra commander une pièce."
                    : weakest
                    ? `${weakest.label} : c'est l'organe qui lâchera en premier.`
                    : "Usure normale."
                }
              />
              <button
                onClick={() => post("service", "/trains/repair", { trainId: train.id }, `${train.name} part à l'atelier`, () => playChime())}
                disabled={!!busy || train.wear === 0 || balance < serviceCost || onFreight}
                title={onFreight ? "Révisez-la au retour de sa livraison" : undefined}
                className="mt-3 text-[14px] font-semibold font-body bg-cobalt text-onaccent px-3.5 py-2 hover:bg-cobalt/90 disabled:opacity-40 rounded-control"
              >
                {train.wear === 0 ? "Rien à réviser" : `Réviser maintenant, ${fmt(serviceCost)} pi. (${serviceMinutes(train.wear)} min d'atelier)`}
              </button>
            </>
          )}
        </section>

        {/* les organes */}
        {organs.length > 0 && (
          <section className="px-5 py-4 border-b border-line">
            <h4 className="font-body font-semibold text-[15px] mb-2.5">État des organes</h4>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {organs.map((o) => {
                const color = o.broken ? "bg-rail-red" : o.wear >= 85 ? "bg-rail-red" : o.wear >= 60 ? "bg-amber" : "bg-rail-green";
                return (
                  <div key={o.id}>
                    <div className="flex justify-between text-[13px] font-body">
                      <span className={o.broken ? "text-[#fca5a5]" : ""}>
                        {o.label}
                        {o.broken ? ", cassé" : weakest?.id === o.id && !broken && train.wear > 0 ? ", lâchera en premier" : ""}
                      </span>
                      <span className="font-mono2 text-slate2 tabular-nums">{o.wear} %</span>
                    </div>
                    <div className="h-[5px] bg-line mt-1">
                      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${o.wear}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* révision programmée */}
        <section className="px-5 py-4 border-b border-line">
          <h4 className="font-body font-semibold text-[15px]">Révision programmée</h4>
          <p className="text-[13px] text-slate2 font-body mt-0.5 mb-3">
            La rame passe d'elle-même à l'atelier en fin de trajet dès qu'elle atteint le seuil : 60 % du prix d'une réparation, aucune pièce à commander, quelques minutes sans rouler.
          </p>
          <div className="inline-flex border border-line rounded-card" role="radiogroup" aria-label="Seuil de révision">
            {[null, 40, 60, 80].map((v) => {
              const active = (train.serviceAt ?? null) === v;
              return (
                <button
                  key={String(v)}
                  role="radio"
                  aria-checked={active}
                  onClick={() => !active && post(`plan:${v}`, "/trains/service-plan", { trainId: train.id, threshold: v }, v ? `Révision programmée à ${v} %` : "Révision programmée retirée")}
                  className={`px-3.5 py-2 text-[13.5px] font-body border-r border-line last:border-r-0 rounded-control ${active ? "bg-cobalt/15 text-cobalt" : "text-slate2 hover:text-offwhite"}`}
                >
                  {v === null ? "Aucune" : `À ${v} %`}
                </button>
              );
            })}
          </div>
        </section>

        {/* équipage */}
        <section className="px-5 py-4 border-b border-line">
          <h4 className="font-body font-semibold text-[15px] mb-2">Équipage</h4>
          {[
            { role: "CONTROLEUR", label: "Contrôleur", current: controleur, effect: "+4 % de recette et de la réputation", hidden: train.model === "FRET_LOURD" },
            { role: "CONDUCTEUR", label: "Conducteur", current: conducteur, effect: "moins de retards, d'incidents et d'usure", hidden: false },
          ]
            .filter((r) => !r.hidden)
            .map((r) => {
              const pool = crew.filter((c) => c.role === r.role);
              return (
                <div key={r.role} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-line/60 last:border-0">
                  <div className="min-w-0">
                    <div className="text-[14px] font-body">
                      {r.label} : {r.current ? <span className="text-offwhite">{r.current.name}, niv. {r.current.level}</span> : <span className="text-slate2">personne</span>}
                    </div>
                    <div className="text-[12.5px] text-slate2 font-body">{r.effect}</div>
                  </div>
                  {pool.length === 0 ? (
                    <button onClick={onGoStaff} className="text-[13px] font-body text-cobalt hover:underline">
                      Embaucher un {r.label.toLowerCase()}
                    </button>
                  ) : (
                    <select
                      value={r.current?.id ?? ""}
                      onChange={(e) => {
                        const staffId = e.target.value || r.current?.id;
                        if (!staffId) return;
                        void post(`crew:${r.role}`, "/staff/assign", { staffId, trainId: e.target.value ? train.id : null }, e.target.value ? `${pool.find((p) => p.id === e.target.value)?.name} monte à bord` : `${r.current?.name} redescend au dépôt`);
                      }}
                      disabled={!!busy}
                      className="bg-navy-950 border border-line text-[13.5px] font-body px-2 py-1.5 max-w-[240px] rounded-control"
                      aria-label={`${r.label} de ${train.name}`}
                    >
                      <option value="">{r.current ? "Retirer de la rame" : "Choisir…"}</option>
                      {pool.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}, niv. {p.level ?? 1}
                          {p.trainId && p.trainId !== train.id ? ` (sur ${trainName(p.trainId) ?? "une autre rame"})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
        </section>

        {/* 2.1 : la plaque nominative, sous l'emblème de la motrice */}
        {plateStyles.length > 0 && (
          <section className="px-5 py-4 border-b border-line">
            <h4 className="font-body font-semibold text-[15px]">Plaque nominative</h4>
            <p className="text-[13px] text-slate2 font-body mt-0.5">Le nom de la rame, gravé sur la motrice : on le voit au quai, en vue cabine et au catalogue.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => post("plate", "/trains/plate", { trainId: train.id, style: null }, `Plaque retirée de ${train.name}`)}
                className={`px-3 py-2 border font-body text-[12px] font-medium rounded-control ${!train.plateStyle ? "border-cobalt text-cobalt" : "border-line text-slate2"}`}
              >
                Aucune
              </button>
              {plateStyles.map((p) => (
                <button
                  key={p}
                  onClick={() => post("plate", "/trains/plate", { trainId: train.id, style: p }, `Plaque ${PLATE_STYLE_LABELS[p]?.toLowerCase() ?? ""} posée sur ${train.name}`)}
                  aria-pressed={train.plateStyle === p}
                  className={`px-2 py-1.5 border rounded-control ${train.plateStyle === p ? "border-cobalt" : "border-line hover:border-slate2"}`}
                >
                  <NamePlate style={p} className="text-[11px]">
                    {train.name}
                  </NamePlate>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 2.1.1 (Premium) : horaires de la rame */}
        {!isFreightLoco(train.model) && <TrainSchedule train={train} isPremium={isPremium} onChange={onChange} onGoPremium={onGoPremium} />}

        {/* revente */}
        <section className="px-5 py-4">
          <h4 className="font-body font-semibold text-[15px]">Revente</h4>
          <p className="text-[13px] text-slate2 font-body mt-0.5">
            Valeur de reprise aujourd'hui : <span className="font-mono2 text-offwhite">{fmt(train.resaleValue ?? 0)} pi.</span> {train.heritage ? "Une rame de collection ne perd rien avec l'âge : elle se reprend à 90 % de ce qu'elle a coûté, selon son état." : "Elle baisse avec l'âge et l'usure ; les voitures attelées sont reprises à moitié prix."}
          </p>
          {/* 2.1.1 (Premium) : la cote, son historique et le meilleur jour pour revendre */}
          {isPremium && !train.heritage && <ResaleOutlook trainId={train.id} trainName={train.name} />}
          {isPremium ? (
            confirmSell ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() =>
                    post("sell", "/trains/sell", { trainId: train.id }, `${train.name} revendue ${fmt(train.resaleValue ?? 0)} pi.`, () => {
                      playAlert();
                      onClose();
                    })
                  }
                  disabled={!!busy || Boolean(train.partsEta) || onFreight}
                  className="text-[14px] font-semibold font-body bg-rail-red text-white px-3.5 py-2 disabled:opacity-40 rounded-control"
                >
                  Revendre {train.name} pour {fmt(train.resaleValue ?? 0)} pi.
                </button>
                <button onClick={() => setConfirmSell(false)} className="text-[14px] font-body text-slate2 border border-line px-3.5 py-2 rounded-control">
                  Garder la rame
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmSell(true)}
                disabled={Boolean(train.partsEta) || onFreight}
                title={train.partsEta ? "Une pièce est en commande pour cette rame" : onFreight ? "Elle livre du fret : attendez son retour" : undefined}
                className="mt-3 text-[14px] font-body text-slate2 border border-line px-3.5 py-2 hover:text-rail-red hover:border-rail-red/60 disabled:opacity-40 rounded-control"
              >
                Revendre la rame
              </button>
            )
          ) : (
            <button onClick={onGoPremium} className="mt-3 text-[13.5px] font-body text-amber border border-amber/40 px-3.5 py-2 hover:bg-amber/10 rounded-control">
              La revente est réservée au Premium
            </button>
          )}
        </section>
      </div>
    </div>,
    document.body
  );
}

function StatusLine({ tone, title, body }: { tone: "red" | "amber" | "green" | "cobalt"; title: string; body: string }) {
  const dot = { red: "bg-rail-red", amber: "bg-amber", green: "bg-rail-green", cobalt: "bg-cobalt" }[tone];
  const text = { red: "text-[#fca5a5]", amber: "text-amber", green: "text-rail-green", cobalt: "text-cobalt" }[tone];
  return (
    <div>
      <div className={`flex items-center gap-2 text-[15px] font-body font-semibold ${text}`}>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        {title}
      </div>
      <p className="text-[13.5px] text-slate2 font-body mt-1 pl-4">{body}</p>
    </div>
  );
}

function RepairOption({ title, detail, price, onClick, disabled, accent }: { title: string; detail: string; price: number; onClick: () => void; disabled: boolean; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-left border px-3 py-2.5 transition-colors disabled:opacity-40 rounded-control ${accent ? "border-amber/50 hover:bg-amber/10" : "border-line hover:border-cobalt hover:bg-cobalt/5"}`}
    >
      <div className="text-[14px] font-body font-semibold">{title}</div>
      <div className="text-[12.5px] text-slate2 font-body">{detail}</div>
      <div className={`font-mono2 text-[14px] mt-1 ${accent ? "text-amber" : "text-offwhite"}`}>{fmt(price)} pi.</div>
    </button>
  );
}

/* ---------- le magasin de pièces, sous la flotte ---------- */

export function PartsStore({ balance, onChange }: { balance: number; onChange: () => void }) {
  const [parts, setParts] = useState<PartsInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();
  useEffect(() => {
    void loadParts().then(setParts);
  }, [balance]);
  if (!parts) return null;

  async function buy(id: string, label: string) {
    setBusy(id);
    try {
      const { data } = await api.post("/trains/parts", { part: id, qty: 1 });
      setParts((p) => (p ? { ...p, stock: data.stock, limit: data.limit } : p));
      showToast(`${label} rangé au magasin`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="font-display text-[20px]">Magasin de pièces</h2>
        <span className="text-[12.5px] text-slate2 font-body">{parts.limit} par pièce au plus, +1 par atelier possédé</span>
      </div>
      <p className="text-[13px] text-slate2 font-body mb-3 max-w-[70ch]">
        Une pièce en stock répare une rame cassée tout de suite, au lieu d'attendre une livraison. La réparation automatique s'en sert d'abord.
      </p>
      <ul className="border-t border-line">
        {parts.catalog.map((c) => {
          const have = parts.stock[c.id] ?? 0;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 border-b border-line">
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-body">{c.part}</div>
                <div className="text-[12.5px] text-slate2 font-body">
                  {c.label} · livrée en {c.delayMin} min sur commande, {c.expressMin} min en express ({fmt(c.express)} pi.)
                </div>
              </div>
              <div className="flex items-center gap-1" aria-label={`${have} en stock sur ${parts.limit}`}>
                {Array.from({ length: parts.limit }).map((_, i) => (
                  <span key={i} className={`w-2.5 h-4 ${i < have ? "bg-cobalt" : "border border-line"}`} />
                ))}
              </div>
              <button
                onClick={() => buy(c.id, c.part)}
                disabled={!!busy || have >= parts.limit || balance < c.price}
                className="text-[13px] font-body text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 disabled:opacity-40 whitespace-nowrap rounded-control"
              >
                Acheter, {fmt(c.price)} pi.
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
