import { Link } from "react-router-dom";
import { Bars, Btn, Figure, Loading, PageHead, Panel, euros, nf, useAdminData } from "./ui";

type OverviewData = {
  players: { users: number; companies: number; new1: number; new7: number; new30: number; active1: number; active7: number; banned: number; linked: number };
  premium: { paid: number; trials: number };
  revenue: { shop7: number; shop30: number; shopCount30: number; stripe7: number | null; stripe30: number | null; stripeCount30: number | null; byDay: { day: string; cents: number }[] };
  economy: { coins: number; avgBalance: number };
  signups: { day: string; count: number }[];
  activeByHour: number[];
  discord: { bot: boolean; members: number | null; linked: number; openGiveaways: number };
  season: { number: number; name: string; endsAt: string; ranked: number } | null;
  world: { name: string; target: number; progress: number; completedAt: string | null } | null;
  alliances: number;
  top: { id: string; name: string; liveryColor: string; valeur: number; trains: number; lines: number }[];
  push: boolean;
};

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export default function Overview() {
  const { data, error, reload, loading } = useAdminData<OverviewData>("/overview");
  if (!data) return <Loading error={error} onRetry={reload} />;
  const { players: p, premium, revenue, discord, season, world } = data;
  const daysLeft = season ? Math.max(0, Math.ceil((new Date(season.endsAt).getTime() - Date.now()) / 86_400_000)) : 0;
  const hasStripe = revenue.stripe30 !== null;

  return (
    <>
      <PageHead
        title="Vue d'ensemble"
        intro="L'état du jeu en ce moment. « Actif » veut dire que le joueur a ouvert le jeu."
        actions={<Btn onClick={reload} disabled={loading}>{loading ? "Actualisation…" : "Actualiser"}</Btn>}
      />

      <div className="grid gap-px bg-line border border-line grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          <Figure key="c" value={nf(p.companies)} label="Compagnies" detail={`+${nf(p.new1)} en 24 h, +${nf(p.new7)} en 7 j`} />,
          <Figure key="a" value={nf(p.active1)} label="Actives en 24 h" detail={`${pct(p.active1, p.companies)} · ${nf(p.active7)} sur 7 j`} tone="green" />,
          <Figure key="p" value={nf(premium.paid)} label="Premium achetés" detail={`${pct(premium.paid, p.companies)} · ${nf(premium.trials)} essai${premium.trials > 1 ? "s" : ""} en cours`} tone="amber" />,
          <Figure
            key="r"
            value={hasStripe ? euros(revenue.stripe30) : euros(revenue.shop30)}
            label={hasStripe ? "Encaissé sur 30 j" : "Boutique sur 30 j"}
            detail={hasStripe ? `${euros(revenue.stripe7)} sur 7 j · ${nf(revenue.stripeCount30)} paiements` : "Premium non compté (Stripe non relié)"}
            tone="cobalt"
          />,
        ].map((f, i) => (
          <div key={i} className="bg-navy-900 px-4 py-4">
            {f}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <Panel title="Inscriptions" aside={`${nf(p.new30)} sur 30 jours`}>
          <Bars values={data.signups.map((s) => s.count)} labels={data.signups.map((s) => dayLabel(s.day))} />
        </Panel>
        <Panel title={hasStripe ? "Encaissements" : "Ventes de la boutique"} aside={hasStripe ? "Premium et boutique, via Stripe" : "Stripe non relié"}>
          {hasStripe ? (
            <Bars values={revenue.byDay.map((d) => d.cents)} labels={revenue.byDay.map((d) => dayLabel(d.day))} format={euros} />
          ) : (
            <p className="font-body text-[14px] text-slate2">
              Renseigne STRIPE_SECRET_KEY sur le serveur pour voir ici les montants réels, Premium compris. Boutique hors Premium : {euros(revenue.shop7)} sur 7 j, {euros(revenue.shop30)} sur 30 j.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <Panel title="Joueurs vus, heure par heure" aside="24 dernières heures" className="lg:col-span-2">
          <Bars
            values={data.activeByHour}
            labels={data.activeByHour.map((_, i) => (i === 23 ? "Dernière heure" : `Il y a ${23 - i} h`))}
            height={72}
          />
        </Panel>
        <Panel title="Communauté">
          <dl className="grid grid-cols-[1fr_auto] gap-y-2 font-body text-[14px]">
            <dt className="text-slate2">Membres Discord</dt>
            <dd className="font-mono2 text-right">{discord.bot ? nf(discord.members) : "bot non relié"}</dd>
            <dt className="text-slate2">Comptes liés à Discord</dt>
            <dd className="font-mono2 text-right">{nf(discord.linked)}</dd>
            <dt className="text-slate2">Giveaways en cours</dt>
            <dd className="font-mono2 text-right">{nf(discord.openGiveaways)}</dd>
            <dt className="text-slate2">Alliances</dt>
            <dd className="font-mono2 text-right">{nf(data.alliances)}</dd>
            <dt className="text-slate2">Comptes suspendus</dt>
            <dd className={`font-mono2 text-right ${p.banned ? "text-rail-red" : ""}`}>{nf(p.banned)}</dd>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Les plus grosses compagnies" aside="par valeur" className="lg:col-span-2">
          <ol className="divide-y divide-line">
            {data.top.map((c, i) => (
              <li key={c.id}>
                <Link to={`/admin/joueurs/${c.id}`} className="flex items-center gap-3 py-2 hover:bg-navy-800/50 -mx-2 px-2">
                  <span className="w-5 font-mono2 text-[12px] text-slate2 text-right">{i + 1}</span>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.liveryColor }} />
                  <span className="flex-1 min-w-0 truncate font-body text-[14px]">{c.name}</span>
                  <span className="hidden sm:inline font-body text-[12px] text-slate2">
                    {c.trains} rame{c.trains > 1 ? "s" : ""}, {c.lines} ligne{c.lines > 1 ? "s" : ""}
                  </span>
                  <span className="font-mono2 text-[13px] w-28 text-right">{nf(c.valeur)} pi.</span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
        <div className="grid gap-4 content-start">
          <Panel title="Saison">
            {season ? (
              <>
                <p className="font-body text-[15px]">
                  Saison {season.number} · {season.name}
                </p>
                <p className="mt-1 font-body text-[13px] text-slate2">
                  {nf(season.ranked)} compagnie{season.ranked > 1 ? "s" : ""} classée{season.ranked > 1 ? "s" : ""}, fin dans {daysLeft} j
                </p>
              </>
            ) : (
              <p className="font-body text-[14px] text-slate2">Pas de saison en cours.</p>
            )}
          </Panel>
          <Panel title="Grand Chantier">
            {world ? (
              <>
                <div className="h-2 bg-navy-800 overflow-hidden">
                  <div className="h-full bg-amber" style={{ width: `${world.completedAt ? 100 : Math.min(100, (world.progress / world.target) * 100)}%` }} />
                </div>
                <p className="mt-2 font-body text-[13px] text-slate2">
                  {world.completedAt ? "Tunnel ouvert" : `${nf(world.progress)} trajets sur ${nf(world.target)}`}
                </p>
              </>
            ) : (
              <p className="font-body text-[14px] text-slate2">Indisponible.</p>
            )}
          </Panel>
          <Panel title="Économie">
            <p className="font-body text-[14px]">
              <span className="font-mono2">{nf(data.economy.coins)}</span> pièces en caisse
            </p>
            <p className="mt-1 font-body text-[13px] text-slate2">Trésorerie moyenne : {nf(data.economy.avgBalance)} pi.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
