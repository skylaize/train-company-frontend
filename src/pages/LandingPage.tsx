import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrainMark, TrackMark, CargoMark, StaffMark, FogMark, FragileMark, MedalMark } from "../components/TrainMark";
import { RailSchematic } from "../components/RailSchematic";
import { SplitFlap } from "../components/SplitFlap";
import { SteamEffect } from "../components/SteamEffect";
import { api } from "../api/client";

interface NetworkStats {
  activeCompanies: number;
  trainsInService: number;
  punctuality: number;
  activeIncidents: number;
}

function buildBoard(stats: NetworkStats | null) {
  return [
    { code: "TC-014", dest: "Compagnies actives", val: stats ? String(stats.activeCompanies).padStart(4, " ") : "  …", status: "OK", color: "text-rail-green" },
    { code: "TC-022", dest: "Trains en circulation", val: stats ? String(stats.trainsInService).padStart(4, " ") : "  …", status: "OK", color: "text-rail-green" },
    { code: "TC-031", dest: "Ponctualité réseau", val: stats ? `${stats.punctuality}%`.padStart(4, " ") : "  …", status: "OK", color: stats && stats.punctuality < 80 ? "text-rail-red" : "text-amber" },
    { code: "TC-047", dest: "Incidents en cours", val: stats ? String(stats.activeIncidents).padStart(4, " ") : "  …", status: stats && stats.activeIncidents > 0 ? "ALERTE" : "OK", color: stats && stats.activeIncidents > 0 ? "text-rail-red" : "text-rail-green" },
  ];
}

const FEATURES = [
  { icon: <TrackMark size={22} className="text-cobalt" />, title: "Dépôt extensible", body: "Commencez avec deux rames, agrandissez jusqu'à six emplacements contre paiement croissant." },
  { icon: <TrainMark size={22} className="text-cobalt" />, title: "Usure réaliste", body: "Vos rames s'usent avec le service. Sans entretien, la panne guette." },
  { icon: <FogMark size={22} className="text-cobalt" />, title: "Météo vivante", body: "Brouillard, canicule, verglas : des épisodes ralentissent vos trains ou accélèrent leur usure." },
  { icon: <StaffMark size={22} className="text-cobalt" />, title: "Personnel qualifié", body: "Un mécanicien réduit l'usure, un chef de dépôt réduit le coût des réparations." },
  { icon: <FragileMark size={22} className="text-cobalt" />, title: "Cargaisons fragiles", body: "Le fret à risque paie beaucoup plus, mais une cargaison endommagée coûte cher." },
  { icon: <MedalMark size={22} className="text-cobalt" />, title: "Succès à débloquer", body: "Seize étapes à franchir, du premier tracé jusqu'à la première place du classement." },
];

const STEPS = [
  { n: "01 — Fonder", title: "Créez votre compagnie", body: "Nom, couleur de livrée — posez vos premiers rails." },
  { n: "02 — Développer", title: "Construisez votre réseau", body: "Tracez vos lignes, achetez du matériel, recrutez votre personnel." },
  { n: "03 — Dominer", title: "Optimisez et grimpez", body: "Soignez votre réputation, devancez la concurrence au classement." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data } = await api.get("/network/stats");
        setStats(data);
      } catch {
        // vitrine publique : pas grave si ça échoue, on affiche juste le tableau en attente
      }
    }
    loadStats();
    const interval = setInterval(loadStats, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-navy-950">
      {/* ===== Navigation ===== */}
      <header className="sticky top-0 z-30 bg-navy-950/90 backdrop-blur-sm border-b border-line">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg">
            <span className="relative inline-flex">
              <SteamEffect size={24} />
              <TrainMark size={18} className="text-cobalt relative" />
            </span>
            Réseau
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate2 font-body">
            <a href="#fonctionnalites" className="hover:text-offwhite transition-colors">Fonctionnalités</a>
            <a href="#offres" className="hover:text-offwhite transition-colors">Offres</a>
            <a href="#comment" className="hover:text-offwhite transition-colors">Comment jouer</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="text-xs font-mono2 uppercase tracking-wide text-slate2 hover:text-offwhite transition-colors px-3 py-2"
            >
              Connexion
            </button>
            <button
              onClick={() => navigate("/auth?mode=register")}
              className="bg-cobalt text-offwhite text-xs font-semibold uppercase tracking-wide px-4 py-2.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform"
            >
              Créer ma compagnie
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="border-b border-line rail-bg relative overflow-hidden">
        <RailSchematic className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 relative">
          <div className="flex items-center gap-2 text-xs font-mono2 text-rail-green mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-rail-green blink-dot" />
            Réseau en circulation, 24h/24
          </div>
          <h1 className="font-display text-4xl md:text-5xl max-w-2xl leading-[1.08] mb-5">
            Votre compagnie ferroviaire ne s'arrête jamais.
          </h1>
          <p className="text-base text-slate2 font-body max-w-lg mb-9">
            Achetez vos rames, tracez vos lignes, négociez vos contrats de fret. Vos trains roulent même quand vous êtes hors ligne — la météo, l'usure du matériel et votre réputation font le reste.
          </p>
          <div className="flex flex-wrap gap-3 mb-14">
            <button
              onClick={() => navigate("/auth?mode=register")}
              className="bg-cobalt text-offwhite text-sm font-semibold uppercase tracking-wide px-6 py-3.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform"
            >
              Fonder ma compagnie — gratuit
            </button>
            <a
              href="#fonctionnalites"
              className="border border-line text-offwhite text-sm font-semibold uppercase tracking-wide px-6 py-3.5 hover:border-cobalt hover:text-cobalt transition-colors"
            >
              Voir le tableau des départs
            </a>
          </div>

          <div className="border border-line border-t-2 border-t-cobalt bg-navy-900/80 max-w-2xl">
            <div className="flex justify-between px-4 py-2.5 border-b border-line font-mono2 text-[11px] text-slate2 uppercase tracking-wide">
              <span>Réseau national</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rail-green blink-dot" />
                <SplitFlap value={now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} size="sm" />
              </span>
            </div>
            {buildBoard(stats).map((row) => (
              <div key={row.code} className="flex items-center px-4 py-2.5 border-b border-line last:border-0 font-mono2 text-xs">
                <span className="text-slate2 w-16">{row.code}</span>
                <span className="flex-1">{row.dest}</span>
                <span className={`${row.color} mr-3 font-semibold`}>{row.val}</span>
                <span className={row.status === "ALERTE" ? "text-rail-red" : "text-rail-green"}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Fonctionnalités ===== */}
      <section id="fonctionnalites" className="py-16 md:py-20 border-b border-line">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-12">
            <h2 className="font-display text-2xl md:text-3xl mb-3">Un vrai réseau à gérer, pas une simple liste de trains</h2>
            <p className="text-sm text-slate2 font-body">
              Chaque système répond à une vraie logique d'exploitant ferroviaire, du dépôt jusqu'au bilan comptable.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 divide-y sm:divide-y-0 md:divide-x divide-line border border-line">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6">
                <div className="mb-3">{f.icon}</div>
                <h3 className="font-body text-sm text-offwhite font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate2 font-body leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Comment jouer ===== */}
      <section id="comment" className="py-16 md:py-20 border-b border-line">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-12">
            <h2 className="font-display text-2xl md:text-3xl mb-3">Trois étapes avant le premier départ</h2>
            <p className="text-sm text-slate2 font-body">
              De la fondation de votre compagnie à la domination du classement, la progression suit une vraie logique.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line border border-line">
            {STEPS.map((s) => (
              <div key={s.n} className="p-6 bg-navy-900">
                <div className="font-mono2 text-xs text-amber-dim mb-3">{s.n}</div>
                <h3 className="font-body text-sm text-offwhite font-semibold mb-1.5">{s.title}</h3>
                <p className="text-xs text-slate2 font-body leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Offres ===== */}
      <section id="offres" className="py-16 md:py-20 border-b border-line">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-xl mb-12">
            <h2 className="font-display text-2xl md:text-3xl mb-3">Deux billets pour voyager</h2>
            <p className="text-sm text-slate2 font-body">
              Le réseau reste gratuit pour tout le monde. Une offre Premium arrivera plus tard pour les compagnies qui veulent aller plus loin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Billet Standard */}
            <div className="border border-line border-t-2 border-t-cobalt bg-navy-900/60 p-7 relative">
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono2 text-[11px] uppercase tracking-wide text-rail-green border border-rail-green/40 px-2 py-1">Actif</span>
                <span className="font-mono2 text-xs text-slate2">Billet Standard</span>
              </div>
              <div className="font-display text-3xl mb-1">Gratuit</div>
              <p className="text-xs text-slate2 font-body mb-6">Pour toujours, sans carte bancaire.</p>
              <ul className="space-y-2.5 text-sm font-body mb-7">
                <li className="flex items-start gap-2"><TrainMark size={14} className="text-cobalt shrink-0 mt-0.5" /> Dépôt extensible jusqu'à 6 rames</li>
                <li className="flex items-start gap-2"><TrackMark size={14} className="text-cobalt shrink-0 mt-0.5" /> Lignes, fret et personnel illimités</li>
                <li className="flex items-start gap-2"><MedalMark size={14} className="text-cobalt shrink-0 mt-0.5" /> Succès, défi quotidien et classement</li>
              </ul>
              <button
                onClick={() => navigate("/auth?mode=register")}
                className="w-full bg-cobalt text-offwhite text-sm font-semibold uppercase tracking-wide py-3 hover:bg-cobalt/90 active:scale-[0.98] transition-transform"
              >
                Commencer gratuitement
              </button>
            </div>

            {/* Billet Premium — verrouillé, même logique que le catalogue de trains */}
            <div className="border border-line p-7 relative opacity-60">
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono2 text-[11px] uppercase tracking-wide text-slate2 border border-line px-2 py-1">Verrouillé</span>
                <span className="font-mono2 text-xs text-slate2">Billet Premium</span>
              </div>
              <div className="font-display text-3xl mb-1 text-slate2">À venir</div>
              <p className="text-xs text-slate2 font-body mb-6">Prix et détails communiqués au lancement.</p>
              <ul className="space-y-2.5 text-sm font-body text-slate2 mb-7">
                <li className="flex items-start gap-2"><CargoMark size={14} className="shrink-0 mt-0.5" /> Modèles de trains exclusifs (Express, Fret Lourd)</li>
                <li className="flex items-start gap-2"><StaffMark size={14} className="shrink-0 mt-0.5" /> Directeur commercial (+15% de revenus) et bonus de personnel renforcés</li>
                <li className="flex items-start gap-2"><FragileMark size={14} className="shrink-0 mt-0.5" /> Risque de dommage réduit de moitié sur les cargaisons fragiles</li>
              </ul>
              <button disabled className="w-full border border-line text-slate2 text-sm font-semibold uppercase tracking-wide py-3 cursor-not-allowed">
                Bientôt disponible
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="py-16 md:py-20 border-b border-line bg-navy-900">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-between gap-6">
          <h2 className="font-display text-2xl md:text-3xl max-w-md">Votre compagnie vous attend en gare.</h2>
          <button
            onClick={() => navigate("/auth?mode=register")}
            className="bg-cobalt text-offwhite text-sm font-semibold uppercase tracking-wide px-6 py-3.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform"
          >
            Créer mon compte
          </button>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-slate2 font-mono2">
        Réseau — jeu de gestion de compagnie ferroviaire, jouable gratuitement dans votre navigateur.
      </footer>
    </div>
  );
}
