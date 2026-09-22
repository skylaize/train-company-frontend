import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";

/* ============================================================
   Cours du fret — la page où la trésorerie cesse d'être un score.

   Trois blocs, dans cet ordre, parce que c'est l'ordre des questions que se
   pose le joueur : où en est mon entrepôt, que valent les marchandises, et
   qu'est-ce que je construis ensuite.
   ============================================================ */

export interface CargoRow {
  cargoType: string;
  basePrice: number;
  index: number;
  buyPrice: number;
  sellPrice: number;
  trendHour: number;
  history: { t: number; i: number }[];
  eventLabel: string | null;
  held: { quantity: number; avgUnitPrice: number; unrealized: number } | null;
}

export interface WarehouseInfo {
  capacity: number;
  level: number;
  stored: number;
  free: number;
  maxTypes: number;
  typesUsed: number;
  storageFeeRatePerHour: number;
  storedValue: number;
}

export interface MarketData {
  cargos: CargoRow[];
  indexMin: number;
  indexMax: number;
  warehouse: WarehouseInfo | null;
  balance: number;
  isPremium: boolean;
}

export interface Quote {
  kind: "DEPOT" | "ENTREPOT" | "ENTREPOT_AGRANDISSEMENT";
  label: string;
  cost: number;
  hours: number;
  available: boolean;
  reason: string | null;
}

export interface ConstructionInfo {
  id: string;
  kind: string;
  label: string;
  cost: number;
  startedAt: string;
  endsAt: string;
  queued?: boolean;
  durationMs?: number;
}

interface Alert {
  id: string;
  cargoType: string;
  direction: "DESSOUS" | "DESSUS";
  threshold: number;
  triggeredAt: string | null;
}

interface StandingOrderRow {
  id: string;
  cargoType: string;
  kind: "ACHAT" | "VENTE";
  threshold: number;
  quantity: number;
}

function formatDuration(ms: number) {
  if (ms <= 0) return "terminé";
  const totalMinutes = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

function formatHours(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/* Courbe du cours. Volontairement sans axes ni grille : à cette taille, ce qui
   compte est la forme, pas la lecture au point près. Le chiffre exact est
   juste à côté, en clair. */
function Sparkline({ points, rising }: { points: { t: number; i: number }[]; rising: boolean }) {
  const path = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.i);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 0.001;
    const w = 150;
    const h = 34;
    return values
      .map((v, idx) => {
        const x = (idx / (values.length - 1)) * w;
        const y = h - ((v - min) / span) * (h - 4) - 2;
        return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  if (!path) {
    return <span className="text-[11px] text-slate2 font-mono2">relevé en cours…</span>;
  }

  return (
    <svg width="150" height="34" viewBox="0 0 150 34" className="overflow-visible" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={rising ? "rgb(var(--c-rail-green))" : "rgb(var(--c-rail-red))"}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MarketSection({ onChange }: { onChange: () => void }) {
  const [data, setData] = useState<MarketData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [orders, setOrders] = useState<StandingOrderRow[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load(announce = false) {
    try {
      const [{ data: m }, { data: a }] = await Promise.all([
        api.get("/market/prices"),
        api.get("/market/alerts").catch(() => ({ data: { alerts: [], orders: [] } })),
      ]);
      setData(m);
      setAlerts(a.alerts ?? []);
      setOrders(a.orders ?? []);

      /* Alertes déclenchées : on les annonce une fois puis on les marque lues,
         sinon le même message reviendrait à chaque rafraîchissement. */
      const fired = (a.alerts ?? []).filter((al: Alert & { seen: boolean }) => al.triggeredAt && !al.seen);
      if (announce && fired.length > 0) {
        fired.forEach((al: Alert) =>
          showToast(
            `${al.cargoType} est passé ${al.direction === "DESSOUS" ? "sous" : "au-dessus"} de ${Math.round(
              al.threshold * 100
            )}`
          )
        );
        await api.post("/market/alerts/seen").catch(() => undefined);
      }
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    load();
    // le cours bouge à chaque tick de simulation : 30 s suffisent à le suivre
    const t = setInterval(() => load(true), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function trade(cargoType: string, kind: "buy" | "sell") {
    const quantity = quantities[cargoType] ?? 1;
    setBusy(cargoType + kind);
    try {
      const { data: r } = await api.post(`/market/${kind}`, { cargoType, quantity });
      showToast(
        kind === "buy"
          ? `${r.quantity} × ${cargoType} acheté${r.quantity > 1 ? "s" : ""} pour ${r.total} pi.`
          : `${r.quantity} × ${cargoType} vendu${r.quantity > 1 ? "s" : ""} — ${r.gain >= 0 ? "+" : ""}${r.gain} pi.`,
        kind === "sell" && r.gain < 0 ? "error" : undefined
      );
      await load();
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Une erreur est survenue", "error");
    } finally {
      setBusy(null);
    }
  }

  if (data === null) {
    return <p className="text-sm text-slate2 font-body">Relevé des cours…</p>;
  }

  return (
    <div>
      {data.warehouse ? (
        <WarehouseBar w={data.warehouse} />
      ) : (
        <div className="border border-line bg-navy-900/40 p-4 mb-5">
          <h3 className="font-display text-lg mb-1">Aucun entrepôt</h3>
          <p className="text-sm text-slate2 font-body max-w-[58ch]">
            Sans entrepôt, vous pouvez suivre les cours mais pas stocker de marchandise. La
            construction se lance depuis les chantiers, en bas de cette page.
          </p>
        </div>
      )}

      <div className="border border-line" data-tutorial="cours-table">
        {data.cargos.map((c, idx) => (
          <CargoRowView
            key={c.cargoType}
            c={c}
            first={idx === 0}
            canStore={Boolean(data.warehouse)}
            balance={data.balance}
            quantity={quantities[c.cargoType] ?? 1}
            setQuantity={(q) => setQuantities((prev) => ({ ...prev, [c.cargoType]: q }))}
            busy={busy}
            onTrade={trade}
          />
        ))}
      </div>

      <PremiumMarketTools
        isPremium={data.isPremium}
        cargos={data.cargos.map((c) => c.cargoType)}
        alerts={alerts}
        orders={orders}
        onChange={() => load()}
      />
    </div>
  );
}

function WarehouseBar({ w }: { w: WarehouseInfo }) {
  const pct = w.capacity > 0 ? Math.min(100, Math.round((w.stored / w.capacity) * 100)) : 0;
  const feePerHour = Math.round(w.storedValue * w.storageFeeRatePerHour);

  return (
    <div className="border border-line bg-navy-900/40 p-4 mb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
        <h3 className="font-display text-lg">Entrepôt</h3>
        <span className="font-mono2 text-[11px] text-slate2 uppercase tracking-wide">
          niveau {w.level} · {w.stored}/{w.capacity} unités · {w.typesUsed}/{w.maxTypes} marchandises
        </span>
      </div>
      <div className="h-1.5 bg-navy-800 mb-3">
        <div className="h-full bg-amber transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[12.5px] text-slate2 font-body">
        {w.storedValue > 0 ? (
          <>
            {w.storedValue.toLocaleString("fr-FR")} pi. immobilisés, {feePerHour} pi./h de frais de garde
  ({String(Math.round(w.storageFeeRatePerHour * 1000) / 10).replace(".", ",")} % de la valeur stockée
            par heure).
          </>
        ) : (
          <>Entrepôt vide : aucun frais de garde tant que rien n'y dort.</>
        )}
      </p>
    </div>
  );
}

function CargoRowView({
  c,
  first,
  canStore,
  balance,
  quantity,
  setQuantity,
  busy,
  onTrade,
}: {
  c: CargoRow;
  first: boolean;
  canStore: boolean;
  balance: number;
  quantity: number;
  setQuantity: (q: number) => void;
  busy: string | null;
  onTrade: (cargoType: string, kind: "buy" | "sell") => void;
}) {
  const rising = c.trendHour >= 0;
  const pctIndex = Math.round(c.index * 100);
  const affordable = Math.floor(balance / c.buyPrice);
  const held = c.held?.quantity ?? 0;

  return (
    <div className={`p-4 ${first ? "" : "border-t border-line"}`}>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 justify-between">
        <div className="flex-1 min-w-[210px]">
          <h4 className="font-display text-[17px] leading-tight">{c.cargoType}</h4>
          <div className="font-mono2 text-[11px] text-slate2 uppercase tracking-wide mt-0.5">
            cours {pctIndex}{" "}
            <span className={rising ? "text-rail-green" : "text-rail-red"}>
              {rising ? "▲" : "▼"} {Math.abs(Math.round(c.trendHour * 1000) / 10)} % /h
            </span>
          </div>
          {c.eventLabel && (
            <p className="text-[12px] text-amber font-body mt-1.5 max-w-[46ch]">{c.eventLabel}</p>
          )}
        </div>

        <div className="shrink-0">
          <Sparkline points={c.history} rising={rising} />
        </div>

        <div className="font-mono2 text-[12px] text-right leading-relaxed w-28 shrink-0">
          <div>
            achat <span className="text-offwhite">{c.buyPrice}</span> pi.
          </div>
          <div>
            vente <span className="text-offwhite">{c.sellPrice}</span> pi.
          </div>
        </div>
      </div>

      {held > 0 && c.held && (
        <div className="mt-3 border-l-2 border-amber/50 pl-3 text-[12.5px] font-body">
          <span className="text-offwhite">
            {held} en stock, payé{held > 1 ? "s" : ""} {c.held.avgUnitPrice.toFixed(0)} pi. l'unité
          </span>{" "}
          <span className={c.held.unrealized >= 0 ? "text-rail-green" : "text-rail-red"}>
            ({c.held.unrealized >= 0 ? "+" : ""}
            {c.held.unrealized} pi. si vous vendez maintenant)
          </span>
        </div>
      )}

      {canStore && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <input
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            className="w-20 bg-navy-900 border border-line px-2 py-1.5 text-sm font-mono2 focus:border-amber outline-none"
            aria-label={`Quantité de ${c.cargoType}`}
          />
          <button
            onClick={() => onTrade(c.cargoType, "buy")}
            disabled={busy !== null || affordable < quantity}
            className="px-3 py-1.5 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide disabled:opacity-40"
          >
            Acheter
          </button>
          <button
            onClick={() => onTrade(c.cargoType, "sell")}
            disabled={busy !== null || held < quantity}
            className="px-3 py-1.5 border border-line font-mono2 text-[11px] uppercase tracking-wide hover:border-amber disabled:opacity-40"
          >
            Vendre
          </button>
          <span className="font-mono2 text-[11px] text-slate2">
            {quantity} × {c.buyPrice} = {(quantity * c.buyPrice).toLocaleString("fr-FR")} pi.
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Outils réservés aux abonnés.

   Ni les alertes ni les ordres permanents n'améliorent le prix obtenu : un
   joueur gratuit devant son écran fait exactement la même opération au même
   cours. Ce qui est vendu ici, c'est de ne pas avoir à rester devant l'écran.
   ============================================================ */
function PremiumMarketTools({
  isPremium,
  cargos,
  alerts,
  orders,
  onChange,
}: {
  isPremium: boolean;
  cargos: string[];
  alerts: Alert[];
  orders: StandingOrderRow[];
  onChange: () => void;
}) {
  const [cargoType, setCargoType] = useState(cargos[0] ?? "");
  const [direction, setDirection] = useState<"DESSOUS" | "DESSUS">("DESSOUS");
  const [threshold, setThreshold] = useState(92);
  const [orderKind, setOrderKind] = useState<"ACHAT" | "VENTE">("ACHAT");
  const [orderQty, setOrderQty] = useState(5);
  const { showToast } = useToast();

  useEffect(() => {
    if (!cargoType && cargos.length > 0) setCargoType(cargos[0]);
  }, [cargos, cargoType]);

  async function addAlert() {
    try {
      await api.post("/market/alerts", { cargoType, direction, threshold: threshold / 100 });
      showToast("Alerte posée");
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Une erreur est survenue", "error");
    }
  }

  async function addOrder() {
    try {
      await api.post("/market/orders", {
        cargoType,
        kind: orderKind,
        threshold: threshold / 100,
        quantity: orderQty,
      });
      showToast("Ordre permanent enregistré");
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Une erreur est survenue", "error");
    }
  }

  async function remove(kind: "alerts" | "orders", id: string) {
    try {
      await api.delete(`/market/${kind}/${id}`);
      onChange();
    } catch {
      showToast("Suppression impossible", "error");
    }
  }

  return (
    <section className="border border-line bg-navy-900/40 mt-6 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h3 className="font-display text-lg">Surveillance du marché</h3>
        <span className="font-mono2 text-[10.5px] text-amber uppercase tracking-[0.16em]">Premium</span>
      </div>
      <p className="text-[12.5px] text-slate2 font-body max-w-[60ch] mb-4">
        Alertes et ordres permanents. Ils ne donnent aucun meilleur prix : ils vous évitent de
        surveiller le tableau vous-même. Activez les notifications dans les Paramètres et l'alerte
        vous parvient même jeu fermé.
      </p>

      {!isPremium ? (
        <p className="text-[12.5px] text-slate2 font-body">
          Réservé aux compagnies Premium. Vous pouvez faire exactement les mêmes opérations à la
          main, au même cours.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2 mb-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-wide">Marchandise</span>
              <select
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
                className="bg-navy-900 border border-line px-2 py-1.5 text-sm font-body focus:border-amber outline-none"
              >
                {cargos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-wide">Seuil</span>
              <input
                type="number"
                min={62}
                max={148}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value) || 100)}
                className="w-24 bg-navy-900 border border-line px-2 py-1.5 text-sm font-mono2 focus:border-amber outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-wide">Sens</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as "DESSOUS" | "DESSUS")}
                className="bg-navy-900 border border-line px-2 py-1.5 text-sm font-body focus:border-amber outline-none"
              >
                <option value="DESSOUS">passe sous</option>
                <option value="DESSUS">passe au-dessus</option>
              </select>
            </label>
            <button
              onClick={addAlert}
              className="px-3 py-1.5 border border-line font-mono2 text-[11px] uppercase tracking-wide hover:border-amber"
            >
              Me prévenir
            </button>

            <span className="w-px h-8 bg-line mx-1 hidden sm:block" />

            <label className="flex flex-col gap-1">
              <span className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-wide">Ordre</span>
              <select
                value={orderKind}
                onChange={(e) => setOrderKind(e.target.value as "ACHAT" | "VENTE")}
                className="bg-navy-900 border border-line px-2 py-1.5 text-sm font-body focus:border-amber outline-none"
              >
                <option value="ACHAT">acheter</option>
                <option value="VENTE">vendre</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-wide">Quantité</span>
              <input
                type="number"
                min={1}
                max={100}
                value={orderQty}
                onChange={(e) => setOrderQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="w-20 bg-navy-900 border border-line px-2 py-1.5 text-sm font-mono2 focus:border-amber outline-none"
              />
            </label>
            <button
              onClick={addOrder}
              className="px-3 py-1.5 bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-wide"
            >
              Poser l'ordre
            </button>
          </div>

          {(alerts.length > 0 || orders.length > 0) && (
            <ul className="border-t border-line divide-y divide-line">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-[12.5px] font-body">
                  <span>
                    Alerte — {a.cargoType} {a.direction === "DESSOUS" ? "sous" : "au-dessus de"}{" "}
                    {Math.round(a.threshold * 100)}
                    {a.triggeredAt && <span className="text-amber"> · déclenchée</span>}
                  </span>
                  <button
                    onClick={() => remove("alerts", a.id)}
                    className="font-mono2 text-[10.5px] text-slate2 hover:text-rail-red uppercase tracking-wide"
                  >
                    retirer
                  </button>
                </li>
              ))}
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-[12.5px] font-body">
                  <span>
                    Ordre — {o.kind === "ACHAT" ? "acheter" : "vendre"} {o.quantity} × {o.cargoType}{" "}
                    {o.kind === "ACHAT" ? "sous" : "au-dessus de"} {Math.round(o.threshold * 100)}
                  </span>
                  <button
                    onClick={() => remove("orders", o.id)}
                    className="font-mono2 text-[10.5px] text-slate2 hover:text-rail-red uppercase tracking-wide"
                  >
                    retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/* ============================================================
   Chantiers.

   Un seul à la fois, et le temps est affiché AVANT la commande : c'est une
   décision, pas une mauvaise surprise.
   ============================================================ */
export function ConstructionPanel({ onChange }: { onChange: () => void }) {
  const [current, setCurrent] = useState<ConstructionInfo | null>(null);
  const [queued, setQueued] = useState<ConstructionInfo | null>(null);
  const [canQueue, setCanQueue] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const { showToast } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/constructions");
      setCurrent(data.current ?? null);
      setQueued(data.queued ?? null);
      setCanQueue(Boolean(data.canQueue));
      setIsPremium(Boolean(data.isPremium));
      setQuotes(data.quotes ?? []);
      setBalance(data.balance ?? 0);
    } catch {
      setQuotes([]);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(clock);
    };
  }, []);

  /* Annonce de fin de chantier.

     L'horloge bat à la seconde pour animer le compte à rebours, et le chantier
     ne disparaît de la base qu'au tour de simulation suivant — jusqu'à trente
     secondes plus tard. Sans ce garde-fou, la condition « le chantier est
     terminé » restait vraie à chaque battement et le joueur recevait trente
     fois le même message.

     On retient donc l'identifiant du chantier déjà annoncé : une annonce par
     chantier, quoi qu'il arrive. */
  const announcedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!current) return;
    if (announcedRef.current === current.id) return;
    if (new Date(current.endsAt).getTime() - now > 0) return;

    announcedRef.current = current.id;
    const label = current.label;
    load().then(() => showToast(`Chantier terminé : ${label}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, current]);

  async function start(kind: Quote["kind"]) {
    setBusy(true);
    try {
      const { data } = await api.post("/constructions", { kind });
      showToast(data?.queued ? "Chantier mis en file : il démarrera à la fin du chantier en cours" : "Chantier lancé");
      await load();
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Une erreur est survenue", "error");
    } finally {
      setBusy(false);
    }
  }

  async function cancelQueue() {
    setBusy(true);
    try {
      const { data } = await api.post("/constructions/queue/cancel");
      showToast(`Chantier retiré de la file · ${Number(data?.refunded ?? 0).toLocaleString("fr-FR")} pi. remboursées`);
      await load();
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Une erreur est survenue", "error");
    } finally {
      setBusy(false);
    }
  }

  const remaining = current ? new Date(current.endsAt).getTime() - now : 0;
  const total = current ? new Date(current.endsAt).getTime() - new Date(current.startedAt).getTime() : 1;
  const progress = current ? Math.min(100, Math.max(0, ((total - remaining) / total) * 100)) : 0;

  return (
    <section className="border border-line bg-navy-900/40 mt-6 p-4" data-tutorial="chantiers">
      <h3 className="font-display text-lg mb-1">Chantiers</h3>
      <p className="text-[12.5px] text-slate2 font-body max-w-[60ch] mb-4">
        Un chantier à la fois. On paie à la commande, la livraison vient plus tard — c'est le temps
        qui limite, pas seulement la trésorerie.
      </p>

      {current && (
        <div className="border border-amber/40 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <span className="font-body text-[14px] text-offwhite">{current.label}</span>
            <span className="font-mono2 text-[11px] text-amber uppercase tracking-wide">
              {/* « il reste 45 min » évite l'accord bancal de « restant(es) »
                  selon qu'on affiche des heures ou des minutes, et le cas où le
                  chantier est fini donnait « terminé restant ». */}
              {remaining > 0 ? `il reste ${formatDuration(remaining)}` : "mise en service…"}
            </span>
          </div>
          <div className="h-1.5 bg-navy-800">
            <div className="h-full bg-amber transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* chantier en file (Premium) : il attend, il n'avance pas */}
      {queued && (
        <div className="border border-dashed border-line p-3 mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-[0.14em] mb-0.5">Ensuite</div>
            <div className="font-body text-[14px]">{queued.label}</div>
            <div className="font-mono2 text-[11px] text-slate2 uppercase tracking-wide">
              démarre à la fin du chantier en cours · {formatDuration(queued.durationMs ?? 0)} de travaux
            </div>
          </div>
          <button
            onClick={cancelQueue}
            disabled={busy}
            className="px-3 py-1.5 border border-line font-mono2 text-[11px] uppercase tracking-wide hover:border-rail-red hover:text-rail-red disabled:opacity-40"
          >
            Retirer · remboursé
          </button>
        </div>
      )}

      {(!current || canQueue) && (
        <>
          {current && (
            <p className="font-mono2 text-[10.5px] text-slate2 uppercase tracking-[0.14em] mt-5 mb-1">
              Préparer le chantier suivant
            </p>
          )}
          <ul className="divide-y divide-line border-t border-line">
            {quotes.map((q) => (
              <li key={q.kind} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-body text-[14px]">{q.label}</div>
                  <div className="font-mono2 text-[11px] text-slate2 uppercase tracking-wide">
                    {q.cost.toLocaleString("fr-FR")} pi. · {formatHours(q.hours)} de travaux
                  </div>
                  {!q.available && q.reason && (
                    <div className="font-body text-[12px] text-slate2 mt-0.5">{q.reason}</div>
                  )}
                </div>
                <button
                  onClick={() => start(q.kind)}
                  disabled={busy || !q.available || balance < q.cost}
                  className="px-3 py-1.5 border border-line font-mono2 text-[11px] uppercase tracking-wide hover:border-amber disabled:opacity-40"
                >
                  {balance < q.cost ? "Trésorerie insuffisante" : current ? "Mettre en file" : "Lancer"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {current && !queued && !isPremium && (
        <p className="text-[12px] text-slate2 font-body mt-3">
          Avec le Premium, vous pouvez préparer le chantier suivant : il démarre tout seul à la fin de celui-ci,
          même la nuit. Il ne va pas plus vite pour autant.
        </p>
      )}
    </section>
  );
}
