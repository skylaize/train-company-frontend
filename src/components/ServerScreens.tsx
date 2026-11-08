import { ReactNode, useEffect, useState } from "react";
import { LogoMark } from "./Logo";
import { RailSchematic } from "./RailSchematic";
import { DISCORD } from "../social";
import { clearToken } from "../authToken";
import { api } from "../api/client";
import { MaintenanceNotice, MaintenanceNow, setMaintenance, setSuspension, Suspension, useMaintenanceNotice } from "../suspension";

/* ============================================================
   Écrans qui remplacent le jeu quand le serveur le demande :
   compte suspendu, maintenance en cours. Et le bandeau qui annonce
   une maintenance à venir.
   ============================================================ */

const TZ = "Europe/Paris";

function valid(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dayKey = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: TZ });

/* « 20 h », « 20 h 30 » */
export function hour(d: Date) {
  const [h, m] = d.toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).split(":");
  return `${Number(h)} h${m === "00" ? "" : ` ${m}`}`;
}

/* « aujourd'hui à 20 h », « demain à 9 h 30 », « lundi 10 novembre à 20 h » */
export function when(d: Date) {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const day =
    dayKey(d) === dayKey(today)
      ? "aujourd'hui"
      : dayKey(d) === dayKey(tomorrow)
      ? "demain"
      : d.toLocaleDateString("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  return `${day} à ${hour(d)}`;
}

function longDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
}

function Shell({ band, tone, children }: { band: string; tone: "red" | "amber"; children: ReactNode }) {
  const c = tone === "red" ? "bg-rail-red/10 border-rail-red/40 text-rail-red" : "bg-amber/10 border-amber/40 text-amber";
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 bg-navy-950 overflow-hidden">
      <RailSchematic className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none" />
      <div className="relative w-full max-w-[440px]">
        <div className="flex items-center justify-center gap-3 mb-7">
          <LogoMark size={36} />
          <div className="font-display text-2xl leading-none">Réseau</div>
        </div>
        <div className="bg-navy-900 border border-line rounded-lg overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          {/* bandeau façon tableau des départs */}
          <div className={`flex items-center justify-between gap-3 px-6 sm:px-8 py-3 border-b ${c}`}>
            <span className="font-mono2 text-[12px] tracking-[0.18em] uppercase">{band}</span>
            <span className={`w-2 h-2 rounded-full animate-pulse ${tone === "red" ? "bg-rail-red" : "bg-amber"}`} aria-hidden />
          </div>
          <div className="px-6 sm:px-8 pt-6 pb-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

const primary = "sm:flex-1 shrink-0 h-11 inline-flex items-center justify-center rounded-md bg-amber text-onaccent font-semibold text-[13.5px] hover:bg-amber/90 transition";
const secondary = "sm:flex-1 shrink-0 h-11 rounded-md border border-line text-offwhite font-body text-[14px] hover:border-slate2 transition-colors";

/* ---------------- compte suspendu ---------------- */

export function SuspendedScreen({ suspension }: { suspension: Suspension }) {
  const since = valid(suspension.since);
  const until = valid(suspension.until);
  const reason = suspension.reason && suspension.reason !== "non précisée" ? suspension.reason : null;

  function leave() {
    clearToken();
    setSuspension(null);
    window.location.href = "/";
  }

  return (
    <Shell band="Circulation interrompue" tone="red">
      <h1 className="font-display text-2xl">Compte suspendu</h1>
      <p className="text-[13.5px] text-slate2 font-body mt-1.5">
        L'équipe de Réseau a suspendu ce compte{since ? ` le ${longDate(since)}` : ""}.{" "}
        {until ? "Vous ne pouvez pas jouer jusqu'à la fin de la suspension." : "Vous ne pouvez plus jouer tant que la suspension n'est pas levée."}
      </p>

      <div className="mt-5 border border-line rounded-md bg-navy-950 divide-y divide-line">
        <div className="px-4 py-3">
          <div className="text-[11px] font-body text-slate2 uppercase tracking-wider">Motif</div>
          <div className="text-[14.5px] font-body text-offwhite mt-1 whitespace-pre-wrap break-words">{reason ?? "Aucun motif n'a été indiqué."}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] font-body text-slate2 uppercase tracking-wider">Fin de la suspension</div>
          <div className="text-[14.5px] font-body text-offwhite mt-1">
            {until ? (
              <>
                {when(until)}
                <span className="text-slate2"> · le compte se rouvre tout seul</span>
              </>
            ) : (
              "Pas de date de fin"
            )}
          </div>
        </div>
      </div>

      <p className="text-[13px] text-slate2 font-body mt-5">
        Une erreur, ou vous voulez en parler ? Écrivez à l'équipe sur Discord en donnant le nom de votre compagnie.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
        <a href={DISCORD.url} target="_blank" rel="noreferrer" className={primary}>
          Contacter l'équipe
        </a>
        <button onClick={leave} className={secondary}>
          Se déconnecter
        </button>
      </div>
    </Shell>
  );
}

/* ---------------- maintenance en cours ---------------- */

/* Un bout de voie fermé par un heurtoir de chantier */
function Works() {
  return (
    <svg viewBox="0 0 360 64" className="w-full h-auto mt-5" aria-hidden>
      <defs>
        <pattern id="mt-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill="rgb(var(--c-rail-red))" />
          <rect x="6" width="6" height="12" fill="rgb(var(--c-offwhite))" />
        </pattern>
      </defs>
      {Array.from({ length: 15 }, (_, i) => (
        <rect key={i} x={8 + i * 18} y={46} width={10} height={6} rx={1} fill="rgb(var(--c-slate2) / 0.35)" />
      ))}
      <rect x="0" y="44" width="290" height="2.5" fill="rgb(var(--c-slate2) / 0.8)" />
      <rect x="0" y="51" width="290" height="2.5" fill="rgb(var(--c-slate2) / 0.8)" />
      {/* barrière */}
      <rect x="276" y="22" width="4" height="34" fill="rgb(var(--c-slate2))" />
      <rect x="338" y="22" width="4" height="34" fill="rgb(var(--c-slate2))" />
      <rect x="268" y="18" width="82" height="13" rx="1.5" fill="url(#mt-stripes)" stroke="rgb(var(--c-line))" />
      <circle cx="278" cy="10" r="5" fill="rgb(var(--c-amber))" className="animate-pulse" />
      <circle cx="340" cy="10" r="5" fill="rgb(var(--c-amber))" className="animate-pulse" />
    </svg>
  );
}

const CHECK_MS = 30_000;

export function MaintenanceScreen({ maintenance }: { maintenance: MaintenanceNow }) {
  const endsAt = valid(maintenance.endsAt);
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const { data } = await api.get("/status");
      if (!data?.maintenance?.active) {
        setMaintenance(null);
        window.location.reload();
        return;
      }
      setMaintenance({ message: data.maintenance.message ?? "", endsAt: data.maintenance.endsAt ?? null });
    } catch {
      // serveur en train de redémarrer : on réessaiera
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    const t = setInterval(check, CHECK_MS);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const late = endsAt && endsAt.getTime() < now;
  return (
    <Shell band="Travaux sur la voie" tone="amber">
      <h1 className="font-display text-2xl">Maintenance en cours</h1>
      <p className="text-[13.5px] text-slate2 font-body mt-1.5">
        Le jeu est fermé quelques minutes le temps d'une mise à jour. Vos trains continuent de rouler, vous retrouverez tout comme avant.
      </p>

      <Works />

      <div className="mt-4 border border-line rounded-md bg-navy-950 divide-y divide-line">
        {maintenance.message && (
          <div className="px-4 py-3">
            <div className="text-[11px] font-body text-slate2 uppercase tracking-wider">Au programme</div>
            <div className="text-[14.5px] font-body text-offwhite mt-1 whitespace-pre-wrap break-words">{maintenance.message}</div>
          </div>
        )}
        <div className="px-4 py-3">
          <div className="text-[11px] font-body text-slate2 uppercase tracking-wider">Retour prévu</div>
          <div className="text-[14.5px] font-body text-offwhite mt-1">
            {!endsAt ? "Dès que c'est fini" : late ? `Prévu à ${hour(endsAt)}, ça prend un peu plus longtemps` : `Vers ${hour(endsAt)}`}
          </div>
        </div>
      </div>

      <p className="text-[12.5px] text-slate2 font-body mt-4">
        Cette page se recharge toute seule quand le jeu rouvre.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
        <button onClick={check} disabled={checking} className={primary + " disabled:opacity-60"}>
          {checking ? "Vérification…" : "Réessayer"}
        </button>
        <a href={DISCORD.url} target="_blank" rel="noreferrer" className={secondary + " inline-flex items-center justify-center"}>
          Suivre sur Discord
        </a>
      </div>
      <a href="/auth" className="block text-center mt-4 font-body text-[12px] text-slate2/70 hover:text-slate2">
        Connexion de l'équipe
      </a>
    </Shell>
  );
}

/* ---------------- maintenance annoncée ---------------- */

const hiddenKey = (n: MaintenanceNotice) => `maintenance-vue:${n.startsAt}`;

export function MaintenanceBanner() {
  const notice = useMaintenanceNotice();
  const [hidden, setHidden] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!notice) return null;
  const start = valid(notice.startsAt);
  if (!start) return null;
  const key = hiddenKey(notice);
  let stored = false;
  try {
    stored = localStorage.getItem(key) === "1";
  } catch {
    /* stockage bloqué : le bandeau reste */
  }
  const left = Math.round((start.getTime() - Date.now()) / 60_000);
  // dans les dix dernières minutes, le bandeau revient même s'il a été fermé
  if ((hidden === key || stored) && left > 10) return null;
  const end = valid(notice.endsAt);
  const minutes = end ? Math.round((end.getTime() - start.getTime()) / 60_000) : null;

  function hide() {
    setHidden(key);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* rien */
    }
  }

  return (
    <div role="status" className="fixed top-3 left-1/2 -translate-x-1/2 z-[79] w-[min(560px,calc(100%-24px))] bg-navy-900 border border-amber/60 border-t-[3px] border-t-amber shadow-2xl px-4 py-2.5 flex items-start gap-3">
      <span className="mt-1 w-2 h-2 shrink-0 rounded-full bg-amber animate-pulse" aria-hidden />
      <div className="flex-1 min-w-0 font-body text-[13px]">
        <div className="text-offwhite">
          Maintenance {left <= 0 ? "imminente" : left <= 60 ? `dans ${left} min` : when(start)}
          {minutes ? <span className="text-slate2"> · environ {minutes} min</span> : null}
        </div>
        {notice.message && <div className="text-slate2 mt-0.5 break-words">{notice.message}</div>}
      </div>
      <button onClick={hide} className="text-slate2 hover:text-offwhite text-lg leading-none px-1 -mt-0.5" aria-label="Masquer">
        ×
      </button>
    </div>
  );
}
