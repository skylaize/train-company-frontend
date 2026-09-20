import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { MarketSection, ConstructionPanel } from "../components/MarketSection";
import { NotificationsPanel } from "../components/NotificationsPanel";

/* Durée de chantier, en clair. Le joueur doit lire « 2 h 15 », pas « 2.25 ». */
function formatBuildHours(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}
import { TrainMark, TrackMark, CargoMark, TrophyMark, LedgerMark, MedalMark, SwapMark, MapMark, StaffMark, GearMark, FogMark, SunMark, SnowMark, LockMark, FragileMark, RankMark, AnnounceMark } from "../components/TrainMark";
import { RailSchematic } from "../components/RailSchematic";
import { Tutorial } from "../components/Tutorial";
import { SplitFlap } from "../components/SplitFlap";
import { SteamEffect } from "../components/SteamEffect";
import { WeatherOverlay } from "../components/WeatherOverlay";
import { WhatsNewModal } from "../components/WhatsNewModal";
import { FirstVisitHint } from "../components/FirstVisitHint";
import { applyTheme, readLocalTheme, THEMES, ThemeId } from "../theme";
import { CURRENT_VERSION } from "../changelog";

interface Train {
  id: string;
  name: string;
  model: "STANDARD" | "EXPRESS" | "FRET_LOURD";
  status: "IDLE" | "EN_ROUTE" | "MAINTENANCE";
  progress: number;
  wear: number;
  line?: { id: string; name: string; departureStation: string; arrivalStation: string } | null;
}

interface Weather {
  type: string;
  label: string | null;
  endsAt: string | null;
}

interface Staff {
  id: string;
  role: "MECANICIEN" | "CHEF_DEPOT" | "DIRECTEUR_COMMERCIAL";
  salaryPerTick: number;
}

interface TodaySummary {
  income: number;
  expenses: number;
  net: number;
  lineTrips: number;
  freightDeliveries: number;
  incidents: number;
}

interface CareerRequirement {
  label: string;
  met: boolean;
}

interface CareerRank {
  id: number;
  name: string;
  requirements: CareerRequirement[];
  achieved: boolean;
}

interface CareerStatus {
  currentRank: CareerRank;
  nextRank: CareerRank | null;
  ranks: CareerRank[];
}

interface DailyChallenge {
  type: string;
  label: string;
  target: number;
  reward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface Incident {
  id: string;
  message: string;
  createdAt: string;
}

interface Line {
  id: string;
  name: string;
  departureStation: string;
  arrivalStation: string;
  durationMinutes: number;
}

interface Company {
  id: string;
  name: string;
  liveryColor: string;
  balance: number;
  maxTrains: number;
  reputation: number;
  isPremium: boolean;
  tutorialSeen: boolean;
  nextDepotCost?: number;
  nextDepotHours?: number;
  construction?: { id: string; label: string; endsAt: string } | null;
  upkeepPerHour?: number;
  hintsSeen?: string;
  theme?: ThemeId;
  lastSeenVersion?: string | null;
}

interface Contract {
  id: string;
  cargoType: string;
  originStation: string;
  destinationStation: string;
  durationMinutes: number;
  reward: number;
  risky: boolean;
  insured: boolean;
  status: "DISPONIBLE" | "EN_COURS" | "LIVREE";
  expiresAt?: string | null;
  train?: { id: string; name: string; progress: number } | null;
}

interface ReferralInfo {
  code: string;
  wasReferred: boolean;
  title: string | null;
  totalReferred: number;
  rewardsGranted: number;
  pendingRewards: number;
  referrals: { name: string; rewarded: boolean }[];
  qualified: number;
  milestoneReached: number;
  milestones: { count: number; label: string; unlocked: boolean }[];
  nextMilestone: { count: number; label: string; remaining: number } | null;
}

interface LeaderEntry {
  rank: number;
  id: string;
  name: string;
  liveryColor: string;
  grade: string;
  title: string | null;
  trains: number;
  lines: number;
  metric: number;
  isMe: boolean;
}

interface LeaderResponse {
  board: string;
  label: string;
  note: string;
  missing: string;
  unit: string;
  boards: { id: string; label: string }[];
  total: number;
  entries: LeaderEntry[];
  around: LeaderEntry[];
  me: {
    eligible: boolean;
    rank: number;
    metric: number;
    inTop: boolean;
    gap: number;
    aheadName: string | null;
  } | null;
}

export default function Dashboard() {
  const { logout } = useAuth();
  const { showToast, showComposter } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"lignes" | "trains" | "fret" | "missions" | "classement" | "historique" | "succes" | "carte" | "personnel" | "parametres" | "carriere" | "cours">("trains");
  const [now, setNow] = useState(new Date());
  const [market, setMarket] = useState<Contract[]>([]);
  const [myContracts, setMyContracts] = useState<Contract[]>([]);
  const [leaderTotal, setLeaderTotal] = useState(0);
  const [missionCount, setMissionCount] = useState(0);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [career, setCareer] = useState<CareerStatus | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [buyingTrain, setBuyingTrain] = useState(false);

  async function buyTrain(model: string) {
    setBuyingTrain(true);
    try {
      const trainName = `Rame ${trains.length + 1}`;
      await api.post("/trains", { name: trainName, model });
      showToast(`${trainName} acquise`);
      setShowCatalog(false);
      loadAll();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBuyingTrain(false);
    }
  }

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  /* Retour de la page de paiement Stripe.

     Le statut Premium n'est accordé que par le webhook signé, jamais par cette
     redirection — un joueur peut ouvrir cette adresse à la main. Mais le
     webhook peut arriver une ou deux secondes APRÈS le retour du joueur : sans
     ce petit rappel, il revient sur « Compte gratuit » alors qu'il vient de
     payer, et il n'a aucune raison de faire confiance à ce qu'il voit. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const premium = params.get("premium");
    if (!premium) return;

    // on nettoie l'adresse pour que le message ne revienne pas à chaque rechargement
    window.history.replaceState({}, "", window.location.pathname);

    if (premium === "annule") {
      showToast("Paiement abandonné — votre compagnie n'a pas été débitée");
      return;
    }
    if (premium !== "ok") return;

    showToast("Paiement reçu — activation du Premium en cours…");
    let tries = 0;
    const retry = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await api.get("/company");
        if (data?.isPremium) {
          clearInterval(retry);
          setCompany(data);
          showToast("Premium activé. Merci de soutenir le réseau.");
          return;
        }
      } catch {
        /* réseau capricieux : on retentera au tour suivant */
      }
      if (tries >= 10) {
        clearInterval(retry);
        showToast(
          "Le paiement est enregistré mais l'activation tarde. Rechargez la page dans une minute.",
          "error"
        );
      }
    }, 2000);
    return () => clearInterval(retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      const { data: c } = await api.get("/company");
      setCompany(c);

      /* Le thème du compte fait foi : il suit le joueur d'un appareil à l'autre.
         Le thème local n'a servi qu'à éviter le flash pendant cet appel. */
      if (c?.theme && c.theme !== readLocalTheme()) applyTheme(c.theme);
      const [{ data: l }, { data: t }, { data: mkt }, { data: mine }, { data: lb }, { data: inc }, { data: tx }, { data: ach }, { data: dc }, { data: st }, { data: wx }, { data: sum }, { data: car }, { data: ref }, { data: cli }] = await Promise.all([
        api.get("/lines"),
        api.get("/trains"),
        api.get("/contracts/market"),
        api.get("/contracts/mine"),
        api.get("/leaderboard"),
        api.get("/incidents/mine"),
        api.get("/transactions/mine"),
        api.get("/achievements/mine"),
        api.get("/daily-challenge/mine"),
        api.get("/staff/mine"),
        api.get("/weather/current"),
        api.get("/summary/today"),
        api.get("/career/mine"),
        api.get("/referral/mine").catch(() => ({ data: null })),
        api.get("/clients/mine").catch(() => ({ data: null })),
      ]);
      setLines(l);
      setMarket(mkt);
      setLeaderTotal(lb?.total ?? 0);

      /* Pastille du menu : seuls les ordres qui appellent une action comptent.
         Un ordre échoué ou terminé n'a plus rien à demander au joueur. */
      const liveMissions = (cli?.clients ?? []).reduce(
        (sum: number, c: { locked: boolean; missions?: { status: string }[] }) =>
          sum +
          (c.locked
            ? 0
            : (c.missions ?? []).filter((m) => m.status === "PROPOSEE" || m.status === "ACCEPTEE").length),
        0
      );
      setMissionCount(liveMissions);

      /* Un filleul qui prend le départ est la seule bonne nouvelle du parrainage
         que le joueur ne peut pas deviner : on la lui annonce. */
      const nextReferral: ReferralInfo | null = ref ?? null;
      setReferral((prev) => {
        const ref = nextReferral;
        if (ref && prev) {
          if (ref.totalReferred > prev.totalReferred) {
            showToast(`Un filleul a rejoint le réseau (${ref.totalReferred} au total)`);
          } else if (ref.rewardsGranted > prev.rewardsGranted) {
            showToast("Prime de parrainage versée : +150 pi.");
          }
          if (ref.milestoneReached > prev.milestoneReached) {
            const reached = ref.milestones.find((m) => m.count === ref.milestoneReached);
            if (reached) showToast(`Palier de parrainage atteint — ${reached.label}`);
          }
        }
        return ref ?? prev;
      });
      setTransactions(tx);
      setTodaySummary(sum);
      setCareer(car);

      // notifie un changement de météo réseau
      setWeather((prev) => {
        if (prev && prev.type !== wx.type && wx.type !== "CLAIR") {
          showToast(wx.label, "error");
        }
        return wx;
      });

      // notifie si un employé est parti faute de trésorerie
      setStaff((prevStaff) => {
        prevStaff.forEach((prevS) => {
          if (!st.find((newS: Staff) => newS.id === prevS.id)) {
            showToast(`Un employé a quitté la compagnie`, "error");
          }
        });
        return st;
      });

      // notifie quand le défi du jour vient d'être complété
      setDailyChallenge((prev) => {
        if (prev && !prev.completed && dc.completed) {
          showComposter(`Défi accompli : ${dc.label}`);
        }
        return dc;
      });

      // notifie les succès nouvellement débloqués
      setAchievements((prevAchievements) => {
        ach.forEach((newA: Achievement) => {
          const prev = prevAchievements.find((p) => p.id === newA.id);
          if (prev && !prev.unlocked && newA.unlocked) {
            showComposter(`Succès débloqué : ${newA.name}`);
          }
        });
        return ach;
      });

      // notifie les nouveaux incidents (retards, pannes) apparus depuis le dernier rafraîchissement
      setIncidents((prevIncidents) => {
        const prevIds = new Set(prevIncidents.map((i) => i.id));
        inc.forEach((newInc: Incident) => {
          if (!prevIds.has(newInc.id) && prevIncidents.length > 0) {
            showToast(newInc.message, "error");
          }
        });
        return inc;
      });

      // notifie si une livraison de fret vient de se terminer
      setMyContracts((prevContracts) => {
        mine.forEach((newC: Contract) => {
          const prev = prevContracts.find((p) => p.id === newC.id);
          if (prev && prev.status === "EN_COURS" && newC.status === "LIVREE") {
            showComposter(`Livraison "${newC.cargoType}" terminée — +${newC.reward} pi.`);
          }
        });
        return mine;
      });

      // notifie si un train vient de reboucler (progression retombée à un niveau bas
      // alors qu'il était proche de l'arrivée juste avant)
      setTrains((prevTrains) => {
        t.forEach((newTrain: Train) => {
          const prev = prevTrains.find((p) => p.id === newTrain.id);
          if (prev && prev.progress >= 90 && newTrain.progress < 20 && newTrain.line) {
            showToast(`${newTrain.name} est arrivé à ${newTrain.line.arrivalStation}, repart aussitôt`);
          }
        });
        return t;
      });
    } catch (err: any) {
      // 404 = utilisateur authentifié mais sans compagnie -> formulaire de création
      // 401 = token invalide/expiré -> déconnexion propre et retour à la connexion
      if (err?.response?.status === 404) {
        setCompany(null);
      } else if (err?.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 10_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (company && !company.tutorialSeen) {
      setShowTutorial(true);
    }
  }, [company]);

  async function dismissTutorial() {
    setShowTutorial(false);
    if (company) {
      try {
        // un nouveau joueur n'a connu aucune version précédente : on le considère à jour d'emblée
        await api.patch("/company", { tutorialSeen: true, lastSeenVersion: CURRENT_VERSION });
        loadAll();
      } catch {
        // pas grave si ça échoue ponctuellement, le tutoriel réapparaîtra simplement à la prochaine visite
      }
    }
  }

  useEffect(() => {
    if (!company) return;
    /* Le bulletin est mémorisé sur le compte, pas dans le navigateur : sinon il
       réapparaît dès que le joueur change d'appareil, et il reste invisible sur
       le second appareil de celui qui l'a déjà lu. */
    if (company.tutorialSeen && company.lastSeenVersion !== CURRENT_VERSION) {
      setShowWhatsNew(true);
    }
  }, [company]);

  async function dismissWhatsNew() {
    setShowWhatsNew(false);
    setCompany((prev) => (prev ? { ...prev, lastSeenVersion: CURRENT_VERSION } : prev));
    try {
      await api.patch("/company", { lastSeenVersion: CURRENT_VERSION });
    } catch {
      // sans enregistrement, le bulletin se represente à la prochaine visite : sans gravité
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 grid grid-cols-1 md:grid-cols-[220px_1fr]">
        <aside className="border-r border-line p-5 space-y-3">
          <div className="h-4 w-2/3 bg-navy-900 animate-skeleton" />
          <div className="h-3 w-1/2 bg-navy-900 animate-skeleton" />
        </aside>
        <div>
          <div className="border-b border-line grid grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-6 py-4 border-r border-line last:border-0 space-y-2">
                <div className="h-6 w-10 bg-navy-900 animate-skeleton" />
                <div className="h-2.5 w-16 bg-navy-900 animate-skeleton" />
              </div>
            ))}
          </div>
          <div className="p-8 space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-navy-900 animate-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return <CreateCompanyForm onCreated={loadAll} onLogout={logout} />;
  }

  const enRoute = trains.filter((t) => t.status === "EN_ROUTE").length;

  return (
    <div className="min-h-screen bg-navy-950 grid grid-cols-1 md:grid-cols-[220px_1fr] relative overflow-hidden">
      <RailSchematic className="fixed inset-0 w-full h-full opacity-[0.10] pointer-events-none" />
      <WeatherOverlay type={weather?.type} />
      {/* Sidebar */}
      <aside className="border-b md:border-b-0 md:border-r border-line flex flex-col relative bg-navy-950/30 backdrop-blur-[1px]">
        <button
          onClick={() => setEditingCompany(true)}
          className="text-left px-4 py-3 md:px-5 md:py-6 border-b border-line border-t-[3px] hover:bg-navy-900/40 transition-colors"
          style={{ borderTopColor: company.liveryColor }}
        >
          <div className="flex items-center gap-2.5 mb-0.5 md:mb-1">
            <span className="relative inline-flex">
              <SteamEffect size={28} />
              <TrainMark size={20} style={{ color: company.liveryColor }} className="shrink-0 relative" />
            </span>
            <span className="font-display text-base md:text-xl leading-tight truncate">{company.name}</span>
          </div>
          <div className="hidden md:block text-[11px] text-amber font-body uppercase tracking-[0.14em]">
            {career ? career.currentRank.name : "Console d'exploitation"}
          </div>
        </button>

        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
          <nav className="flex flex-row md:flex-col md:flex-1 md:py-2">
            <SidebarItem icon={<TrainMark size={14} />} label="Trains" count={trains.length} active={view === "trains"} onClick={() => setView("trains")} />
            <SidebarItem icon={<TrackMark size={14} />} label="Lignes" count={lines.length} active={view === "lignes"} onClick={() => setView("lignes")} />
            <SidebarItem icon={<MapMark size={14} />} label="Carte" active={view === "carte"} onClick={() => setView("carte")} />
            <SidebarItem icon={<CargoMark size={14} />} label="Fret" count={myContracts.filter((c) => c.status === "EN_COURS").length} active={view === "fret"} onClick={() => setView("fret")} />
            <SidebarItem icon={<CargoMark size={14} />} label="Missions" count={missionCount} active={view === "missions"} onClick={() => setView("missions")} />
            <SidebarItem icon={<CargoMark size={14} />} label="Cours" active={view === "cours"} onClick={() => setView("cours")} dataTutorial="nav-cours" />
            <SidebarItem icon={<TrophyMark size={14} />} label="Classement" count={leaderTotal} active={view === "classement"} onClick={() => setView("classement")} dataTutorial="nav-classement" />
            <SidebarItem icon={<LedgerMark size={14} />} label="Historique" count={transactions.length} active={view === "historique"} onClick={() => setView("historique")} />
            <SidebarItem icon={<MedalMark size={14} />} label="Succès" count={achievements.filter((a) => a.unlocked).length} active={view === "succes"} onClick={() => setView("succes")} />
            <SidebarItem icon={<RankMark size={14} />} label="Carrière" active={view === "carriere"} onClick={() => setView("carriere")} />
          <SidebarItem icon={<StaffMark size={14} />} label="Personnel" count={staff.length} active={view === "personnel"} onClick={() => setView("personnel")} />
          <SidebarItem icon={<GearMark size={14} />} label="Paramètres" active={view === "parametres"} onClick={() => setView("parametres")} />
          </nav>

          <button
            onClick={() => setShowTutorial(true)}
            className="shrink-0 whitespace-nowrap text-left px-4 py-3 text-xs text-slate2 hover:text-offwhite border-l md:border-l-0 md:border-t border-line font-mono2 uppercase tracking-wide"
          >
            Aide
          </button>
          <button
            onClick={() => setShowWhatsNew(true)}
            title="Voir les notes de version"
            className="shrink-0 whitespace-nowrap text-left px-4 py-3 text-[11px] text-slate2 hover:text-cobalt border-l md:border-l-0 md:border-t border-line font-mono2 uppercase tracking-wide"
          >
            v{CURRENT_VERSION}
          </button>
          <button
            onClick={logout}
            className="shrink-0 whitespace-nowrap text-left px-4 py-3 md:py-4 text-xs text-slate2 hover:text-offwhite border-l md:border-l-0 md:border-t border-line font-mono2 uppercase tracking-wide"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {showTutorial && (
        <Tutorial
          onClose={dismissTutorial}
          setView={setView}
          onOpenCatalog={() => setShowCatalog(true)}
          onCloseCatalog={() => setShowCatalog(false)}
          /* le guide observe l'état réel du jeu pour valider ses étapes d'action */
          state={{
            lineCount: lines.length,
            trainCount: trains.length,
            assignedCount: trains.filter((t) => !!t.line).length,
          }}
        />
      )}
      {showWhatsNew && !showTutorial && <WhatsNewModal onClose={dismissWhatsNew} />}
      {editingCompany && (
        <EditCompanyModal company={company} onClose={() => setEditingCompany(false)} onChange={loadAll} />
      )}
      {showCatalog && (
        <TrainCatalogModal buying={buyingTrain} gradeId={career?.currentRank.id ?? 0} onBuy={buyTrain} onClose={() => setShowCatalog(false)} />
      )}

      {/* Main */}
      <div className="relative bg-navy-950/30 backdrop-blur-[1px]">
        <div className="flex items-center justify-between px-6 py-2 border-b border-line font-mono2 text-[11px] text-slate2 uppercase tracking-wide gap-3">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rail-green blink-dot" />
            Réseau opérationnel
          </span>
          {weather && weather.type !== "CLAIR" && (
            <span className={`flex items-center gap-1.5 truncate ${
              weather.type === "CANICULE" ? "text-rail-red" : weather.type === "VERGLAS" ? "text-cobalt" : "text-slate2"
            }`}>
              {weather.type === "CANICULE" && <SunMark size={13} />}
              {weather.type === "VERGLAS" && <SnowMark size={13} />}
              {weather.type === "BROUILLARD" && <FogMark size={13} />}
              {weather.label}
            </span>
          )}
          <SplitFlap
            value={now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            size="sm"
            className="shrink-0"
          />
        </div>

        <div className="border-b border-line grid grid-cols-2 md:grid-cols-5">
          <StatCell label="Trésorerie" value={`${String(company.balance).padStart(6, " ")} pi.`} color="text-amber" accent="#c99a3e" flap />
          <StatCell label="Trains" value={String(trains.length)} color="text-offwhite" accent="#4a3f2e" />
          <StatCell label="En circulation" value={String(enRoute)} color="text-rail-green" accent="#5c8a68" />
          <StatCell label="Lignes" value={String(lines.length)} color="text-offwhite" accent="#4a3f2e" />
          <StatCell
            label="Réputation"
            value={`${company.reputation}%`}
            color={company.reputation >= 80 ? "text-rail-green" : company.reputation >= 50 ? "text-amber" : "text-rail-red"}
            accent={company.reputation >= 80 ? "#5c8a68" : company.reputation >= 50 ? "#c99a3e" : "#a8483a"}
          />
        </div>

        {dailyChallenge && <DailyChallengeBanner challenge={dailyChallenge} onChange={loadAll} />}

        <main className="p-4 md:p-8">
          <div key={view} className="view-transition">
            <PageHeader view={view} company={company} />
            {view === "trains" && todaySummary && <TodaySummaryCard summary={todaySummary} />}
            {view === "trains" && import.meta.env.VITE_ADS_ENABLED === "true" && <AdWatchCard onChange={loadAll} />}
            {view === "trains" && !!company.upkeepPerHour && (
              <FirstVisitHint
                id="entretien"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Votre réseau a maintenant un coût d'entretien"
                body="Il croît avec le carré de votre parc : les deux premières rames sont exonérées, et chaque rame supplémentaire coûte plus cher que la précédente. Une compagnie a donc une taille optimale, autour de quatorze rames."
                points={[
                  "Le dépôt n'a plus de plafond, mais chaque place coûte 1,7 fois la précédente.",
                  "Au-delà de l'optimum, grandir demande de mieux jouer — fret, ordres, fidélité client — plutôt que d'attendre.",
                ]}
              />
            )}
            {view === "trains" && company.construction && (
              <div className="border border-amber/40 bg-navy-900/40 px-4 py-3 mb-5">
                <span className="font-mono2 text-[10.5px] text-amber uppercase tracking-[0.16em]">
                  Chantier en cours
                </span>
                <div className="font-body text-[14px] text-offwhite mt-1">
                  {company.construction.label} — livraison{" "}
                  {new Date(company.construction.endsAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )}
            {view === "trains" && referral && <ReferralBanner referral={referral} />}
            {view === "trains" && <TrainsSection trains={trains} lines={lines} incidents={incidents} company={company} staff={staff} onChange={loadAll} onOpenCatalog={() => setShowCatalog(true)} />}
            {view === "lignes" && <LinesSection lines={lines} onChange={loadAll} />}
            {view === "fret" && (
              <FreightSection
                market={market}
                myContracts={myContracts}
                trains={trains}
                onChange={loadAll}
              />
            )}
            {view === "missions" && (
              <FirstVisitHint
                id="missions"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Quatre chargeurs vous confient du fret"
                body="Chacun propose un ordre daté que vous acceptez ou refusez. Ce n'est pas la prime qui compte le plus, c'est la confiance : elle majore le tarif de toutes les cargaisons de ce client, mission ou non."
                points={[
                  "Refuser ne coûte rien. Accepter puis ne pas tenir coûte 6 points de confiance.",
                  "À 30 de réputation le client paie +8 %, à 60 +15 %, à 100 +25 %.",
                  "Se spécialiser chez un chargeur est donc une vraie stratégie économique.",
                ]}
              />
            )}
            {view === "missions" && <MissionsSection onChange={loadAll} />}
            {view === "cours" && (
              <>
                <FirstVisitHint
                  id="cours"
                  seen={company.hintsSeen ?? ""}
                  title="Le cours des marchandises"
                  body="Chaque marchandise a un cours qui monte et descend. Achetez quand il est bas, gardez la marchandise dans votre entrepôt, revendez quand il remonte — et livrez de préférence ce que le marché recherche : une livraison paie jusqu'à un quart de plus. Garder du stock coûte des frais de garde, donc attendre a un prix."
                  onSeen={loadAll}
                />
                <MarketSection onChange={loadAll} />
                <ConstructionPanel onChange={loadAll} />
              </>
            )}
            {view === "classement" && (
              <>
                <FirstVisitHint
                  id="classement"
                  seen={company.hintsSeen ?? ""}
                  onSeen={loadAll}
                  title="Quatre classements, et votre place toujours visible"
                  body="Le classement principal ne repose plus sur la trésorerie mais sur la valeur totale de la compagnie — argent, matériel et dépôt réunis. Acheter une rame ne vous fait donc plus reculer."
                  points={[
                    "Valeur, fret de la semaine, ponctualité et parrainage : quatre échelles distinctes.",
                    "Même hors du top 20, votre rang s'affiche avec l'écart exact qui vous sépare du concurrent devant vous.",
                  ]}
                />
                <LeaderboardSection />
              </>
            )}
            {view === "historique" && (
              <TransactionsSection transactions={transactions} currentBalance={company.balance} />
            )}
            {view === "succes" && (
              <AchievementsSection achievements={achievements} />
            )}
            {view === "carriere" && career && (
              <CareerSection career={career} />
            )}
            {view === "carte" && (
              <>
                <FirstVisitHint
                  id="carte"
                  seen={company.hintsSeen ?? ""}
                  onSeen={loadAll}
                  title="La carte sert maintenant à tracer"
                  body="Le bouton « Tracer une ligne » rend les gares cliquables : deux clics et la ligne est prête. La durée du trajet n'est plus à saisir, elle découle de la distance réelle."
                  points={[
                    "Une ligne longue paie mieux à la minute — jusqu'à +25 % au-delà de vingt minutes.",
                    "En contrepartie elle immobilise la rame plus longtemps, et une panne en route fait perdre bien plus de trajet.",
                  ]}
                />
                <NetworkMap lines={lines} trains={trains} contracts={myContracts} onChange={loadAll} />
              </>
            )}
            {view === "personnel" && (
              <StaffSection staff={staff} gradeId={career?.currentRank.id ?? 0} onChange={loadAll} />
            )}
            {view === "parametres" && <SettingsSection company={company} referral={referral} onChange={loadAll} />}
          </div>
        </main>
      </div>
    </div>
  );
}

const PAGE_COPY = {
  trains: { title: "Votre flotte", subtitle: "Achetez, affectez et suivez chaque rame en circulation." },
  lignes: { title: "Vos lignes", subtitle: "Tracez les trajets que vos trains emprunteront." },
  fret: { title: "Le fret", subtitle: "Acceptez des contrats de marchandises pour faire fructifier la compagnie." },
  missions: { title: "Donneurs d'ordre", subtitle: "Quatre chargeurs confient du fret au réseau. Leur confiance se gagne, et elle paie." },
  classement: { title: "Classement", subtitle: "Les compagnies les plus prospères du réseau." },
  historique: { title: "Historique", subtitle: "Le registre de tous les mouvements de trésorerie." },
  succes: { title: "Succès", subtitle: "Les étapes franchies par votre compagnie." },
  carte: { title: "Carte du réseau", subtitle: "Vos lignes et vos trains, positionnés en temps réel." },
  personnel: { title: "Personnel", subtitle: "Recrutez du personnel pour améliorer votre exploitation." },
  parametres: { title: "Paramètres", subtitle: "Gérez votre compte." },
  carriere: { title: "Carrière", subtitle: "Votre progression, grade après grade." },
  cours: { title: "Cours du fret", subtitle: "Ce que valent les marchandises aujourd'hui, et ce que vous en faites." },
};

export type DashboardView = keyof typeof PAGE_COPY;

function PageHeader({ view, company }: { view: DashboardView; company: Company }) {
  const copy = PAGE_COPY[view];
  return (
    <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
      <div>
        <h1 className="font-display text-3xl md:text-4xl leading-none mb-2">{copy.title}</h1>
        <p className="text-sm text-slate2 font-body max-w-md">{copy.subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[11px] text-slate2 font-body uppercase tracking-[0.14em]">Exploitant</div>
        <div className="font-mono2 text-sm" style={{ color: company.liveryColor }}>{company.name}</div>
      </div>
    </div>
  );
}

function TodaySummaryCard({ summary }: { summary: TodaySummary }) {
  const items = [
    { label: "Recettes", value: `+${summary.income} pi.`, color: "text-rail-green" },
    { label: "Dépenses", value: `${summary.expenses} pi.`, color: "text-rail-red" },
    { label: "Solde net", value: `${summary.net >= 0 ? "+" : ""}${summary.net} pi.`, color: summary.net >= 0 ? "text-amber" : "text-rail-red" },
    { label: "Trajets voyageurs", value: String(summary.lineTrips), color: "text-offwhite" },
    { label: "Livraisons", value: String(summary.freightDeliveries), color: "text-offwhite" },
    { label: "Incidents", value: String(summary.incidents), color: summary.incidents > 0 ? "text-rail-red" : "text-slate2" },
  ];

  return (
    <div className="border border-line mb-8">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line">
        <LedgerMark size={14} className="text-cobalt" />
        <span className="text-[11px] font-body text-slate2 uppercase tracking-[0.14em]">Résumé du jour</span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-line">
        {items.map((item) => (
          <div key={item.label} className="px-3 py-3 text-center">
            <div className={`font-mono2 text-sm md:text-base ${item.color}`}>{item.value}</div>
            <div className="text-[9px] md:text-[10px] text-slate2 font-body uppercase tracking-wide mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdWatchCard({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<{ watchedToday: number; remaining: number; maxPerDay: number; rewardPerAd: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const { showToast, showComposter } = useToast();

  useEffect(() => {
    api.get("/ads/status").then(({ data }) => setStatus(data)).catch(() => {});
  }, []);

  async function watchAd() {
    setPlaying(true);
    try {
      // ==========================================================================
      // ESPACE RÉSERVÉ pour le vrai script publicitaire (ex. AppLixir, AdinPlay...).
      // À remplacer par l'appel réel du SDK une fois un compte créé chez un réseau
      // publicitaire compatible web. Le principe à respecter impérativement :
      // n'appeler /ads/claim QUE dans le callback "publicité terminée avec succès"
      // du SDK — jamais si elle est fermée en avance, en erreur, ou non chargée.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      // ==========================================================================

      const { data } = await api.post("/ads/claim");
      showToast(`+${data.reward} pi. — merci d'avoir regardé la publicité`);
      showComposter("Publicité regardée");
      const { data: newStatus } = await api.get("/ads/status");
      setStatus(newStatus);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setPlaying(false);
    }
  }

  if (!status) return null;

  return (
    <div className="border border-line mb-6 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <AnnounceMark size={15} className="text-cobalt shrink-0" />
          <span className="text-[11px] font-body text-slate2 uppercase tracking-[0.14em]">Regarder une publicité</span>
        </div>
        <p className="text-xs text-slate2 font-body">
          +{status.rewardPerAd} pi. par publicité, jusqu'à {status.maxPerDay} par jour — {status.watchedToday}/{status.maxPerDay} aujourd'hui
        </p>
      </div>
      <button
        onClick={watchAd}
        disabled={playing || status.remaining === 0}
        className="text-xs font-mono2 uppercase text-cobalt border border-cobalt/40 px-3 py-2 hover:bg-cobalt/10 transition-colors disabled:opacity-50 shrink-0"
      >
        {playing ? "Lecture…" : status.remaining === 0 ? "Revenez demain" : `Regarder (+${status.rewardPerAd} pi.)`}
      </button>
    </div>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt?: string | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!expiresAt) return <span className="text-slate2">—</span>;

  const remainingMs = new Date(expiresAt).getTime() - now;
  if (remainingMs <= 0) return <span className="text-rail-red">Expiré</span>;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isUrgent = remainingMs < 60_000;

  return (
    <span className={isUrgent ? "text-rail-red urgent-pulse" : "text-slate2"}>
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}

function AssignDropdown({
  placeholder,
  options,
  onSelect,
  triggerClassName,
}: {
  placeholder: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.max(rect.width, 200);
      // évite de dépasser le bord droit de l'écran
      const left = Math.min(rect.left, window.innerWidth - width - 12);
      setCoords({ top: rect.bottom + 4, left, width });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  function handlePick(id: string) {
    onSelect(id);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`select-none flex items-center gap-1.5 text-xs font-mono2 uppercase border px-2.5 py-1.5 transition-colors ${
          triggerClassName ?? "text-offwhite border-line bg-navy-800 hover:border-cobalt"
        }`}
      >
        {placeholder}
        <span className="text-[10px]">▾</span>
      </button>
      {open && coords && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[70] bg-navy-900 border border-line shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)] max-h-60 overflow-y-auto dropdown-menu-enter"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
        >
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate2 font-body">Aucune option disponible</div>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePick(opt.id)}
              className="w-full text-left px-3 py-2 text-xs font-body text-offwhite hover:bg-cobalt/15 hover:text-cobalt transition-colors border-b border-line last:border-0"
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function WearGauge({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  // 0% → aiguille pointant plein ouest, 50% → plein nord (position de base), 100% → plein est
  const rotation = (clamped - 50) * 1.8;
  const zoneColor = clamped >= 80 ? "text-rail-red" : clamped >= 50 ? "text-amber" : "text-rail-green";

  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 58" width="52" height="30" className="shrink-0">
        {/* cadran : zones vert / ambre / rouge */}
        <path d="M10,50 A40,40 0 0,1 50,10" fill="none" stroke="#5c8a68" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
        <path d="M50,10 A40,40 0 0,1 82.36,26.48" fill="none" stroke="#c99a3e" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
        <path d="M82.36,26.48 A40,40 0 0,1 90,50" fill="none" stroke="#a8483a" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
        {/* aiguille, orientée par rotation CSS transitionnée plutôt que recalculée d'un coup */}
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "50px 50px", transition: "transform 0.6s ease-out" }}>
          <line x1="50" y1="50" x2="50" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={zoneColor} />
        </g>
        <circle cx="50" cy="50" r="4" fill="currentColor" className={zoneColor} />
      </svg>
      <span className={`text-[11px] font-mono2 ${zoneColor}`}>{clamped}%</span>
    </div>
  );
}

function SidebarItem({ label, count, active, onClick, icon, dataTutorial }: { label: string; count?: number; active: boolean; onClick: () => void; icon: React.ReactNode; dataTutorial?: string }) {
  return (
    <button
      data-tutorial={dataTutorial}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap md:w-full flex items-center gap-2 md:gap-2.5 px-3.5 md:px-5 py-3 text-sm font-body border-l-2 transition-colors ${
        active ? "border-cobalt text-cobalt bg-navy-900/60" : "border-transparent text-slate2 hover:text-offwhite"
      }`}
    >
      {icon}
      <span className="md:flex-1 text-left">{label}</span>
      {count !== undefined && <span className="text-xs font-mono2">{count}</span>}
    </button>
  );
}

function StatCell({ label, value, color, accent, flap }: { label: string; value: string; color: string; accent: string; flap?: boolean }) {
  return (
    <div className="px-4 py-4 md:px-6 md:py-6 border-r border-line last:border-0 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
      {flap ? (
        <SplitFlap value={value} size="lg" className={color} />
      ) : (
        <div key={value} className={`text-2xl md:text-4xl font-mono2 ${color} animate-flip-in`}>{value}</div>
      )}
      <div className="text-[10px] md:text-[11px] text-slate2 font-body uppercase tracking-[0.1em] md:tracking-[0.14em] mt-1 md:mt-1.5">{label}</div>
    </div>
  );
}

function CreateCompanyForm({ onCreated, onLogout }: { onCreated: () => void; onLogout: () => void }) {
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState(() => new URLSearchParams(window.location.search).get("ref") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/company", { name, referralCode: referralCode.trim() || undefined });
      showToast(`Compagnie "${name}" fondée`);
      onCreated();
    } catch (err: any) {
      const message = err?.response?.data?.error || "Erreur";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-navy-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-line p-6 space-y-4">
        <h1 className="font-display uppercase text-lg">Fondez votre compagnie</h1>
        <input
          className="w-full bg-transparent border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt"
          placeholder="Nom de la compagnie"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div>
          <input
            className="w-full bg-transparent border border-line px-3 py-2.5 text-sm font-mono2 uppercase tracking-wide focus:outline-none focus:border-cobalt"
            placeholder="Code de parrainage (optionnel)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          {referralCode && (
            <p className="text-[11px] text-amber font-body mt-1.5">+100 pi. de bonus de bienvenue si le code est valide</p>
          )}
        </div>
        {error && <p className="text-rail-red text-sm">{error}</p>}
        <button
          disabled={submitting}
          className="w-full bg-cobalt text-onaccent font-semibold py-2.5 text-sm uppercase tracking-wide hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100"
        >
          {submitting ? "Création…" : "Créer"}
        </button>
        <button type="button" onClick={onLogout} className="text-xs text-slate2 hover:text-offwhite">
          Déconnexion
        </button>
      </form>
    </div>
  );
}

const STATIONS = [
  "Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Strasbourg",
  "Nantes", "Toulouse", "Rennes", "Dijon", "Nancy", "Metz",
  "Chartres", "Le Mans", "Rouen", "Le Havre", "Grenoble", "Mulhouse",
];

function StationPicker({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
}) {
  function handlePick(e: React.MouseEvent<HTMLButtonElement>, station: string) {
    onChange(station);
    const details = e.currentTarget.closest("details");
    if (details) details.open = false;
  }

  return (
    <div className="flex-1">
      <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">{label}</label>
      <details className="relative">
        <summary className="cursor-pointer select-none list-none w-full flex items-center justify-between bg-transparent border border-line px-3 py-2 text-sm hover:border-cobalt transition-colors [&::-webkit-details-marker]:hidden">
          <span className={value ? "text-offwhite" : "text-slate2"}>{value || "Choisir une gare…"}</span>
          <span className="text-[10px] text-slate2">▾</span>
        </summary>
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto bg-navy-900 border border-line shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)]">
          {STATIONS.filter((s) => s !== exclude).map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => handlePick(e, s)}
              className="w-full text-left px-3 py-2 text-xs font-body text-offwhite hover:bg-cobalt/15 hover:text-cobalt transition-colors border-b border-line last:border-0"
            >
              {s}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function LinesSection({ lines, onChange }: { lines: Line[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  /* La durée n'est plus un champ : elle est déduite des deux gares, comme sur la
     carte, et le serveur la recalcule de son côté. */
  const plan =
    departure && arrival && STATION_COORDS[departure] && STATION_COORDS[arrival]
      ? (() => {
          const km = distanceKm(STATION_COORDS[departure], STATION_COORDS[arrival]);
          const minutes = durationFromKm(km);
          return { km, minutes, yieldPct: lengthYieldPct(minutes), hourly: hourlyRevenue(minutes) };
        })()
      : null;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();

  function startCreate() {
    setEditingId(null);
    setName(""); setDeparture(""); setArrival("");
    setOpen((v) => !v);
  }

  function startEdit(line: Line) {
    setEditingId(line.id);
    setName(line.name ?? "");
    setDeparture(line.departureStation);
    setArrival(line.arrivalStation);

    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch("/lines", {
          lineId: editingId,
          name,
          departureStation: departure,
          arrivalStation: arrival,

        });
        showToast(`Ligne ${departure} → ${arrival} mise à jour`);
      } else {
        await api.post("/lines", {
          name,
          departureStation: departure,
          arrivalStation: arrival,

        });
        showToast(`Ligne ${departure} → ${arrival} créée`);
      }
      setName(""); setDeparture(""); setArrival("");
      setEditingId(null);
      setOpen(false);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    }
  }

  async function confirmDelete(lineId: string) {
    try {
      await api.delete("/lines", { data: { lineId } });
      showToast("Ligne supprimée");
      setConfirmDeleteId(null);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors de la suppression", "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button data-tutorial="btn-new-line" onClick={startCreate} className="text-xs font-mono2 text-cobalt uppercase border border-cobalt/40 px-2.5 py-1 hover:bg-cobalt/10 active:scale-[0.96] transition-transform">
          {open ? "Annuler" : "+ Ligne"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="border border-line border-t-2 border-t-cobalt p-5 mb-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">Nom de la ligne</label>
            <input
              className="w-full bg-transparent border border-line px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
              placeholder="Ex. Ligne du Littoral"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex items-end gap-2">
            <StationPicker label="Gare de départ" value={departure} onChange={setDeparture} exclude={arrival} />
            <button
              type="button"
              onClick={() => { const tmp = departure; setDeparture(arrival); setArrival(tmp); }}
              title="Inverser départ et arrivée"
              className="mb-0.5 p-2 border border-line text-slate2 hover:text-cobalt hover:border-cobalt transition-colors shrink-0"
            >
              <SwapMark size={16} />
            </button>
            <StationPicker label="Gare d'arrivée" value={arrival} onChange={setArrival} exclude={departure} />
          </div>

          {(departure || arrival) && (
            <div className="border border-dashed border-line px-3 py-2.5 text-sm font-mono2 text-slate2">
              <div className="flex items-center gap-2">
                <TrainMark size={14} className="text-cobalt shrink-0" />
                <span className="text-offwhite">{departure || "?"}</span>
                <span>→</span>
                <span className="text-offwhite">{arrival || "?"}</span>
                {plan && <span className="ml-auto text-amber">{plan.minutes} min</span>}
              </div>
              {/* La durée n'est plus saisie : elle découle de la distance entre les
                  deux gares, et c'est elle qui fixe le rendement de la ligne. */}
              {plan && (
                <div className="text-[11px] mt-1.5 pl-[22px]">
                  {plan.km} km
                  {plan.yieldPct > 0 && (
                    <> · rendement <span className="text-rail-green">+{plan.yieldPct} %</span></>
                  )}
                  {" "}· ~<span className="text-amber">{plan.hourly} pi./h</span> par rame
                </div>
              )}
            </div>
          )}

          <button
            disabled={!departure || !arrival}
            className="w-full bg-cobalt text-onaccent text-sm font-semibold uppercase py-2.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
          >
            {editingId ? "Enregistrer les modifications" : "Créer la ligne"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-left text-[11px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
            <th className="py-2.5 font-normal">Départ</th>
            <th className="py-2.5 font-normal">Arrivée</th>
            <th className="py-2.5 font-normal text-right">Durée</th>
            <th className="py-2.5 font-normal w-44"></th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center text-slate2 font-body">Aucune ligne tracée — dessinez votre premier trajet.</td></tr>
          )}
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-line last:border-0 hover:bg-navy-900/40 transition-colors">
              <td className="py-3.5 font-body">{l.departureStation}</td>
              <td className="py-3.5 font-body">{l.arrivalStation}</td>
              <td className="py-3.5 text-right text-slate2 font-mono2">{l.durationMinutes} min</td>
              <td className="py-3.5 text-right">
                {confirmDeleteId === l.id ? (
                  <span className="flex items-center justify-end gap-2">
                    <span className="text-[11px] text-slate2 font-body">Supprimer ?</span>
                    <button onClick={() => confirmDelete(l.id)} className="text-[11px] text-rail-red uppercase border border-rail-red/40 px-2 py-1 hover:bg-rail-red/10 transition-colors font-body">
                      Oui
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-slate2 uppercase border border-line px-2 py-1 hover:text-offwhite transition-colors font-body">
                      Annuler
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(l)} className="text-[11px] text-cobalt uppercase border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 transition-colors font-body">
                      Modifier
                    </button>
                    <button onClick={() => setConfirmDeleteId(l.id)} className="text-[11px] text-slate2 hover:text-rail-red uppercase border border-line px-2 py-1 transition-colors font-body">
                      Supprimer
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function TrainsSection({
  trains,
  lines,
  incidents,
  company,
  staff,
  onChange,
  onOpenCatalog,
}: {
  trains: Train[];
  lines: Line[];
  incidents: Incident[];
  company: Company;
  staff: Staff[];
  onChange: () => void;
  onOpenCatalog: () => void;
}) {
  const [expanding, setExpanding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { showToast, showComposter } = useToast();
  const hasChefDepot = staff.some((s) => s.role === "CHEF_DEPOT");
  const repairCostPerPoint = hasChefDepot ? 1 : 2;

  const atCapacity = trains.length >= company.maxTrains;
  /* Le barème géométrique vit côté serveur : le recopier ici, c'est prendre le
     risque que les deux divergent après un réglage d'équilibrage. */
  const expandCost = company.nextDepotCost ?? company.maxTrains * 200;

  async function expandFleet() {
    setExpanding(true);
    try {
      await api.post("/company/expand-fleet");
      showToast(
        `Chantier lancé — la ${company.maxTrains + 1}e place sera livrée dans ${formatBuildHours(
          company.nextDepotHours ?? 0.5
        )}`
      );
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setExpanding(false);
    }
  }

  async function assign(trainId: string, lineId: string) {
    try {
      await api.post("/trains/assign", { trainId, lineId });
      const line = lines.find((l) => l.id === lineId);
      showToast(line ? `Train affecté à ${line.departureStation} → ${line.arrivalStation}` : "Train affecté");
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors de l'affectation", "error");
    }
  }

  async function release(trainId: string) {
    try {
      await api.post("/trains/release", { trainId });
      showToast("Train retiré de la ligne, à nouveau disponible");
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    }
  }

  async function repair(trainId: string) {
    try {
      await api.post("/trains/repair", { trainId });
      showComposter("Rame réparée et remise en service");
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors de la réparation", "error");
    }
  }

  async function submitRename(trainId: string) {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await api.post("/trains/rename", { trainId, name: renameValue.trim() });
      setRenamingId(null);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors du renommage", "error");
    }
  }

  return (
    <div data-tutorial="trains-table">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono2 text-slate2 border border-line px-2 py-1">
            {trains.length}/{company.maxTrains} rames
          </span>
          {!!company.upkeepPerHour && (
            <span
              className="text-[11px] font-mono2 text-slate2 border border-line px-2 py-1"
              title="L'entretien croît avec le carré de votre parc : chaque rame supplémentaire coûte plus cher que la précédente."
            >
              entretien −{company.upkeepPerHour} pi./h
            </span>
          )}
          {atCapacity && (
            <button
              onClick={expandFleet}
              /* Un seul chantier à la fois : mieux vaut griser le bouton que
                 laisser le joueur découvrir la règle par un message d'erreur. */
              disabled={expanding || Boolean(company.construction)}
              className="text-[11px] font-mono2 text-amber uppercase border border-amber/40 px-2 py-1 hover:bg-amber/10 transition-colors disabled:opacity-50"
            >
              {expanding
                ? "Chantier…"
                : company.construction
                ? "Chantier déjà en cours"
                : `Agrandir le dépôt (${expandCost} pi. · ${formatBuildHours(company.nextDepotHours ?? 0.5)})`}
            </button>
          )}
        </div>
        <button onClick={onOpenCatalog} disabled={atCapacity} className="text-xs font-mono2 text-cobalt uppercase border border-cobalt/40 px-2.5 py-1 hover:bg-cobalt/10 active:scale-[0.96] transition-transform disabled:opacity-40 disabled:active:scale-100">
          {atCapacity ? "Dépôt complet" : "+ Train"}
        </button>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-left text-[11px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
            <th className="py-2.5 font-normal">Rame</th>
            <th className="py-2.5 font-normal">Modèle</th>
            <th className="py-2.5 font-normal">Statut</th>
            <th className="py-2.5 font-normal">Ligne</th>
            <th className="py-2.5 font-normal w-28">Usure</th>
            <th className="py-2.5 font-normal w-28">Progression</th>
          </tr>
        </thead>
        <tbody>
          {trains.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10">
                <div className="flex flex-col items-center gap-2 text-slate2">
                  <div className="w-32 h-px border-t border-dashed border-line" />
                  <TrainMark size={18} className="opacity-40" />
                  <span className="text-sm font-body">Le dépôt est vide — achetez votre première rame.</span>
                </div>
              </td>
            </tr>
          )}
          {trains.map((t) => (
            <tr key={t.id} className="border-b border-line last:border-0 hover:bg-navy-900/40 transition-colors">
              <td className="py-3.5 font-body">
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    className="bg-transparent border border-cobalt px-2 py-1 text-sm w-28 focus:outline-none"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => submitRename(t.id)}
                    onKeyDown={(e) => e.key === "Enter" && submitRename(t.id)}
                  />
                ) : (
                  <button
                    onClick={() => { setRenamingId(t.id); setRenameValue(t.name); }}
                    className="hover:text-cobalt transition-colors text-left"
                    title="Renommer"
                  >
                    {t.name}
                  </button>
                )}
              </td>
              <td className="py-3.5">
                <span className={`text-xs font-mono2 uppercase ${t.model === "STANDARD" ? "text-slate2" : "text-amber"}`}>
                  {t.model === "EXPRESS" ? "Express" : t.model === "FRET_LOURD" ? "Fret Lourd" : "Standard"}
                </span>
              </td>
              <td className={`py-3.5 font-body ${t.status === "EN_ROUTE" ? "text-rail-green" : t.status === "MAINTENANCE" ? "text-rail-red" : "text-slate2"}`}>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      t.status === "EN_ROUTE" ? "bg-rail-green blink-dot" : t.status === "MAINTENANCE" ? "bg-rail-red blink-dot" : "bg-slate2"
                    }`}
                  />
                  {t.status === "EN_ROUTE" ? "En route" : t.status === "MAINTENANCE" ? "En panne" : "À quai"}
                </span>
              </td>
              <td className="py-3.5 font-mono2">
                {(t.status === "MAINTENANCE" || t.wear >= 100) ? (
                  <button
                    onClick={() => repair(t.id)}
                    className="text-xs font-mono2 text-rail-red uppercase border border-rail-red/40 px-2 py-1 hover:bg-rail-red/10 transition-colors"
                  >
                    Réparer ({Math.ceil(t.wear * repairCostPerPoint)} pi.)
                  </button>
                ) : t.line ? (
                  <span className="flex items-center gap-2">
                    {t.line.departureStation} → {t.line.arrivalStation}
                    <button
                      onClick={() => release(t.id)}
                      className="text-[11px] text-slate2 hover:text-rail-red border border-line px-1.5 py-0.5 uppercase transition-colors font-body"
                    >
                      Retirer
                    </button>
                  </span>
                ) : t.status === "IDLE" ? (
                  <AssignDropdown
                    placeholder="Affecter…"
                    options={lines.map((l) => ({ id: l.id, label: `${l.departureStation} → ${l.arrivalStation}` }))}
                    onSelect={(lineId) => assign(t.id, lineId)}
                  />
                ) : (
                  <span className="text-xs text-slate2 font-body">Occupé (fret en cours)</span>
                )}
              </td>
              <td className="py-3.5">
                <WearGauge value={t.wear} />
              </td>
              <td className="py-3.5">
                <div className="relative h-3 flex items-center">
                  <div className="w-full h-1 bg-navy-900 border border-line">
                    <div
                      className={`h-full transition-all duration-700 ease-out ${
                        t.status === "EN_ROUTE" ? "bg-rail-green" : "bg-cobalt"
                      }`}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                  {t.line && (
                    <TrainMark
                      size={11}
                      className={`absolute -translate-x-1/2 transition-all duration-700 ease-out ${
                        t.status === "EN_ROUTE" ? "text-rail-green" : "text-cobalt"
                      }`}
                      style={{ left: `${t.progress}%` } as any}
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {incidents.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[11px] font-body text-slate2 uppercase tracking-[0.14em] mb-3">Journal d'incidents</h2>
          <div className="border border-line">
            {incidents.slice(0, 5).map((inc) => (
              <div key={inc.id} className="flex justify-between px-3 py-2 border-b border-line last:border-0 text-xs">
                <span className="font-body text-slate2">{inc.message}</span>
                <span className="font-mono2 text-slate2 shrink-0 ml-3">
                  {new Date(inc.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FreightSection({
  market,
  myContracts,
  trains,
  onChange,
}: {
  market: Contract[];
  myContracts: Contract[];
  trains: Train[];
  onChange: () => void;
}) {
  const { showToast } = useToast();
  const [insuredSelections, setInsuredSelections] = useState<Record<string, boolean>>({});

  const freeTrains = trains.filter((t) => t.status === "IDLE" && !t.line && t.wear < 100);
  const activeContracts = myContracts.filter((c) => c.status === "EN_COURS");
  const deliveredContracts = myContracts.filter((c) => c.status === "LIVREE").slice(0, 5);

  async function accept(contractId: string, trainId: string) {
    try {
      await api.post("/contracts/accept", { contractId, trainId, insured: !!insuredSelections[contractId] });
      showToast(
        insuredSelections[contractId] ? "Contrat accepté et assuré, la livraison est en route" : "Contrat accepté, la livraison est en route"
      );
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors de l'acceptation du contrat", "error");
    }
  }

  return (
    <div className="space-y-8" data-tutorial="freight-market">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-body text-slate2">
            {freeTrains.length} train{freeTrains.length !== 1 ? "s" : ""} disponible{freeTrains.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[11px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
              <th className="py-2.5 font-normal">Marchandise</th>
              <th className="py-2.5 font-normal">Trajet</th>
              <th className="py-2.5 font-normal">Durée</th>
              <th className="py-2.5 font-normal">Récompense</th>
              <th className="py-2.5 font-normal w-24">Expire</th>
              <th className="py-2.5 font-normal w-40"></th>
            </tr>
          </thead>
          <tbody>
            {market.length === 0 && (
              <tr><td colSpan={6} className="py-8">
                <div className="flex flex-col items-center gap-2 text-slate2">
                  <CargoMark size={18} className="opacity-40" />
                  <span className="text-sm font-body">Le marché se réapprovisionne…</span>
                </div>
              </td></tr>
            )}
            {market.map((c) => (
              <tr key={c.id} className={`border-b border-line last:border-0 hover:bg-navy-900/40 transition-colors ${c.risky ? "bg-rail-red/5" : ""}`}>
                <td className="py-3.5 font-body">
                  <span className="flex items-center gap-1.5">
                    {c.risky && (
                      <span title="Marchandise fragile : risque de dommage en cours de route">
                        <FragileMark size={13} className="text-rail-red shrink-0" />
                      </span>
                    )}
                    {c.cargoType}
                  </span>
                </td>
                <td className="py-3.5 text-slate2 font-mono2">{c.originStation} → {c.destinationStation}</td>
                <td className="py-3.5 text-slate2 font-mono2">{c.durationMinutes} min</td>
                <td className={`py-3.5 font-mono2 ${c.risky ? "text-rail-red" : "text-amber"}`}>+{c.reward} pi.</td>
                <td className="py-3.5 font-mono2">
                  <ExpiryCountdown expiresAt={c.expiresAt} />
                </td>
                <td className="py-3.5">
                  {freeTrains.length === 0 ? (
                    <span className="text-xs font-mono2 text-slate2 uppercase">Aucun train libre</span>
                  ) : (
                    <div className="flex flex-col gap-1.5 items-start">
                      {c.risky && (
                        <label className="flex items-center gap-1.5 text-[11px] font-mono2 text-slate2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!insuredSelections[c.id]}
                            onChange={(e) => setInsuredSelections((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                            className="accent-cobalt"
                          />
                          Assurer (+{Math.round(c.reward * 0.15)} pi.)
                        </label>
                      )}
                      <AssignDropdown
                        placeholder="Accepter"
                        triggerClassName="text-cobalt border-cobalt/40 hover:bg-cobalt/10"
                        options={freeTrains.map((t) => ({ id: t.id, label: t.name }))}
                        onSelect={(trainId) => accept(c.id, trainId)}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate2 font-body mt-2 flex items-center gap-1.5">
        <FragileMark size={11} className="text-rail-red" /> Marchandise fragile : récompense plus élevée mais risque de dommage à la livraison (usure accrue, gain réduit).
      </p>
      </div>

      <div>
        <h2 className="text-[11px] font-body text-slate2 uppercase tracking-[0.14em] mb-3">Livraisons en cours</h2>
        {activeContracts.length === 0 ? (
          <p className="py-6 text-center text-slate2 font-body text-sm border border-line">Aucune livraison en cours.</p>
        ) : (
          <div className="space-y-2">
            {activeContracts.map((c) => (
              <div key={c.id} className="border border-line p-3.5">
                <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap">
                  <span className="font-body text-sm">
                    {c.cargoType}
                    <span className="block md:inline md:ml-1.5 font-mono2 text-slate2 text-xs">{c.originStation} → {c.destinationStation}</span>
                    {c.insured && (
                      <span className="ml-1.5 text-[10px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-1.5 py-0.5">Assuré</span>
                    )}
                  </span>
                  <span className="text-xs text-slate2 font-body shrink-0">{c.train?.name}</span>
                </div>
                <div className="relative h-3 flex items-center">
                  <div className="w-full h-1 bg-navy-900 border border-line">
                    <div className="h-full bg-rail-green transition-all duration-700 ease-out" style={{ width: `${c.train?.progress ?? 0}%` }} />
                  </div>
                  <CargoMark size={11} className="absolute -translate-x-1/2 text-rail-green transition-all duration-700 ease-out" style={{ left: `${c.train?.progress ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deliveredContracts.length > 0 && (
        <div>
          <h2 className="text-[11px] font-body text-slate2 uppercase tracking-[0.14em] mb-3">Dernières livraisons</h2>
          <div className="space-y-1">
            {deliveredContracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-line last:border-0 text-slate2 flex-wrap">
                <span className="font-body text-sm">{c.cargoType} — <span className="font-mono2 text-xs">{c.originStation} → {c.destinationStation}</span></span>
                <span className="text-rail-green font-mono2 text-sm shrink-0">+{c.reward} pi.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ClientMission {
  id: string;
  cargoType: string;
  target: number;
  progress: number;
  reward: number;
  repReward: number;
  status: "PROPOSEE" | "ACCEPTEE" | "REUSSIE" | "ECHOUEE";
  offerUntil: string;
  dueAt: string | null;
  ref: string;
}

interface ClientCard {
  id: string;
  name: string;
  sector: string;
  city: string;
  cargoTypes: string[];
  color: string;
  colorPaper: string;
  locked: boolean;
  lockReason: string | null;
  reputation: number;
  reputationMax: number;
  levelName: string;
  bonus: number;
  nextLevelAt: number | null;
  nextLevelName: string | null;
  missions: ClientMission[];
}

/* « de acier » : les marchandises commençant par une voyelle demandent l'élision. */
function ofCargo(cargo: string) {
  const low = cargo.toLowerCase();
  return /^[aeiouyéèêàâîôûœ]/.test(low) ? `d'${low}` : `de ${low}`;
}

/* Compte à rebours lisible : au-delà de la journée, les minutes ne servent à rien. */
function untilLabel(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600_000);
  if (h >= 1) return `${h} h`;
  return `${Math.max(1, Math.round(ms / 60_000))} min`;
}

function MissionsSection({ onChange }: { onChange: () => void }) {
  const [clients, setClients] = useState<ClientCard[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/clients/mine");
      setClients(data.clients);
    } catch {
      setClients([]);
    }
  }

  useEffect(() => {
    load();
    // les échéances tournent en heures : inutile de rafraîchir plus souvent
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  async function answer(missionId: string, accept: boolean) {
    setBusy(missionId);
    try {
      await api.post(`/missions/${missionId}/${accept ? "accept" : "decline"}`);
      showToast(accept ? "Ordre accepté — le compte à rebours démarre" : "Ordre refusé");
      await load();
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Une erreur est survenue", "error");
    } finally {
      setBusy(null);
    }
  }

  if (clients === null) {
    return <p className="text-sm text-slate2 font-body">Relevé des ordres en cours…</p>;
  }

  return (
    <div>
      <p className="text-sm text-slate2 font-body max-w-[62ch] mb-5">
        Honorez leurs ordres pour gagner leur confiance : un client fidélisé paie mieux{" "}
        <em className="not-italic text-offwhite">toutes</em> ses cargaisons, pas seulement celles des missions.
      </p>

      {clients.map((c) => (
        <ClientCardView key={c.id} c={c} busy={busy} onAnswer={answer} />
      ))}
    </div>
  );
}

function ClientCardView({
  c,
  busy,
  onAnswer,
}: {
  c: ClientCard;
  busy: string | null;
  onAnswer: (id: string, accept: boolean) => void;
}) {
  const orders = c.missions ?? [];
  const pct = Math.min(100, Math.round((c.reputation / c.reputationMax) * 100));

  return (
    <section
      className={`client-accent relative border border-line bg-navy-900/40 mb-5 ${c.locked ? "opacity-60" : ""}`}
      style={{ "--cd": c.color, "--cp": c.colorPaper } as React.CSSProperties}
    >
      {/* filet de couleur : identifie le client d'un coup d'œil */}
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "var(--c)" }} />

      <div className="flex items-start gap-4 flex-wrap p-4 pl-6">
        <div className="min-w-[200px]">
          <div className="font-display text-lg leading-tight">{c.name}</div>
          <div className="text-[10px] font-mono2 uppercase tracking-[0.2em] text-slate2 mt-1">
            {c.sector} — {c.city}
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            {c.cargoTypes.map((t) => (
              <span key={t} className="text-[11px] font-body border border-line px-1.5 py-0.5 text-slate2">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="sm:ml-auto sm:text-right w-full sm:w-auto sm:min-w-[200px]">
          <div className="text-[11px] font-mono2 uppercase tracking-[0.16em]" style={{ color: "var(--c)" }}>
            {c.locked ? "Hors d'atteinte" : c.levelName}
          </div>
          <div className="font-display text-xl mt-0.5" style={{ color: "var(--c)" }}>
            {c.bonus > 0 ? `+${c.bonus} %` : "—"}
          </div>
          {/* la jauge porte des crans aux paliers : voir où l'on va, pas seulement où l'on est */}
          <div className="relative h-1 bg-navy-950 border border-line mt-2">
            <span className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: `${pct}%`, background: "var(--c)" }} />
            <span className="absolute -top-1 -bottom-1 w-px bg-slate2/70" style={{ left: "30%" }} />
            <span className="absolute -top-1 -bottom-1 w-px bg-slate2/70" style={{ left: "60%" }} />
          </div>
          <div className="text-[10px] font-mono2 text-slate2 mt-1.5">
            {c.locked
              ? "Verrouillé"
              : c.nextLevelAt
              ? `${c.reputation} / ${c.reputationMax} — ${c.nextLevelName?.toLowerCase()} à ${c.nextLevelAt}`
              : `${c.reputation} / ${c.reputationMax} — palier maximal`}
          </div>
        </div>
      </div>

      {c.locked && <p className="text-sm text-slate2 font-body px-4 pl-6 pb-4">{c.lockReason}</p>}

      {!c.locked && orders.length === 0 && (
        <p className="text-sm text-slate2 font-body px-4 pl-6 pb-4">
          Aucun ordre en ce moment — ce chargeur reviendra vers vous sous peu.
        </p>
      )}

      {!c.locked && orders.map((m) => {
        const accepted = m.status === "ACCEPTEE";
        const failed = m.status === "ECHOUEE";
        const due = accepted && m.dueAt ? untilLabel(m.dueAt) : null;
        const offer = m.status === "PROPOSEE" ? untilLabel(m.offerUntil) : null;
        return (
        <div key={m.id} className="relative border border-line bg-navy-950/60 mx-4 mb-4 ml-6 overflow-hidden">
          {/* liseré hachuré : vocabulaire du bordereau, pas de la carte d'application */}
          <span
            className="absolute inset-x-0 top-0 h-[3px] opacity-50"
            style={{ background: "repeating-linear-gradient(45deg, var(--c) 0 6px, transparent 6px 12px)" }}
          />

          <div className="flex items-baseline gap-3 flex-wrap px-4 pt-4">
            <span className="text-[10px] font-mono2 tracking-[0.14em] text-slate2">Ordre nº {m.ref}</span>
            <span
              className={`ml-auto text-[11px] font-mono2 tracking-[0.1em] ${
                failed ? "text-rail-red" : "text-amber"
              }`}
            >
              {failed
                ? "Échéance dépassée"
                : accepted
                ? due
                  ? `Échéance dans ${due}`
                  : "Échéance imminente"
                : offer
                ? `À accepter sous ${offer}`
                : "Offre expirée"}
            </span>
          </div>

          <p className="font-display text-base leading-snug px-4 pt-2 max-w-[52ch]">
            Acheminer {m.target} cargaison{m.target > 1 ? "s" : ""} {ofCargo(m.cargoType)}.
          </p>

          <div className={`flex items-center gap-4 flex-wrap px-4 py-4 ${failed || accepted ? "pr-[150px]" : ""}`}>
            <div className="flex-1 min-w-[180px] max-w-[320px]">
              <div className="flex justify-between text-[10px] font-mono2 uppercase tracking-[0.12em] text-slate2 mb-1.5">
                <span>Livraisons</span>
                <span>
                  {m.progress} / {m.target}
                </span>
              </div>
              <div className="flex gap-0.5 h-1.5 bg-navy-950 border border-line p-px">
                {Array.from({ length: m.target }).map((_, i) => (
                  <span
                    key={i}
                    className="flex-1"
                    style={{ background: i < m.progress ? "var(--c)" : "rgb(var(--c-line))" }}
                  />
                ))}
              </div>
            </div>

            {failed ? (
              <span className="text-[11px] font-mono2 text-slate2">Confiance retirée par le client</span>
            ) : (
              <span className="text-[13px] font-mono2 text-amber whitespace-nowrap">
                +{m.reward} pi. <span className="text-slate2">· +{m.repReward} réputation</span>
              </span>
            )}

            {m.status === "PROPOSEE" && offer && (
              <>
                <button
                  onClick={() => onAnswer(m.id, true)}
                  disabled={busy === m.id}
                  className="bg-cobalt text-onaccent text-[11px] font-mono2 uppercase tracking-[0.16em] px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  Accepter l'ordre
                </button>
                <button
                  onClick={() => onAnswer(m.id, false)}
                  disabled={busy === m.id}
                  className="text-[11px] font-mono2 uppercase tracking-[0.16em] px-4 py-2 border border-line text-slate2 hover:text-offwhite transition-colors disabled:opacity-50"
                >
                  Refuser
                </button>
              </>
            )}
          </div>

          {/* tampon : posé de travers, jamais droit */}
          {(accepted || failed) && (
            <span
              className={`absolute right-4 top-1/2 -translate-y-1/2 rotate-[-11deg] border-2 px-3 py-1 text-[13px] font-mono2 font-bold uppercase tracking-[0.18em] opacity-85 pointer-events-none ${
                failed ? "border-rail-red text-rail-red" : "border-rail-green text-rail-green"
              }`}
            >
              {failed ? "Non honoré" : "Accepté"}
            </span>
          )}
        </div>
        );
      })}
    </section>
  );
}

function ThemePanel({ current, onChange }: { current: ThemeId; onChange: () => void }) {
  const [theme, setTheme] = useState<ThemeId>(current);
  const { showToast } = useToast();

  async function pick(next: ThemeId) {
    if (next === theme) return;
    // on applique tout de suite : attendre le serveur rendrait la bascule molle
    applyTheme(next);
    setTheme(next);
    try {
      await api.patch("/company", { theme: next });
      onChange();
    } catch {
      showToast("Thème appliqué ici, mais pas enregistré sur le compte", "error");
    }
  }

  return (
    <div className="border-t border-line pt-6">
      <h2 className="font-display text-xl mb-2">Apparence</h2>
      <p className="text-sm text-slate2 font-body mb-4">
        Deux habillages de la même interface. Le choix est enregistré sur votre compte et vous suit d'un appareil à
        l'autre.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {THEMES.map((t) => {
          const on = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`text-left border p-4 transition-colors ${
                on ? "border-cobalt bg-cobalt/10" : "border-line hover:border-slate2"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {/* pastilles : les couleurs réelles du thème, pas une étiquette */}
                <span className="flex shrink-0">
                  {(t.id === "sombre"
                    ? ["#0b0f19", "#38bdf8", "#f59e0b"]
                    : ["#e9e4d7", "#1f5c4d", "#a06a17"]
                  ).map((col) => (
                    <span
                      key={col}
                      className="w-3.5 h-3.5 border border-line -ml-0.5 first:ml-0"
                      style={{ background: col }}
                    />
                  ))}
                </span>
                <span className={`font-display text-base ${on ? "text-cobalt" : ""}`}>{t.label}</span>
                {on && (
                  <span className="ml-auto text-[10px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-1.5">
                    Actif
                  </span>
                )}
              </div>
              <span className="text-[11px] font-body text-slate2">{t.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function referralLink(code: string) {
  return `${window.location.origin}/?ref=${code}`;
}

/* Le message tout prêt : le frein au parrainage n'est pas la motivation,
   c'est d'avoir à écrire soi-même le message. */
function referralPitch(code: string) {
  return [
    "Je gère une compagnie ferroviaire sur Réseau — on trace des lignes, on prend des contrats de fret, et les trains roulent même hors connexion.",
    "",
    `Prends mon code ${code} à l'inscription, tu démarres avec 100 pi. de bienvenue :`,
    referralLink(code),
  ].join("\n");
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(text: string, tag: string) {
    navigator.clipboard.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(null), 2000);
  }
  return { copied, copy };
}

/* Bandeau compact posé sur la flotte : le parrainage n'existait que dans les
   paramètres, là où personne ne va. */
function ReferralBanner({ referral }: { referral: ReferralInfo }) {
  const { copied, copy } = useCopy();
  const next = referral.nextMilestone;
  const pct = next ? Math.min(100, Math.round((referral.qualified / next.count) * 100)) : 100;

  return (
    <div className="border border-line bg-navy-900/40 p-4 mb-6">
      <div className="flex items-baseline gap-3 flex-wrap mb-3">
        <h2 className="font-display text-lg">Agrandissez le réseau</h2>
        <span className="text-[11px] font-body text-slate2">
          100 pi. pour votre filleul, 150 pi. pour vous dès qu'il roule.
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono2 text-lg text-amber tracking-[0.2em] border border-amber/30 px-3 py-1.5">
          {referral.code}
        </span>
        <button
          onClick={() => copy(referralPitch(referral.code), "msg")}
          className="text-xs font-mono2 uppercase text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 transition-colors"
        >
          {copied === "msg" ? "Message copié !" : "Copier un message tout prêt"}
        </button>
        <button
          onClick={() => copy(referralLink(referral.code), "lnk")}
          className="text-xs font-mono2 uppercase text-slate2 border border-line px-3 py-1.5 hover:text-offwhite transition-colors"
        >
          {copied === "lnk" ? "Copié !" : "Lien seul"}
        </button>
      </div>

      {next && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[11px] font-body mb-1.5">
            <span className="text-slate2">
              Prochain palier — <span className="text-offwhite">{next.label}</span>
            </span>
            <span className="font-mono2 text-slate2">
              {referral.qualified} / {next.count}
            </span>
          </div>
          <div className="h-1 bg-navy-950 border border-line">
            <div className="h-full bg-cobalt transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-slate2 font-body mt-1.5">
            Comptent les filleuls ayant atteint le grade « Gestionnaire confirmé ».
          </p>
        </div>
      )}
    </div>
  );
}

function ReferralPanel({ referral }: { referral: ReferralInfo }) {
  const { copied, copy } = useCopy();

  return (
    <div className="border-t border-line pt-6">
      <h2 className="font-display text-xl mb-2">Parrainage</h2>
      <p className="text-sm text-slate2 font-body mb-4">
        Invitez des amis avec votre code : ils reçoivent 100 pi. de bienvenue, et vous recevez 150 pi. dès qu'ils
        ont vraiment commencé à jouer (au moins un train et une ligne créés). Les paliers, eux, ne comptent que les
        filleuls ayant atteint le grade « Gestionnaire confirmé ».
      </p>

      <div className="flex items-center gap-3 border border-line p-4 mb-4 flex-wrap">
        <span className="font-mono2 text-lg text-amber tracking-[0.2em]">{referral.code}</span>
        <button
          onClick={() => copy(referralPitch(referral.code), "msg")}
          className="ml-auto text-xs font-mono2 uppercase text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 transition-colors"
        >
          {copied === "msg" ? "Message copié !" : "Copier un message"}
        </button>
        <button
          onClick={() => copy(referralLink(referral.code), "lnk")}
          className="text-xs font-mono2 uppercase text-slate2 border border-line px-3 py-1.5 hover:text-offwhite transition-colors"
        >
          {copied === "lnk" ? "Copié !" : "Copier le lien"}
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line border border-line mb-4">
        <div className="px-3 py-3 text-center">
          <div className="font-mono2 text-lg text-offwhite">{referral.totalReferred}</div>
          <div className="text-[10px] text-slate2 font-body uppercase tracking-wide mt-1">Amis invités</div>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="font-mono2 text-lg text-rail-green">{referral.rewardsGranted}</div>
          <div className="text-[10px] text-slate2 font-body uppercase tracking-wide mt-1">Primes reçues</div>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="font-mono2 text-lg text-amber">{referral.qualified}</div>
          <div className="text-[10px] text-slate2 font-body uppercase tracking-wide mt-1">Comptent aux paliers</div>
        </div>
      </div>

      <div className="border border-line divide-y divide-line mb-4">
        {referral.milestones.map((m) => (
          <div key={m.count} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`font-mono2 text-sm w-8 shrink-0 ${m.unlocked ? "text-rail-green" : "text-slate2"}`}
            >
              {m.unlocked ? "✓" : m.count}
            </span>
            <span className={`text-sm font-body ${m.unlocked ? "text-offwhite" : "text-slate2"}`}>
              {m.label}
            </span>
            {!m.unlocked && (
              <span className="ml-auto text-[11px] font-mono2 text-slate2 shrink-0">
                {Math.max(0, m.count - referral.qualified)} restant
                {Math.max(0, m.count - referral.qualified) > 1 ? "s" : ""}
              </span>
            )}
          </div>
        ))}
      </div>

      {referral.title && (
        <p className="text-xs font-body text-amber mb-2">
          Titre obtenu : « {referral.title} » — il s'affiche à côté de votre compagnie au classement.
        </p>
      )}

      {referral.referrals.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-slate2 font-body uppercase tracking-[0.14em] mb-2">Vos filleuls</div>
          <div className="flex flex-wrap gap-2">
            {referral.referrals.map((r, i) => (
              <span
                key={`${r.name}-${i}`}
                className={`text-[11px] font-body border px-2 py-1 ${
                  r.rewarded ? "border-rail-green/40 text-rail-green" : "border-line text-slate2"
                }`}
              >
                {r.name}
                {!r.rewarded && " — pas encore parti"}
              </span>
            ))}
          </div>
        </div>
      )}

      {referral.wasReferred && (
        <p className="text-xs text-slate2 font-body">Vous avez vous-même rejoint le réseau via un code de parrainage.</p>
      )}
    </div>
  );
}

function LeaderboardSection() {
  const [board, setBoard] = useState("valeur");
  const [data, setData] = useState<LeaderResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/leaderboard?board=${board}`)
      .then((r) => {
        if (alive) setData(r.data);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [board]);

  const fmt = (v: number) => {
    if (!data) return String(v);
    if (data.unit === "%") return `${v} %`;
    if (data.unit === "pi.") return `${v.toLocaleString("fr-FR")} pi.`;
    return String(v);
  };

  const tabs = data?.boards ?? [
    { id: "valeur", label: "Valeur" },
    { id: "livraisons", label: "Fret de la semaine" },
    { id: "ponctualite", label: "Ponctualité" },
    { id: "parrains", label: "Parrains" },
  ];

  const me = data?.me ?? null;

  return (
    <div>
      {/* Onglets : une seule échelle ne récompensait que la trésorerie */}
      <div className="flex gap-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
        {tabs.map((b) => (
          <button
            key={b.id}
            onClick={() => setBoard(b.id)}
            className={`shrink-0 text-[11px] font-mono2 uppercase tracking-[0.12em] px-3 py-1.5 border transition-colors ${
              board === b.id
                ? "border-cobalt text-cobalt bg-cobalt/10"
                : "border-line text-slate2 hover:text-offwhite"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {data?.note && (
        <p className="text-[11px] font-body text-slate2 mt-2.5">{data.note}</p>
      )}

      {/* Bandeau de position : visible même hors du top */}
      {me && (
        <div className="mt-3 border border-line bg-navy-900/40 px-4 py-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {me.eligible ? (
            <>
              <span className="font-display text-xl text-cobalt">#{me.rank}</span>
              <span className="text-xs font-body text-slate2">
                sur {data?.total ?? 0} compagnies classées
              </span>
              <span className="text-xs font-mono2 text-amber ml-auto">{fmt(me.metric)}</span>
              {me.rank > 1 && me.aheadName && (
                <span className="w-full text-[11px] font-body text-slate2">
                  {me.gap > 0 ? (
                    <>
                      Encore <span className="text-offwhite font-mono2">{fmt(me.gap)}</span> pour
                      dépasser {me.aheadName}.
                    </>
                  ) : (
                    <>À égalité avec {me.aheadName} — la valeur du parc vous départage.</>
                  )}
                </span>
              )}
              {me.rank === 1 && (
                <span className="w-full text-[11px] font-body text-slate2">
                  Vous êtes en tête de ce classement.
                </span>
              )}
            </>
          ) : (
            <span className="text-xs font-body text-slate2">
              Vous n'apparaissez pas encore dans ce classement. {data?.missing}
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mt-3">
        <table className="w-full text-sm min-w-[620px]">
          <thead>
            <tr className="text-left text-[11px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
              <th className="py-2.5 font-normal w-10">Rang</th>
              <th className="py-2.5 font-normal">Compagnie</th>
              <th className="py-2.5 font-normal">Grade</th>
              <th className="py-2.5 font-normal text-center">Rames</th>
              <th className="py-2.5 font-normal text-center">Lignes</th>
              <th className="py-2.5 font-normal text-right">{data?.label ?? "Valeur"}</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate2 font-body">
                  Relevé en cours…
                </td>
              </tr>
            )}
            {data && data.entries.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate2 font-body">
                  Aucune compagnie ne remplit encore les conditions de ce classement.
                </td>
              </tr>
            )}
            {data?.entries.map((c) => (
              <LeaderRowView key={c.id} c={c} fmt={fmt} />
            ))}

            {/* Voisinage : deux concurrents devant, vous, un poursuivant */}
            {data && data.around.length > 0 && (
              <>
                <tr>
                  <td colSpan={6} className="py-2 text-center text-slate2 font-mono2 text-[11px] tracking-[0.3em]">
                    · · ·
                  </td>
                </tr>
                {data.around.map((c) => (
                  <LeaderRowView key={`a-${c.id}`} c={c} fmt={fmt} />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaderRowView({ c, fmt }: { c: LeaderEntry; fmt: (v: number) => string }) {
  return (
    <tr
      className={`border-b border-line last:border-0 transition-colors ${
        c.isMe ? "bg-cobalt/10" : "hover:bg-navy-900/40"
      }`}
    >
      <td className="py-3.5 font-mono2 text-slate2">
        {c.rank === 1 ? <TrophyMark size={15} className="text-amber claim-ready-glow" /> : `#${c.rank}`}
      </td>
      <td className="py-3.5 font-body">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 shrink-0" style={{ background: c.liveryColor }} />
          {c.name}
          {c.title && (
            <span className="text-[10px] text-amber font-mono2 uppercase border border-amber/40 px-1.5">
              {c.title}
            </span>
          )}
          {c.isMe && (
            <span className="text-[10px] text-cobalt font-mono2 uppercase border border-cobalt/40 px-1.5">
              Vous
            </span>
          )}
        </span>
      </td>
      <td className="py-3.5 font-body text-[12px] text-slate2">{c.grade}</td>
      <td className="py-3.5 text-center font-mono2 text-slate2">{c.trains}</td>
      <td className="py-3.5 text-center font-mono2 text-slate2">{c.lines}</td>
      <td className="py-3.5 text-right font-mono2 text-amber">{fmt(c.metric)}</td>
    </tr>
  );
}

const LIVERY_COLORS = ["#c99a3e", "#4f7fa3", "#5c8a68", "#a8483a", "#8a6ba3", "#c97a3e"];

/* Palette réservée aux abonnés. Purement cosmétique : c'est la part de Premium
   qui se voit au classement sans donner le moindre avantage de jeu. */
const LIVERY_PREMIUM = ["#0f766e", "#b91c1c", "#1e3a8a", "#7c2d12", "#4c1d95", "#065f46", "#9d174d", "#334155"];

function EditCompanyModal({
  company,
  onClose,
  onChange,
}: {
  company: Company;
  onClose: () => void;
  onChange: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [liveryColor, setLiveryColor] = useState(company.liveryColor);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.patch("/company", { name: name.trim(), liveryColor });
      showToast("Compagnie mise à jour");
      onChange();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
      <div className="w-full max-w-sm bg-navy-900 border border-line border-t-[3px] tutorial-step-enter" style={{ borderTopColor: liveryColor }}>
        <div className="p-6 space-y-4">
          <h2 className="font-display text-2xl">Modifier la compagnie</h2>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate2 mb-1.5 font-body">Nom</label>
            <input
              className="w-full bg-transparent border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-slate2 mb-2 font-body">Couleur de livrée</label>
            <div className="flex gap-2 flex-wrap">
              {LIVERY_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setLiveryColor(c)}
                  className={`w-8 h-8 border-2 transition-transform active:scale-95 ${
                    liveryColor === c ? "border-offwhite" : "border-transparent"
                  }`}
                  style={{ background: c }}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>

            {/* Palette réservée : visible pour tous, sélectionnable par les abonnés.
                La montrer grisée vaut mieux que la cacher — un avantage qu'on
                ignore ne vend rien. */}
            <div className="mt-3">
              <div className="text-[10px] font-mono2 uppercase tracking-[0.16em] text-slate2 mb-2">
                Livrées Premium {!company.isPremium && "— abonnement requis"}
              </div>
              <div className="flex gap-2 flex-wrap">
                {LIVERY_PREMIUM.map((c) => (
                  <button
                    key={c}
                    disabled={!company.isPremium}
                    onClick={() => setLiveryColor(c)}
                    className={`w-8 h-8 border-2 transition-transform active:scale-95 disabled:cursor-not-allowed ${
                      liveryColor === c ? "border-offwhite" : "border-transparent"
                    } ${!company.isPremium ? "opacity-35" : ""}`}
                    style={{ background: c }}
                    aria-label={`Couleur ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-line">
          <button onClick={onClose} className="text-xs text-slate2 hover:text-offwhite font-body uppercase tracking-wide">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="bg-cobalt text-onaccent text-xs font-semibold uppercase tracking-wide px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const CATALOG = [
  {
    id: "STANDARD",
    name: "Rame Standard",
    spec: "Matériel polyvalent, service voyageurs ou fret",
    speedLevel: 2,
    capacityLevel: 2,
    price: 200,
    minGradeId: 0,
  },
  {
    id: "EXPRESS",
    name: "Rame Express",
    spec: "Trajets voyageurs 30% plus rapides sur les lignes",
    speedLevel: 3,
    capacityLevel: 1,
    price: 450,
    minGradeId: 1,
  },
  {
    id: "FRET_LOURD",
    name: "Rame Fret Lourd",
    spec: "+25% de récompense sur chaque livraison de fret",
    speedLevel: 1,
    capacityLevel: 3,
    price: 450,
    minGradeId: 2,
  },
];

function StatBars({ level, max = 3, active }: { level: number; max?: number; active: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-5 statbar-fill ${
            i < level ? (active ? "bg-cobalt" : "bg-slate2") : "bg-navy-950 border border-line"
          }`}
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}

const GRADE_NAMES = ["Apprenti exploitant", "Gestionnaire confirmé", "Chef de réseau", "Baron du rail", "Magnat"];

function TrainCatalogModal({
  buying,
  gradeId,
  onBuy,
  onClose,
}: {
  buying: boolean;
  gradeId: number;
  onBuy: (model: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
      <div className="w-full max-w-3xl bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter">
        <div className="px-6 py-5 border-b border-line">
          <h2 className="font-display text-2xl">Catalogue du matériel roulant</h2>
          <p className="text-sm text-slate2 font-body mt-1">
            Les modèles se débloquent en montant en grade — plus d'abonnement requis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
          {CATALOG.map((model) => {
            const locked = (model.minGradeId ?? 0) > gradeId;
            return (
              <div key={model.id} className={`relative p-5 flex flex-col ${locked ? "opacity-45" : ""}`}>
                {locked && (
                  <span className="absolute top-4 right-4 text-[10px] font-mono2 uppercase text-slate2 border border-line px-1.5 py-0.5">
                    {GRADE_NAMES[model.minGradeId ?? 0]}
                  </span>
                )}

                <TrainMark size={26} className={locked ? "text-slate2 mb-3" : "text-cobalt mb-3"} />

                <div className="font-display text-lg leading-snug mb-1 pr-16">{model.name}</div>
                <p className="text-xs text-slate2 font-body mb-4 flex-1">{model.spec}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate2 font-mono2 uppercase tracking-wide">Vitesse</span>
                    <StatBars level={model.speedLevel} active={!locked} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate2 font-mono2 uppercase tracking-wide">Capacité</span>
                    <StatBars level={model.capacityLevel} active={!locked} />
                  </div>
                </div>

                {!locked ? (
                  <>
                    <div className="inline-flex self-start items-center gap-1 bg-amber/15 border border-amber/40 text-amber text-xs font-mono2 px-2 py-1 mb-3">
                      {model.price} pi.
                    </div>
                    <button
                      data-tutorial={model.id === "STANDARD" ? "btn-commander" : undefined}
                      onClick={() => onBuy(model.id)}
                      disabled={buying}
                      className="w-full bg-cobalt text-onaccent text-xs font-semibold uppercase tracking-wide py-2.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-60"
                    >
                      {buying ? "Achat…" : "Commander"}
                    </button>
                  </>
                ) : (
                  <button disabled className="w-full border border-line text-slate2 text-xs font-mono2 uppercase py-2.5 cursor-not-allowed">
                    Grade insuffisant
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-line">
          <button onClick={onClose} className="text-xs text-slate2 hover:text-offwhite font-body uppercase tracking-wide">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  ACHAT_TRAIN: "Achat de matériel",
  REPARATION: "Réparation",
  FRET: "Livraison de fret",
  FONDATION: "Fondation",
  EXPANSION_FLOTTE: "Agrandissement du dépôt",
  DEFI_QUOTIDIEN: "Défi quotidien",
  REVENU_LIGNE: "Recette voyageurs",
  PERSONNEL: "Personnel",
  PARRAINAGE: "Parrainage",
  ENTRETIEN: "Entretien du réseau",
  PREMIUM: "Statut Premium",
  MISSION: "Ordre de mission",
  PUBLICITE: "Publicité",
  ACHAT_FRET: "Achat de marchandise",
  VENTE_FRET: "Revente de marchandise",
  GARDE: "Frais de garde",
  CHANTIER: "Chantier",
};

function BalanceChart({ transactions, currentBalance }: { transactions: Transaction[]; currentBalance: number }) {
  if (transactions.length === 0) return null;

  // les transactions arrivent triées du plus récent au plus ancien : on les remet en ordre chronologique
  const chronological = [...transactions].reverse();
  const totalDelta = chronological.reduce((sum, tx) => sum + tx.amount, 0);
  const startBalance = currentBalance - totalDelta;

  let running = startBalance;
  const points = [{ label: "Début", value: running, date: null as string | null }];
  for (const tx of chronological) {
    running += tx.amount;
    points.push({ label: tx.type, value: running, date: tx.createdAt });
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  const width = 600;
  const height = 140;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - ((p.value - min) / range) * (height - 20) - 10,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <div className="border border-line mb-6 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-body text-slate2 uppercase tracking-[0.14em]">Évolution de la trésorerie</span>
        <span className="text-xs font-mono2 text-amber">{currentBalance} pi.</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c99a3e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c99a3e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#balanceFill)" stroke="none" />
        <path d={linePath} fill="none" stroke="#c99a3e" strokeWidth="2" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#c99a3e" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] font-mono2 text-slate2 mt-1">
        <span>Il y a {transactions.length} mouvements</span>
        <span>Aujourd'hui</span>
      </div>
    </div>
  );
}

function TransactionsSection({ transactions, currentBalance }: { transactions: Transaction[]; currentBalance: number }) {
  return (
    <div>
      <BalanceChart transactions={transactions} currentBalance={currentBalance} />

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full text-sm min-w-[560px]">
      <thead>
        <tr className="text-left text-[11px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
          <th className="py-2.5 font-normal w-32">Date</th>
          <th className="py-2.5 font-normal w-40">Type</th>
          <th className="py-2.5 font-normal">Détail</th>
          <th className="py-2.5 font-normal text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        {transactions.length === 0 && (
          <tr><td colSpan={4} className="py-8">
            <div className="flex flex-col items-center gap-2 text-slate2">
              <LedgerMark size={18} className="opacity-40" />
              <span className="text-sm font-body">Aucun mouvement pour l'instant.</span>
            </div>
          </td></tr>
        )}
        {transactions.map((tx) => (
          <tr key={tx.id} className="border-b border-line last:border-0 hover:bg-navy-900/40 transition-colors">
            <td className="py-3 font-mono2 text-slate2 text-xs">
              {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              {" "}
              {new Date(tx.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </td>
            <td className="py-3 font-body text-xs text-slate2">{TYPE_LABEL[tx.type] ?? tx.type}</td>
            <td className="py-3 font-body">{tx.description}</td>
            <td className={`py-3 text-right font-mono2 ${tx.amount > 0 ? "text-rail-green" : tx.amount < 0 ? "text-rail-red" : "text-slate2"}`}>
              {tx.amount > 0 ? "+" : ""}{tx.amount} pi.
            </td>
          </tr>
        ))}
      </tbody>
    </table>
      </div>
    </div>
  );
}

function CareerSection({ career }: { career: CareerStatus }) {
  return (
    <div>
      {/* grade actuel, en évidence */}
      <div className="border border-line border-t-2 border-t-amber p-6 mb-8">
        <div className="flex items-center gap-3 mb-1">
          <RankMark size={24} className="text-amber shrink-0" />
          <span className="font-display text-2xl">{career.currentRank.name}</span>
        </div>
        <p className="text-xs text-slate2 font-body">
          {career.nextRank
            ? `Prochain grade : ${career.nextRank.name}`
            : "Vous avez atteint le grade le plus élevé — félicitations."}
        </p>
      </div>

      {/* chemin complet, avec le grade actuel mis en avant */}
      <div className="space-y-3">
        {career.ranks.map((rank) => {
          const isCurrent = rank.id === career.currentRank.id;
          const isFuture = rank.id > career.currentRank.id;
          return (
            <div
              key={rank.id}
              className={`border p-4 ${isCurrent ? "border-amber/50 bg-amber/5" : isFuture ? "border-line opacity-70" : "border-line"}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <RankMark size={16} className={rank.achieved ? "text-amber" : "text-slate2"} />
                <span className={`font-body text-sm font-semibold ${rank.achieved ? "text-offwhite" : "text-slate2"}`}>{rank.name}</span>
                {isCurrent && (
                  <span className="text-[10px] font-mono2 uppercase text-amber border border-amber/40 px-1.5 py-0.5 ml-auto shrink-0">
                    Grade actuel
                  </span>
                )}
                {rank.achieved && !isCurrent && (
                  <span className="text-[10px] font-mono2 uppercase text-rail-green ml-auto shrink-0">Franchi</span>
                )}
              </div>
              {rank.requirements.length === 0 ? (
                <p className="text-xs text-slate2 font-body pl-[26px]">Grade de départ, aucune condition requise.</p>
              ) : (
                <ul className="space-y-1 pl-[26px]">
                  {rank.requirements.map((req, i) => (
                    <li key={i} className={`text-xs font-body flex items-center gap-2 ${req.met ? "text-slate2" : "text-offwhite"}`}>
                      <span className={req.met ? "text-rail-green" : "text-line"}>{req.met ? "✓" : "—"}</span>
                      {req.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AchievementsSection({ achievements }: { achievements: Achievement[] }) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div>
      <div className="mb-5 text-[11px] font-mono2 text-slate2 border border-line inline-block px-2 py-1">
        {unlockedCount}/{achievements.length} débloqués
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {achievements.map((a, i) => (
          <div
            key={a.id}
            className={`relative overflow-hidden flex items-start gap-3 p-4 border achievement-card-enter ${
              a.unlocked ? "border-amber/40 bg-amber/5" : "border-line opacity-50"
            }`}
            style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
          >
            {a.unlocked && <span className="achievement-shine" aria-hidden="true" />}
            <MedalMark size={22} className={`shrink-0 mt-0.5 relative ${a.unlocked ? "text-amber" : "text-slate2"}`} />
            <div className="relative">
              <div className="font-body text-sm text-offwhite flex items-center gap-2">
                {a.name}
                {!a.unlocked && (
                  <span className="text-[10px] font-mono2 uppercase text-slate2 border border-line px-1.5 py-0.5">
                    Verrouillé
                  </span>
                )}
              </div>
              <p className="text-xs text-slate2 font-body mt-0.5">{a.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Contour de la France dans le même repère que les gares.
   Les points viennent des coordonnées réelles, projetées avec la formule que
   les gares respectent : x = 190 + (lon − 3,06) × 22,4, y = 20 + (50,63 − lat) × 42,97.
   Le tracé est ensuite lissé en Béziers (Catmull-Rom) : une côte en segments
   droits se lit comme un brouillon tracé à la règle, pas comme une carte. */
const FRANCE_OUTLINE =
  "M 162.9,5.8 C 165.8,1.7 170.0,1.5 174.5,2.8 C 179.0,4.1 185.0,8.6 189.8,13.6 C 194.6,18.6 199.1,28.9 203.4,32.5 C 207.7,36.1 211.0,31.1 215.5,35.0 C 220.0,38.9 225.5,50.7 230.3,56.1 C 235.1,61.5 240.3,64.9 244.2,67.3 C 248.1,69.7 250.3,70.2 253.6,70.7 C 256.9,71.2 260.8,68.2 263.9,70.3 C 267.0,72.4 268.9,80.8 272.4,83.2 C 275.9,85.6 280.6,83.7 285.0,84.5 C 289.4,85.3 295.6,86.8 299.1,87.9 C 302.6,89.0 305.5,89.2 305.8,91.3 C 306.1,93.4 302.3,97.5 300.7,100.8 C 299.1,104.1 297.8,106.6 296.2,111.1 C 294.6,115.6 292.0,123.0 291.2,127.9 C 290.4,132.8 291.4,136.4 291.2,140.3 C 291.0,144.2 292.0,149.1 289.9,151.5 C 287.8,153.9 281.0,152.8 278.3,154.9 C 275.6,157.0 275.9,159.9 273.8,163.9 C 271.7,167.9 268.3,174.3 265.9,179.0 C 263.5,183.7 260.5,188.6 259.2,192.3 C 257.9,196.0 258.1,198.3 258.1,201.3 C 258.1,204.3 256.4,207.8 259.0,210.4 C 261.6,213.0 271.1,214.2 273.8,216.8 C 276.5,219.5 274.3,222.4 275.1,226.3 C 275.9,230.2 278.9,235.5 278.5,240.4 C 278.1,245.3 274.3,251.6 272.9,255.9 C 271.5,260.2 269.1,262.6 270.0,266.2 C 270.9,269.8 275.6,273.1 278.3,277.4 C 281.0,281.7 284.4,287.3 286.3,292.0 C 288.2,296.7 289.3,302.1 289.9,305.8 C 290.5,309.5 291.9,311.0 290.1,314.3 C 288.4,317.6 283.6,321.0 279.4,325.5 C 275.2,330.0 269.0,338.3 264.8,341.4 C 260.6,344.5 258.2,344.8 254.3,344.4 C 250.4,344.0 245.5,341.3 241.5,339.3 C 237.5,337.3 234.4,334.2 230.1,332.4 C 225.8,330.6 220.0,328.4 215.5,328.5 C 211.0,328.6 207.5,329.4 203.2,332.8 C 198.9,336.2 191.9,343.0 189.8,348.7 C 187.8,354.4 193.7,363.6 190.9,367.2 C 188.1,370.8 179.0,370.2 173.0,370.2 C 167.0,370.2 160.5,368.9 155.1,367.2 C 149.7,365.5 145.7,362.0 140.5,359.9 C 135.3,357.8 129.7,355.6 123.7,354.3 C 117.7,353.0 110.1,353.9 104.7,352.2 C 99.3,350.5 95.1,347.6 91.2,344.4 C 87.3,341.2 82.3,337.2 81.6,332.8 C 80.8,328.4 85.3,323.9 86.7,317.8 C 88.1,311.7 89.0,303.1 90.1,296.3 C 91.2,289.5 92.4,282.7 93.5,277.0 C 94.6,271.3 96.1,266.9 96.8,261.9 C 97.5,256.9 98.1,251.2 97.9,246.9 C 97.7,242.6 95.7,240.1 95.7,236.1 C 95.7,232.1 98.1,227.2 97.9,223.2 C 97.7,219.2 96.5,215.3 94.6,212.1 C 92.7,208.9 89.5,206.7 86.7,203.9 C 83.9,201.1 80.0,198.9 77.8,195.3 C 75.6,191.7 74.4,186.7 73.3,182.4 C 72.2,178.1 72.6,173.1 71.1,169.5 C 69.6,165.9 67.7,163.1 64.3,160.9 C 60.9,158.8 55.8,159.4 50.9,156.6 C 46.0,153.8 39.5,146.7 35.2,143.8 C 30.9,141.0 28.6,141.6 25.1,139.5 C 21.6,137.4 15.3,134.5 14.4,131.3 C 13.5,128.1 19.4,123.8 19.5,120.1 C 19.6,116.4 13.0,112.6 15.1,109.4 C 17.2,106.2 26.9,102.7 31.9,100.8 C 36.9,98.9 40.8,96.9 45.3,97.8 C 49.8,98.7 54.2,105.0 58.7,106.4 C 63.2,107.8 68.7,107.0 72.2,106.4 C 75.8,105.8 77.8,105.6 80.0,102.9 C 82.2,100.2 85.6,95.4 85.6,90.0 C 85.6,84.6 80.4,75.6 80.0,70.7 C 79.6,65.8 81.2,60.8 83.4,60.8 C 85.7,60.8 90.0,68.3 93.5,70.7 C 97.0,73.1 100.6,74.1 104.7,75.0 C 108.8,75.9 114.8,77.0 118.1,76.3 C 121.4,75.6 123.5,73.6 124.8,70.7 C 126.1,67.8 123.7,62.2 125.9,59.1 C 128.2,56.0 133.8,54.9 138.3,52.2 C 142.8,49.5 149.6,46.9 152.8,42.8 C 156.0,38.7 155.6,33.9 157.3,27.7 C 159.0,21.5 160.0,9.9 162.9,5.8 Z";

// la Corse : sans elle, la silhouette ne se lit pas au premier coup d'œil
const CORSE_OUTLINE =
  "M 337.2,347.9 C 338.2,349.3 340.1,355.3 340.5,359.9 C 341.0,364.5 340.7,370.3 339.8,375.8 C 338.9,381.3 336.9,387.8 335.6,393.0 C 334.3,398.2 332.8,403.3 331.7,407.2 C 330.5,411.1 330.8,415.9 328.5,416.6 C 326.2,417.3 320.2,415.2 317.8,411.5 C 315.3,407.8 315.2,399.5 313.6,394.3 C 312.0,389.1 308.2,384.6 308.3,380.1 C 308.5,375.6 311.4,370.6 314.1,367.2 C 316.9,363.8 321.2,362.5 324.6,359.9 C 327.9,357.3 332.3,353.3 334.3,351.3 C 336.5,349.3 336.2,346.5 337.2,347.9 Z";

/* Quelques gares se touchent (Le Havre / Rouen, Metz / Nancy) : leur étiquette
   part à gauche pour ne pas se chevaucher. */
const LABEL_LEFT = new Set(["Le Havre", "Rennes", "Nantes", "Bordeaux", "Chartres", "Le Mans", "Toulouse"]);

// Positions approximatives des gares sur une carte stylisée de France (viewBox 0 0 340 380)
const STATION_COORDS: Record<string, { x: number; y: number }> = {
  "Lille": { x: 190, y: 20 },
  "Le Havre": { x: 128, y: 71 },
  "Rouen": { x: 146, y: 71 },
  "Metz": { x: 260, y: 85 },
  "Paris": { x: 174, y: 96 },
  "Nancy": { x: 260, y: 103 },
  "Strasbourg": { x: 292, y: 109 },
  "Chartres": { x: 155, y: 114 },
  "Rennes": { x: 84, y: 128 },
  "Le Mans": { x: 126, y: 133 },
  "Mulhouse": { x: 286, y: 144 },
  "Dijon": { x: 234, y: 162 },
  "Nantes": { x: 87, y: 167 },
  "Lyon": { x: 230, y: 229 },
  "Grenoble": { x: 250, y: 254 },
  "Bordeaux": { x: 108, y: 269 },
  "Toulouse": { x: 154, y: 322 },
  "Marseille": { x: 242, y: 335 },
};

const LINE_PALETTE = ["#4f7fa3", "#c99a3e", "#5c8a68", "#a8483a", "#8a6ba3", "#c97a3e"];

/* Projection inverse de STATION_COORDS : on remonte aux degrés pour calculer une
   vraie distance. Les constantes sont celles qui ont servi à placer les gares. */
function toLonLat(p: { x: number; y: number }) {
  return { lon: 3.06 + (p.x - 190) / 22.4, lat: 50.63 - (p.y - 20) / 42.97 };
}

/* Distance à vol d'oiseau, en kilomètres. Équirectangulaire : sur l'emprise de
   la France l'écart avec une vraie orthodromie est de l'ordre du kilomètre. */
function distanceKm(a: { x: number; y: number }, b: { x: number; y: number }) {
  const A = toLonLat(a), B = toLonLat(b);
  const midLat = ((A.lat + B.lat) / 2) * (Math.PI / 180);
  const dx = (B.lon - A.lon) * 111.32 * Math.cos(midLat);
  const dy = (B.lat - A.lat) * 110.57;
  return Math.round(Math.hypot(dx, dy));
}

/* Durée de trajet déduite de la distance. La recette valant 8 pi. par minute
   quelle que soit la longueur, ce calcul ne déplace pas l'équilibre : il rend
   seulement le réseau cohérent — Paris–Lille ne peut plus durer autant que
   Lille–Marseille. */
export function durationFromKm(km: number) {
  return Math.max(3, Math.min(20, Math.round(km / 55)));
}

/* Doit rester aligné sur lengthYield() dans simulation.job.ts. Un long-courrier
   rapporte plus à la minute qu'un omnibus : +0 % à 3 min, +25 % à 20 min. */
export function lengthYieldPct(durationMinutes: number) {
  const d = Math.max(3, Math.min(20, durationMinutes));
  return Math.round(25 * ((d - 3) / 17));
}

/* Recette horaire théorique d'une rame sur la ligne, réputation parfaite.
   C'est le seul chiffre qui permet de comparer deux tracés. */
function hourlyRevenue(durationMinutes: number) {
  const perTrip = durationMinutes * 8 * (1 + lengthYieldPct(durationMinutes) / 100);
  return Math.round((60 / durationMinutes) * perTrip);
}

function NetworkMap({
  lines,
  trains,
  contracts,
  onChange,
}: {
  lines: Line[];
  trains: Train[];
  contracts: Contract[];
  onChange: () => void;
}) {
  const { showToast } = useToast();
  const [drawing, setDrawing] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [lineName, setLineName] = useState("");
  const [saving, setSaving] = useState(false);

  function resetDraw() {
    setFrom(null);
    setTo(null);
    setLineName("");
  }

  function pickStation(name: string) {
    if (!drawing) return;
    if (from === name) return resetDraw();
    if (!from) {
      setFrom(name);
      setTo(null);
      return;
    }
    if (to === name) return setTo(null);
    setTo(name);
    setLineName(`${from} — ${name}`);
  }

  const draft =
    from && to && STATION_COORDS[from] && STATION_COORDS[to]
      ? (() => {
          const km = distanceKm(STATION_COORDS[from], STATION_COORDS[to]);
          return { km, minutes: durationFromKm(km) };
        })()
      : null;

  async function createFromMap() {
    if (!from || !to || !draft) return;
    setSaving(true);
    try {
      await api.post("/lines", {
        name: lineName.trim() || `${from} — ${to}`,
        departureStation: from,
        arrivalStation: to,
        durationMinutes: draft.minutes,
      });
      showToast(`Ligne ${from} — ${to} ouverte (${draft.minutes} min)`);
      resetDraw();
      setDrawing(false);
      onChange();
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible de créer la ligne", "error");
    } finally {
      setSaving(false);
    }
  }

  const activeFreight = contracts.filter((c) => c.status === "EN_COURS" && c.train);
  const usedStations = new Set([
    ...lines.flatMap((l) => [l.departureStation, l.arrivalStation]),
    ...activeFreight.flatMap((c) => [c.originStation, c.destinationStation]),
  ]);
  const activeStations = new Set([
    ...trains
      .filter((t) => t.status === "EN_ROUTE" && t.line)
      .flatMap((t) => [t.line!.departureStation, t.line!.arrivalStation]),
    ...activeFreight.flatMap((c) => [c.originStation, c.destinationStation]),
  ]);
  const enRouteCount = trains.filter((t) => t.status === "EN_ROUTE").length;

  return (
    <div className="border border-line bg-navy-950/40">
      {/* bandeau de statistiques en direct */}
      <div className="flex items-center gap-6 px-4 py-2.5 border-b border-line font-mono2 text-[11px] text-slate2 uppercase tracking-wide">
        <span className="text-cobalt">{lines.length} ligne{lines.length !== 1 ? "s" : ""}</span>
        <span className="text-rail-green">{enRouteCount} train{enRouteCount !== 1 ? "s" : ""} en circulation</span>
        <span className="text-amber">{activeFreight.length} fret{activeFreight.length !== 1 ? "s" : ""} en cours</span>
        <span>{usedStations.size} gare{usedStations.size !== 1 ? "s" : ""} desservie{usedStations.size !== 1 ? "s" : ""}</span>

        <button
          onClick={() => {
            resetDraw();
            setDrawing((d) => !d);
          }}
          className={`ml-auto shrink-0 font-mono2 text-[11px] uppercase tracking-[0.14em] border px-3 py-1 transition-colors ${
            drawing
              ? "border-cobalt text-cobalt bg-cobalt/10"
              : "border-line text-slate2 hover:text-offwhite"
          }`}
        >
          {drawing ? "Annuler le tracé" : "Tracer une ligne"}
        </button>
      </div>

      {/* Bandeau de tracé : la carte devient un outil au lieu d'un poster.
          La durée n'est plus saisie à la main, elle découle de la distance. */}
      {drawing && (
        <div className="px-4 py-3 border-b border-line bg-cobalt/5">
          {!from && (
            <p className="text-xs font-body text-slate2">
              Cliquez la gare de départ sur la carte.
            </p>
          )}
          {from && !to && (
            <p className="text-xs font-body text-slate2">
              Départ : <span className="text-offwhite">{from}</span> — cliquez maintenant la gare d'arrivée.
            </p>
          )}
          {from && to && draft && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-body text-slate2">
                <span className="text-offwhite">{from}</span> → <span className="text-offwhite">{to}</span>
              </span>
              <span className="font-mono2 text-[11px] text-slate2">
                {draft.km} km · <span className="text-amber">{draft.minutes} min</span>
                {lengthYieldPct(draft.minutes) > 0 && (
                  <> · rendement <span className="text-rail-green">+{lengthYieldPct(draft.minutes)} %</span></>
                )}
                <> · ~<span className="text-amber">{hourlyRevenue(draft.minutes)} pi./h</span></>
              </span>
              <input
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                className="flex-1 min-w-[180px] bg-navy-950 border border-line px-3 py-1.5 text-sm font-body text-offwhite focus:border-cobalt outline-none"
                placeholder="Nom de la ligne"
              />
              <button
                onClick={createFromMap}
                disabled={saving}
                className="bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-[0.14em] px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                Ouvrir la ligne
              </button>
              <button
                onClick={resetDraw}
                className="font-mono2 text-[11px] uppercase tracking-[0.14em] px-3 py-2 border border-line text-slate2 hover:text-offwhite transition-colors"
              >
                Recommencer
              </button>
            </div>
          )}
        </div>
      )}

      <div className="relative p-3 lg:flex lg:gap-5">
        <svg viewBox="8 -10 348 440" className="w-full max-w-[470px] h-auto max-h-[560px] mx-auto block">
          <defs>
            <marker id="arrow-active" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgb(var(--c-cobalt))" />
            </marker>

            {/* Halo au large : convention cartographique classique, le trait de côte
                se détache sans avoir besoin d'être épais. C'est ce qui sépare une
                carte dessinée d'un contour posé à plat. */}
            <filter id="map-halo" x="-12%" y="-12%" width="124%" height="124%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="b" />
              <feComponentTransfer in="b" result="h">
                <feFuncA type="linear" slope="0.5" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="h" />
              </feMerge>
            </filter>
          </defs>

          {/* Le territoire : il sert de fond aux tracés, et c'est lui qui fait
              des gares des lieux plutôt que des points en suspension. */}
          <g>
            {/* le halo est posé en premier : il borde les terres depuis la mer */}
            <g filter="url(#map-halo)" opacity="0.45">
              <path d={FRANCE_OUTLINE} fill="rgb(var(--c-slate2))" />
              <path d={CORSE_OUTLINE} fill="rgb(var(--c-slate2))" />
            </g>
            <path
              d={FRANCE_OUTLINE}
              fill="rgb(var(--c-navy-900))"
              stroke="rgb(var(--c-slate2))"
              strokeWidth="0.9"
              opacity="0.95"
            />
            <path
              d={CORSE_OUTLINE}
              fill="rgb(var(--c-navy-900))"
              stroke="rgb(var(--c-slate2))"
              strokeWidth="0.9"
              opacity="0.95"
            />
          </g>

          {/* voies tracées entre les gares desservies, en courbe, une couleur par ligne */}
          {lines.map((l, i) => {
            const from = STATION_COORDS[l.departureStation];
            const to = STATION_COORDS[l.arrivalStation];
            if (!from || !to) return null;
            const hasActiveTrain = trains.some((t) => t.line?.id === l.id && t.status === "EN_ROUTE");
            const color = LINE_PALETTE[i % LINE_PALETTE.length];

            // léger arc perpendiculaire au trajet, alterné selon la parité pour éviter que les
            // lignes qui se croisent ne se superposent exactement
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.hypot(dx, dy) || 1;
            const bend = (i % 2 === 0 ? 1 : -1) * Math.min(dist * 0.12, 22);
            const cx = mx - (dy / dist) * bend;
            const cy = my + (dx / dist) * bend;
            const path = `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`;

            return (
              <path
                key={l.id}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={hasActiveTrain ? 2 : 1.3}
                strokeDasharray={hasActiveTrain ? "6 5" : "3 4"}
                opacity={hasActiveTrain ? 0.95 : 0.4}
                className={hasActiveTrain ? "line-flow" : undefined}
                markerEnd={hasActiveTrain ? "url(#arrow-active)" : undefined}
              />
            );
          })}

          {/* trajets de fret actifs : ligne pointillée ambre, distincte des lignes voyageurs */}
          {activeFreight.map((c) => {
            const from = STATION_COORDS[c.originStation];
            const to = STATION_COORDS[c.destinationStation];
            if (!from || !to) return null;
            const path = `M ${from.x},${from.y} L ${to.x},${to.y}`;
            return (
              <path
                key={c.id}
                d={path}
                fill="none"
                stroke="rgb(var(--c-amber))"
                strokeWidth="1.6"
                strokeDasharray="2 5"
                strokeLinecap="round"
                opacity="0.8"
              />
            );
          })}

          {/* tracé en cours : le joueur voit la ligne avant de la payer */}
          {from && to && STATION_COORDS[from] && STATION_COORDS[to] && (
            <line
              x1={STATION_COORDS[from].x}
              y1={STATION_COORDS[from].y}
              x2={STATION_COORDS[to].x}
              y2={STATION_COORDS[to].y}
              stroke="rgb(var(--c-cobalt))"
              strokeWidth="2"
              strokeDasharray="5 4"
              opacity="0.9"
            />
          )}

          {/* gares : discrètes si non desservies, marquées si utilisées, pulsées si un train y transite actuellement */}
          {Object.entries(STATION_COORDS).map(([name, pos]) => {
            const active = usedStations.has(name);
            const pulsing = activeStations.has(name);
            const left = LABEL_LEFT.has(name);
            const picked = from === name || to === name;
            return (
              <g
                key={name}
                onClick={() => pickStation(name)}
                style={{ cursor: drawing ? "pointer" : "default" }}
              >
                {/* cible de clic généreuse : une pastille de 3,6 unités est intouchable au doigt */}
                {drawing && <circle cx={pos.x} cy={pos.y} r={11} fill="transparent" />}
                {picked && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={8}
                    fill="none"
                    stroke="rgb(var(--c-cobalt))"
                    strokeWidth="1.6"
                  />
                )}
                {pulsing && (
                  <circle cx={pos.x} cy={pos.y} r={7} fill="none" stroke="rgb(var(--c-rail-green))" strokeWidth="1" opacity="0.6" className="blink-dot" />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={active || drawing ? 3.6 : 2}
                  fill={active ? "rgb(var(--c-offwhite))" : "rgb(var(--c-slate2))"}
                  stroke={active ? "rgb(var(--c-cobalt))" : "none"}
                  strokeWidth="1.5"
                  opacity={active ? 1 : drawing ? 0.85 : 0.5}
                />
                {/* liseré de la couleur du fond : le texte reste lisible par-dessus une voie */}
                <text
                  x={pos.x + (left ? -6 : 6)}
                  y={pos.y + 3}
                  textAnchor={left ? "end" : "start"}
                  fontSize="8.5"
                  fontFamily="var(--font-mono2)"
                  fill={active ? "rgb(var(--c-offwhite))" : "rgb(var(--c-slate2))"}
                  opacity={active ? 1 : 0.7}
                  stroke="rgb(var(--c-navy-950))"
                  strokeWidth="2.4"
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {name}
                </text>
              </g>
            );
          })}

          {/* trains en circulation, orientés dans le sens de la marche, positionnés selon leur progression réelle */}
          {trains.map((t) => {
            if (!t.line || t.status !== "EN_ROUTE") return null;
            const from = STATION_COORDS[t.line.departureStation];
            const to = STATION_COORDS[t.line.arrivalStation];
            if (!from || !to) return null;
            const ratio = t.progress / 100;
            const x = from.x + (to.x - from.x) * ratio;
            const y = from.y + (to.y - from.y) * ratio;
            const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
            return (
              <g key={t.id} style={{ transition: "transform 0.7s ease-out" }} transform={`translate(${x},${y}) rotate(${angle})`}>
                <circle r="6" fill="rgb(var(--c-navy-950))" stroke="rgb(var(--c-rail-green))" strokeWidth="1.5" opacity="0.9" />
                <rect x="-4" y="-1.6" width="8" height="3.2" rx="1" fill="rgb(var(--c-rail-green))" />
                <circle cx="4.5" cy="0" r="1.1" fill="rgb(var(--c-navy-950))" />
              </g>
            );
          })}

          {/* cargaisons en transit, positionnées selon la progression réelle du train assigné */}
          {activeFreight.map((c) => {
            const from = STATION_COORDS[c.originStation];
            const to = STATION_COORDS[c.destinationStation];
            if (!from || !to) return null;
            const ratio = (c.train?.progress ?? 0) / 100;
            const x = from.x + (to.x - from.x) * ratio;
            const y = from.y + (to.y - from.y) * ratio;
            return (
              <g key={c.id} style={{ transition: "transform 0.7s ease-out" }} transform={`translate(${x},${y})`}>
                <rect x="-5" y="-5" width="10" height="10" fill="rgb(var(--c-navy-950))" stroke="rgb(var(--c-amber))" strokeWidth="1.5" />
                <rect x="-2.5" y="-2.5" width="5" height="5" fill="rgb(var(--c-amber))" />
              </g>
            );
          })}
        </svg>

        {/* Colonne de droite : la place laissée par une carte en portrait servait
            à rien. Elle porte maintenant la légende et le détail des lignes,
            avec la couleur de chaque tracé — impossible à deviner autrement. */}
        <aside className="hidden lg:block w-[230px] shrink-0 border-l border-line pl-5">
          <div className="text-[10px] font-mono2 uppercase tracking-[0.18em] text-slate2 mb-3">Légende</div>
          <div className="flex flex-col gap-2 text-[11px] font-mono2 text-slate2 uppercase tracking-wide mb-6">
            <span className="flex items-center gap-2"><span className="w-4 h-0.5 bg-cobalt shrink-0" /> Ligne active</span>
            <span className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed border-line shrink-0" /> Ligne au repos</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-offwhite border border-cobalt shrink-0" /> Gare desservie</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate2 shrink-0" /> Gare disponible</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full border border-rail-green bg-navy-950 shrink-0" /> Train en circulation</span>
            <span className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed border-amber shrink-0" /> Trajet de fret</span>
          </div>

          <div className="text-[10px] font-mono2 uppercase tracking-[0.18em] text-slate2 mb-3">Vos lignes</div>
          {lines.length === 0 ? (
            <p className="text-[11px] font-body text-slate2">Aucune ligne tracée pour l'instant.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {lines.map((l, i) => {
                const running = trains.some((t) => t.line?.id === l.id && t.status === "EN_ROUTE");
                return (
                  <li key={l.id} className="flex items-start gap-2 text-[11px] font-body">
                    <span
                      className="w-3 h-0.5 mt-1.5 shrink-0"
                      style={{ background: LINE_PALETTE[i % LINE_PALETTE.length] }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-offwhite">{l.name}</span>
                      <span className={running ? "text-rail-green" : "text-slate2"}>
                        {running ? "en circulation" : "au repos"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {/* même légende, à plat, quand la colonne ne tient pas */}
      <div className="lg:hidden flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-t border-line text-[10px] font-mono2 text-slate2 uppercase tracking-wide">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-cobalt" /> Ligne active</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t border-dashed border-line" /> Ligne au repos</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-offwhite border border-cobalt" /> Gare desservie</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate2" /> Gare disponible</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-rail-green bg-navy-950" /> Train en circulation</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t border-dashed border-amber" /> Trajet de fret</span>
      </div>

      {lines.length === 0 && (
        <p className="text-center text-sm text-slate2 font-body py-4 border-t border-line">
          Aucune ligne tracée pour l'instant — la carte se remplira au fil de vos créations.
        </p>
      )}
    </div>
  );
}

function DailyChallengeBanner({ challenge, onChange }: { challenge: DailyChallenge; onChange: () => void }) {
  const [claiming, setClaiming] = useState(false);
  const { showToast } = useToast();

  async function claim() {
    setClaiming(true);
    try {
      await api.post("/daily-challenge/claim");
      showToast(`+${challenge.reward} pièces récupérées`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 md:px-6 py-2.5 border-b border-line bg-navy-900/40 text-sm">
      <MedalMark size={16} className={challenge.claimed ? "text-slate2 shrink-0" : challenge.completed ? "text-amber shrink-0 claim-ready-glow" : "text-amber shrink-0"} />
      <span className="font-body text-offwhite flex-1 min-w-0 truncate">{challenge.label}</span>
      <span className="font-mono2 text-xs text-slate2 shrink-0">
        {challenge.progress}/{challenge.target}
      </span>
      <span className="font-mono2 text-xs text-amber shrink-0">+{challenge.reward} pi.</span>
      {challenge.claimed ? (
        <span className="text-[11px] font-mono2 uppercase text-slate2 shrink-0">Récupéré</span>
      ) : challenge.completed ? (
        <button
          onClick={claim}
          disabled={claiming}
          className="text-[11px] font-mono2 uppercase text-amber border border-amber/40 px-2 py-1 hover:bg-amber/10 transition-colors shrink-0 disabled:opacity-50 claim-ready-pulse"
        >
          {claiming ? "…" : "Récupérer"}
        </button>
      ) : (
        <span className="text-[11px] font-mono2 uppercase text-slate2 shrink-0">En cours</span>
      )}
    </div>
  );
}

const STAFF_ROLES_UI: Record<string, { label: string; salaryPerTick: number; effect: string; minGradeId: number }> = {
  MECANICIEN: {
    label: "Mécanicien",
    salaryPerTick: 3,
    effect: "Réduit de moitié l'usure accumulée par vos rames en service",
    minGradeId: 0,
  },
  CHEF_DEPOT: {
    label: "Chef de dépôt",
    salaryPerTick: 4,
    effect: "Réduit de moitié le coût des réparations",
    minGradeId: 0,
  },
  DIRECTEUR_COMMERCIAL: {
    label: "Directeur commercial",
    salaryPerTick: 6,
    effect: "Augmente de 15 % tous vos revenus (voyageurs et fret)",
    minGradeId: 2,
  },
};

function StaffSection({ staff, gradeId, onChange }: { staff: Staff[]; gradeId: number; onChange: () => void }) {
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const { showToast } = useToast();

  async function hire(role: string) {
    setBusyRole(role);
    try {
      await api.post("/staff/hire", { role });
      showToast(`${STAFF_ROLES_UI[role].label} embauché`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusyRole(null);
    }
  }

  async function fire(staffId: string, label: string) {
    try {
      await api.post("/staff/fire", { staffId });
      showToast(`${label} a quitté la compagnie`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Object.entries(STAFF_ROLES_UI).map(([role, def]) => {
        const hired = staff.find((s) => s.role === role);
        const locked = def.minGradeId > gradeId;
        return (
          <div key={role} className={`relative p-4 border ${hired ? "border-cobalt/40 bg-cobalt/5" : "border-line"} ${locked ? "opacity-60" : ""}`}>
            {def.minGradeId > 0 && (
              <span className="absolute top-3 right-3 text-[10px] font-mono2 uppercase text-amber border border-amber/40 px-1.5 py-0.5">
                {GRADE_NAMES[def.minGradeId]}
              </span>
            )}
            <div className="flex items-start gap-3 mb-3">
              <StaffMark size={22} className={hired ? "text-cobalt shrink-0 mt-0.5" : "text-slate2 shrink-0 mt-0.5"} />
              <div className="pr-20">
                <div className="font-body text-sm text-offwhite">{def.label}</div>
                <p className="text-xs text-slate2 font-body mt-0.5">{def.effect}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono2 text-amber">{def.salaryPerTick} pi. / cycle</span>
              {hired ? (
                <button
                  onClick={() => fire(hired.id, def.label)}
                  className="text-[11px] font-mono2 uppercase text-slate2 hover:text-rail-red border border-line px-2 py-1 transition-colors"
                >
                  Licencier
                </button>
              ) : locked ? (
                <button disabled className="text-[11px] font-mono2 uppercase text-slate2 border border-line px-2 py-1 cursor-not-allowed">
                  Grade insuffisant
                </button>
              ) : (
                <button
                  onClick={() => hire(role)}
                  disabled={busyRole === role}
                  className="text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2 py-1 hover:bg-cobalt/10 transition-colors disabled:opacity-50"
                >
                  {busyRole === role ? "…" : "Embaucher"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingsSection({
  company,
  referral,
  onChange,
}: {
  company: Company;
  referral: ReferralInfo | null;
  onChange: () => void;
}) {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* Le bouton d'achat n'apparaît que si le serveur a bien ses clés Stripe :
     afficher un bouton qui répond 503 serait pire que ne rien afficher. */
  const [billingOpen, setBillingOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    api
      .get("/billing/status")
      .then(({ data }) => setBillingOpen(Boolean(data?.enabled)))
      .catch(() => setBillingOpen(false));
  }, []);

  async function startCheckout() {
    setCheckingOut(true);
    try {
      const { data } = await api.post("/billing/checkout");
      if (data?.url) window.location.href = data.url;
      else showToast("Impossible d'ouvrir la page de paiement", "error");
    } catch (e: any) {
      showToast(e?.response?.data?.error ?? "Impossible d'ouvrir la page de paiement", "error");
    } finally {
      setCheckingOut(false);
    }
  }
  async function submitPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Les deux mots de passe ne correspondent pas", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/account/change-password", { currentPassword, newPassword });
      showToast("Mot de passe mis à jour");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete("/account");
      logout();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors de la suppression", "error");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-md space-y-10">
      <div>
        <h2 className="font-display text-xl mb-4 flex items-center gap-2">
          <LockMark size={18} className="text-cobalt" />
          Changer de mot de passe
        </h2>
        <form onSubmit={submitPasswordChange} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">Mot de passe actuel</label>
            <input
              type="password"
              className="w-full bg-transparent border border-line px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">Nouveau mot de passe</label>
            <input
              type="password"
              minLength={6}
              className="w-full bg-transparent border border-line px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              minLength={6}
              className="w-full bg-transparent border border-line px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button
            disabled={saving}
            className="bg-cobalt text-onaccent text-sm font-semibold uppercase py-2.5 px-4 hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Mettre à jour"}
          </button>
        </form>
      </div>

      <ThemePanel current={company.theme ?? readLocalTheme()} onChange={onChange} />

      <NotificationsPanel />

      {referral && <ReferralPanel referral={referral} />}

      <div className="border-t border-line pt-6">
        <h2 className="font-display text-xl mb-2">Statut Premium</h2>
        {/* Aucun de ces avantages ne majore un revenu ni n'allège une charge :
            le classement reste ouvert à une compagnie gratuite bien menée. */}
        <p className="text-sm text-slate2 font-body mb-4">
          Premium ne donne aucun bonus de revenu et ne change pas la taille maximale rentable d'une compagnie. Il
          enlève des corvées et ouvre des choix. Les rames Express et Fret Lourd, elles, se débloquent par le grade
          de carrière — pas par l'abonnement.
        </p>

        <ul className="border border-line divide-y divide-line mb-4">
          {[
            ["Deux ordres par donneur d'ordre", "Plus de choix à la table, pas une meilleure prime"],
            ["Marché de fret élargi", "Six contrats visibles au lieu de trois"],
            ["Réparation automatique", "La rame repart seule si la trésorerie suit — la facture est identique"],
            ["−20 % sur les places de dépôt", "Vous atteignez la même taille optimale plus tôt, pas une taille plus grande"],
            ["Livrée étendue", "Une palette de couleurs réservée pour votre compagnie"],
          ].map(([label, detail]) => (
            <li key={label} className="px-4 py-3">
              <div className="text-sm font-body text-offwhite">{label}</div>
              <div className="text-[11px] font-body text-slate2 mt-0.5">{detail}</div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border border-line p-4 gap-3 flex-wrap">
          <span className={`text-xs font-mono2 uppercase tracking-wide ${company.isPremium ? "text-amber" : "text-slate2"}`}>
            {company.isPremium ? "Premium actif" : "Compte gratuit"}
          </span>

          {!company.isPremium &&
            (billingOpen ? (
              <button
                onClick={startCheckout}
                disabled={checkingOut}
                className="bg-amber text-onaccent text-xs font-semibold uppercase tracking-wide px-4 py-2 hover:bg-amber/90 active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {checkingOut ? "Ouverture du paiement…" : "Passer au Premium"}
              </button>
            ) : (
              <span className="text-[11px] font-mono2 uppercase text-slate2 border border-line px-2 py-1">
                Bientôt disponible
              </span>
            ))}
        </div>
      </div>

      <div className="border-t-0 pt-0">
        <div className="hazard-stripes h-1.5 mb-5" />
        <h2 className="font-display text-xl mb-2 text-rail-red">Zone de danger</h2>
        <p className="text-sm text-slate2 font-body mb-4">
          Supprimer votre compte efface définitivement votre compagnie, vos trains, lignes, et tout votre historique. Cette action est irréversible.
        </p>
        {confirmDelete ? (
          <div className="border border-rail-red/40 bg-rail-red/5 p-4 space-y-3 tutorial-step-enter">
            <p className="text-sm text-offwhite font-body">Confirmez-vous la suppression définitive de votre compte ?</p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-rail-red text-onaccent text-xs font-semibold uppercase px-3 py-2 hover:bg-rail-red/90 transition-colors disabled:opacity-50"
              >
                {deleting ? "Suppression…" : "Oui, supprimer définitivement"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-slate2 hover:text-offwhite uppercase font-body px-3 py-2 border border-line"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-mono2 uppercase text-rail-red border border-rail-red/40 px-3 py-2 hover:bg-rail-red/10 transition-colors"
          >
            Supprimer mon compte
          </button>
        )}
      </div>
    </div>
  );
}
