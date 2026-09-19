import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TrainMark, TrackMark, CargoMark, TrophyMark, LedgerMark, MedalMark, SwapMark, MapMark, StaffMark, GearMark, FogMark, SunMark, SnowMark, LockMark, FragileMark, RankMark, AnnounceMark } from "../components/TrainMark";
import { RailSchematic } from "../components/RailSchematic";
import { Tutorial } from "../components/Tutorial";
import { SplitFlap } from "../components/SplitFlap";
import { SteamEffect } from "../components/SteamEffect";
import { WeatherOverlay } from "../components/WeatherOverlay";
import { WhatsNewModal } from "../components/WhatsNewModal";
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

interface LeaderboardEntry {
  id: string;
  name: string;
  liveryColor: string;
  balance: number;
  _count: { trains: number; lines: number };
}

export default function Dashboard() {
  const { logout } = useAuth();
  const { showToast, showComposter } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"lignes" | "trains" | "fret" | "classement" | "historique" | "succes" | "carte" | "personnel" | "parametres" | "carriere">("trains");
  const [now, setNow] = useState(new Date());
  const [market, setMarket] = useState<Contract[]>([]);
  const [myContracts, setMyContracts] = useState<Contract[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ companies: LeaderboardEntry[]; myCompanyId: string | null }>({
    companies: [],
    myCompanyId: null,
  });
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

  async function loadAll() {
    try {
      const { data: c } = await api.get("/company");
      setCompany(c);
      const [{ data: l }, { data: t }, { data: mkt }, { data: mine }, { data: lb }, { data: inc }, { data: tx }, { data: ach }, { data: dc }, { data: st }, { data: wx }, { data: sum }, { data: car }] = await Promise.all([
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
      ]);
      setLines(l);
      setMarket(mkt);
      setLeaderboard(lb);
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
        await api.patch("/company", { tutorialSeen: true });
        // un nouveau joueur n'a connu aucune version précédente : on le considère à jour d'emblée
        localStorage.setItem("last-seen-version", CURRENT_VERSION);
        loadAll();
      } catch {
        // pas grave si ça échoue ponctuellement, le tutoriel réapparaîtra simplement à la prochaine visite
      }
    }
  }

  useEffect(() => {
    if (!company) return;
    if (company.tutorialSeen && localStorage.getItem("last-seen-version") !== CURRENT_VERSION) {
      setShowWhatsNew(true);
    }
  }, [company]);

  function dismissWhatsNew() {
    localStorage.setItem("last-seen-version", CURRENT_VERSION);
    setShowWhatsNew(false);
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
            <SidebarItem icon={<TrophyMark size={14} />} label="Classement" count={leaderboard.companies.length} active={view === "classement"} onClick={() => setView("classement")} dataTutorial="nav-classement" />
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
        />
      )}
      {showWhatsNew && !showTutorial && <WhatsNewModal onClose={dismissWhatsNew} />}
      {editingCompany && (
        <EditCompanyModal company={company} onClose={() => setEditingCompany(false)} onChange={loadAll} />
      )}
      {showCatalog && (
        <TrainCatalogModal buying={buyingTrain} isPremium={company.isPremium} onBuy={buyTrain} onClose={() => setShowCatalog(false)} />
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
            {view === "classement" && (
              <LeaderboardSection leaderboard={leaderboard} />
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
              <NetworkMap lines={lines} trains={trains} contracts={myContracts} />
            )}
            {view === "personnel" && (
              <StaffSection staff={staff} isPremium={company.isPremium} onChange={loadAll} />
            )}
            {view === "parametres" && <SettingsSection company={company} onChange={loadAll} />}
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
  classement: { title: "Classement", subtitle: "Les compagnies les plus prospères du réseau." },
  historique: { title: "Historique", subtitle: "Le registre de tous les mouvements de trésorerie." },
  succes: { title: "Succès", subtitle: "Les étapes franchies par votre compagnie." },
  carte: { title: "Carte du réseau", subtitle: "Vos lignes et vos trains, positionnés en temps réel." },
  personnel: { title: "Personnel", subtitle: "Recrutez du personnel pour améliorer votre exploitation." },
  parametres: { title: "Paramètres", subtitle: "Gérez votre compte." },
  carriere: { title: "Carrière", subtitle: "Votre progression, grade après grade." },
};

function PageHeader({ view, company }: { view: "trains" | "lignes" | "fret" | "classement" | "historique" | "succes" | "carte" | "personnel" | "parametres" | "carriere"; company: Company }) {
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
          className="w-full bg-cobalt text-offwhite font-semibold py-2.5 text-sm uppercase tracking-wide hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100"
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
  const [duration, setDuration] = useState(10);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();

  function startCreate() {
    setEditingId(null);
    setName(""); setDeparture(""); setArrival(""); setDuration(10);
    setOpen((v) => !v);
  }

  function startEdit(line: Line) {
    setEditingId(line.id);
    setName(line.name ?? "");
    setDeparture(line.departureStation);
    setArrival(line.arrivalStation);
    setDuration(line.durationMinutes);
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
          durationMinutes: Number(duration),
        });
        showToast(`Ligne ${departure} → ${arrival} mise à jour`);
      } else {
        await api.post("/lines", {
          name,
          departureStation: departure,
          arrivalStation: arrival,
          durationMinutes: Number(duration),
        });
        showToast(`Ligne ${departure} → ${arrival} créée`);
      }
      setName(""); setDeparture(""); setArrival(""); setDuration(10);
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

          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">Durée du trajet</label>
            <div className="flex items-center gap-2 flex-wrap">
              {[5, 10, 15, 20, 30].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setDuration(preset)}
                  className={`text-xs font-mono2 px-2.5 py-1.5 border transition-colors ${
                    duration === preset ? "border-cobalt text-cobalt bg-cobalt/10" : "border-line text-slate2 hover:text-offwhite"
                  }`}
                >
                  {preset} min
                </button>
              ))}
              <input
                type="number"
                min={1}
                className="w-20 bg-transparent border border-line px-2 py-1.5 text-xs font-mono2 focus:outline-none focus:border-cobalt"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {(departure || arrival) && (
            <div className="flex items-center gap-2 border border-dashed border-line px-3 py-2.5 text-sm font-mono2 text-slate2">
              <TrainMark size={14} className="text-cobalt shrink-0" />
              <span className="text-offwhite">{departure || "?"}</span>
              <span>→</span>
              <span className="text-offwhite">{arrival || "?"}</span>
              <span className="ml-auto text-amber">{duration} min</span>
            </div>
          )}

          <button
            disabled={!departure || !arrival}
            className="w-full bg-cobalt text-offwhite text-sm font-semibold uppercase py-2.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
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
  const repairCostPerPoint = hasChefDepot ? (company.isPremium ? 0.5 : 1) : 2;

  const atCapacity = trains.length >= company.maxTrains;
  const expandCost = company.maxTrains * 200;
  const atFleetCap = company.maxTrains >= 6;

  async function expandFleet() {
    setExpanding(true);
    try {
      await api.post("/company/expand-fleet");
      showToast(`Dépôt agrandi — capacité portée à ${company.maxTrains + 1} rames`);
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
          {atCapacity && !atFleetCap && (
            <button
              onClick={expandFleet}
              disabled={expanding}
              className="text-[11px] font-mono2 text-amber uppercase border border-amber/40 px-2 py-1 hover:bg-amber/10 transition-colors disabled:opacity-50"
            >
              {expanding ? "Agrandissement…" : `Agrandir le dépôt (${expandCost} pi.)`}
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

function LeaderboardSection({
  leaderboard,
}: {
  leaderboard: { companies: LeaderboardEntry[]; myCompanyId: string | null };
}) {
  const { companies, myCompanyId } = leaderboard;

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full text-sm min-w-[560px]">
      <thead>
        <tr className="text-left text-[11px] text-slate2 font-body uppercase tracking-[0.14em] border-b border-line">
          <th className="py-2.5 font-normal w-10">Rang</th>
          <th className="py-2.5 font-normal">Compagnie</th>
          <th className="py-2.5 font-normal text-center">Rames</th>
          <th className="py-2.5 font-normal text-center">Lignes</th>
          <th className="py-2.5 font-normal text-right">Trésorerie</th>
        </tr>
      </thead>
      <tbody>
        {companies.length === 0 && (
          <tr><td colSpan={5} className="py-6 text-center text-slate2 font-body">Le classement se construit…</td></tr>
        )}
        {companies.map((c, i) => {
          const isMine = c.id === myCompanyId;
          return (
            <tr
              key={c.id}
              className={`border-b border-line last:border-0 transition-colors ${
                isMine ? "bg-cobalt/10" : "hover:bg-navy-900/40"
              }`}
            >
              <td className="py-3.5 font-mono2 text-slate2">
                {i === 0 ? <TrophyMark size={15} className="text-amber claim-ready-glow" /> : `#${i + 1}`}
              </td>
              <td className="py-3.5 font-body">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 shrink-0" style={{ background: c.liveryColor }} />
                  {c.name}
                  {isMine && <span className="text-[10px] text-cobalt font-mono2 uppercase border border-cobalt/40 px-1.5">Vous</span>}
                </span>
              </td>
              <td className="py-3.5 text-center font-mono2 text-slate2">{c._count.trains}</td>
              <td className="py-3.5 text-center font-mono2 text-slate2">{c._count.lines}</td>
              <td className="py-3.5 text-right font-mono2 text-amber">{c.balance} pi.</td>
            </tr>
          );
        })}
      </tbody>
    </table>
      </div>
  );
}

const LIVERY_COLORS = ["#c99a3e", "#4f7fa3", "#5c8a68", "#a8483a", "#8a6ba3", "#c97a3e"];

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
            <div className="flex gap-2">
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
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-line">
          <button onClick={onClose} className="text-xs text-slate2 hover:text-offwhite font-body uppercase tracking-wide">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="bg-cobalt text-offwhite text-xs font-semibold uppercase tracking-wide px-4 py-2 hover:bg-cobalt/90 active:scale-[0.97] transition-transform disabled:opacity-50"
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
    premium: false,
  },
  {
    id: "EXPRESS",
    name: "Rame Express",
    spec: "Trajets voyageurs 30% plus rapides sur les lignes",
    speedLevel: 3,
    capacityLevel: 1,
    price: 450,
    premium: true,
  },
  {
    id: "FRET_LOURD",
    name: "Rame Fret Lourd",
    spec: "+25% de récompense sur chaque livraison de fret",
    speedLevel: 1,
    capacityLevel: 3,
    price: 450,
    premium: true,
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

function TrainCatalogModal({
  buying,
  isPremium,
  onBuy,
  onClose,
}: {
  buying: boolean;
  isPremium: boolean;
  onBuy: (model: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
      <div className="w-full max-w-3xl bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter">
        <div className="px-6 py-5 border-b border-line">
          <h2 className="font-display text-2xl">Catalogue du matériel roulant</h2>
          <p className="text-sm text-slate2 font-body mt-1">
            {isPremium ? "Votre statut Premium débloque les modèles exclusifs." : "Les modèles Express et Fret Lourd sont réservés au Premium."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
          {CATALOG.map((model) => {
            const locked = model.premium && !isPremium;
            return (
              <div key={model.id} className={`relative p-5 flex flex-col ${locked ? "opacity-45" : ""}`}>
                {locked && (
                  <span className="absolute top-4 right-4 text-[10px] font-mono2 uppercase text-slate2 border border-line px-1.5 py-0.5">
                    Premium
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
                      className="w-full bg-cobalt text-offwhite text-xs font-semibold uppercase tracking-wide py-2.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-60"
                    >
                      {buying ? "Achat…" : "Commander"}
                    </button>
                  </>
                ) : (
                  <button disabled className="w-full border border-line text-slate2 text-xs font-mono2 uppercase py-2.5 cursor-not-allowed">
                    Réservé au Premium
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
  PUBLICITE: "Publicité",
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

// Positions approximatives des gares sur une carte stylisée de France (viewBox 0 0 340 380)
const STATION_COORDS: Record<string, { x: number; y: number }> = {
  "Lille": { x: 190, y: 20 },
  "Rouen": { x: 140, y: 65 },
  "Le Havre": { x: 95, y: 60 },
  "Paris": { x: 190, y: 105 },
  "Chartres": { x: 160, y: 135 },
  "Metz": { x: 265, y: 90 },
  "Nancy": { x: 255, y: 112 },
  "Strasbourg": { x: 295, y: 125 },
  "Rennes": { x: 55, y: 130 },
  "Le Mans": { x: 110, y: 145 },
  "Dijon": { x: 230, y: 175 },
  "Mulhouse": { x: 280, y: 165 },
  "Nantes": { x: 65, y: 195 },
  "Lyon": { x: 235, y: 225 },
  "Grenoble": { x: 255, y: 265 },
  "Bordeaux": { x: 105, y: 265 },
  "Toulouse": { x: 160, y: 315 },
  "Marseille": { x: 245, y: 335 },
};

const LINE_PALETTE = ["#4f7fa3", "#c99a3e", "#5c8a68", "#a8483a", "#8a6ba3", "#c97a3e"];

function NetworkMap({ lines, trains, contracts }: { lines: Line[]; trains: Train[]; contracts: Contract[] }) {
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
      </div>

      <div className="relative p-3">
        {/* repères d'angle façon plan d'ingénieur */}
        <span className="absolute top-2 left-2 w-4 h-4 border-t border-l border-amber-dim pointer-events-none" />
        <span className="absolute top-2 right-2 w-4 h-4 border-t border-r border-amber-dim pointer-events-none" />
        <span className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-amber-dim pointer-events-none" />
        <span className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-amber-dim pointer-events-none" />

        <svg viewBox="0 0 340 380" className="w-full h-auto max-h-[560px]">
          <defs>
            <marker id="arrow-active" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#4f7fa3" />
            </marker>
          </defs>

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
                stroke="#c99a3e"
                strokeWidth="1.6"
                strokeDasharray="2 5"
                strokeLinecap="round"
                opacity="0.8"
              />
            );
          })}

          {/* gares : discrètes si non desservies, marquées si utilisées, pulsées si un train y transite actuellement */}
          {Object.entries(STATION_COORDS).map(([name, pos]) => {
            const active = usedStations.has(name);
            const pulsing = activeStations.has(name);
            return (
              <g key={name}>
                {pulsing && (
                  <circle cx={pos.x} cy={pos.y} r={7} fill="none" stroke="#5c8a68" strokeWidth="1" opacity="0.6" className="blink-dot" />
                )}
                <circle cx={pos.x} cy={pos.y} r={active ? 4 : 2.5} fill={active ? "#ece4d3" : "#4a3f2e"} stroke={active ? "#4f7fa3" : "none"} strokeWidth="1.5" />
                <text
                  x={pos.x + 6} y={pos.y + 3}
                  fontSize="8"
                  fontFamily="'Space Mono', monospace"
                  fill={active ? "#ece4d3" : "#a3947a"}
                  opacity={active ? 1 : 0.6}
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
                <circle r="6" fill="#18140f" stroke="#5c8a68" strokeWidth="1.5" opacity="0.9" />
                <rect x="-4" y="-1.6" width="8" height="3.2" rx="1" fill="#5c8a68" />
                <circle cx="4.5" cy="0" r="1.1" fill="#18140f" />
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
                <rect x="-5" y="-5" width="10" height="10" fill="#18140f" stroke="#c99a3e" strokeWidth="1.5" />
                <rect x="-2.5" y="-2.5" width="5" height="5" fill="#c99a3e" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-t border-line text-[10px] font-mono2 text-slate2 uppercase tracking-wide">
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-cobalt" /> Ligne active</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t border-dashed border-line" /> Ligne au repos</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-offwhite border border-cobalt" /> Gare desservie</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-line" /> Gare disponible</span>
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

const STAFF_ROLES_UI: Record<string, { label: string; salaryPerTick: number; effect: string; premium: boolean }> = {
  MECANICIEN: {
    label: "Mécanicien",
    salaryPerTick: 3,
    effect: "Réduit l'usure accumulée par vos rames en service (davantage encore en Premium)",
    premium: false,
  },
  CHEF_DEPOT: {
    label: "Chef de dépôt",
    salaryPerTick: 4,
    effect: "Réduit le coût des réparations (encore plus en Premium)",
    premium: false,
  },
  DIRECTEUR_COMMERCIAL: {
    label: "Directeur commercial",
    salaryPerTick: 6,
    effect: "Augmente de 15% tous vos revenus (voyageurs et fret)",
    premium: true,
  },
};

function StaffSection({ staff, isPremium, onChange }: { staff: Staff[]; isPremium: boolean; onChange: () => void }) {
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
        const locked = def.premium && !isPremium;
        return (
          <div key={role} className={`relative p-4 border ${hired ? "border-cobalt/40 bg-cobalt/5" : "border-line"} ${locked ? "opacity-60" : ""}`}>
            {def.premium && (
              <span className="absolute top-3 right-3 text-[10px] font-mono2 uppercase text-amber border border-amber/40 px-1.5 py-0.5">
                Premium
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
                  Réservé Premium
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

function SettingsSection({ company, onChange }: { company: Company; onChange: () => void }) {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [referral, setReferral] = useState<{
    code: string;
    wasReferred: boolean;
    totalReferred: number;
    rewardsGranted: number;
    pendingRewards: number;
    referrals: { name: string; rewarded: boolean }[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/referral/mine").then(({ data }) => setReferral(data)).catch(() => {});
  }, []);

  function copyReferralLink() {
    if (!referral) return;
    const link = `${window.location.origin}/?ref=${referral.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            className="bg-cobalt text-offwhite text-sm font-semibold uppercase py-2.5 px-4 hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Mettre à jour"}
          </button>
        </form>
      </div>

      {referral && (
        <div className="border-t border-line pt-6">
          <h2 className="font-display text-xl mb-2">Parrainage</h2>
          <p className="text-sm text-slate2 font-body mb-4">
            Invitez des amis avec votre code : ils reçoivent 100 pi. de bienvenue, et vous recevez 150 pi. dès qu'ils
            ont vraiment commencé à jouer (au moins un train et une ligne créés).
          </p>

          <div className="flex items-center gap-3 border border-line p-4 mb-4 flex-wrap">
            <span className="font-mono2 text-lg text-amber tracking-[0.2em]">{referral.code}</span>
            <button
              onClick={copyReferralLink}
              className="ml-auto text-xs font-mono2 uppercase text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 transition-colors"
            >
              {copied ? "Copié !" : "Copier le lien"}
            </button>
          </div>

          <div className="grid grid-cols-3 divide-x divide-line border border-line mb-4">
            <div className="px-3 py-3 text-center">
              <div className="font-mono2 text-lg text-offwhite">{referral.totalReferred}</div>
              <div className="text-[10px] text-slate2 font-body uppercase tracking-wide mt-1">Amis invités</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="font-mono2 text-lg text-rail-green">{referral.rewardsGranted}</div>
              <div className="text-[10px] text-slate2 font-body uppercase tracking-wide mt-1">Récompenses reçues</div>
            </div>
            <div className="px-3 py-3 text-center">
              <div className="font-mono2 text-lg text-amber">{referral.pendingRewards}</div>
              <div className="text-[10px] text-slate2 font-body uppercase tracking-wide mt-1">En attente</div>
            </div>
          </div>

          {referral.wasReferred && (
            <p className="text-xs text-slate2 font-body">Vous avez vous-même rejoint le réseau via un code de parrainage.</p>
          )}
        </div>
      )}

      <div className="border-t border-line pt-6">
        <h2 className="font-display text-xl mb-2">Statut Premium</h2>
        <p className="text-sm text-slate2 font-body mb-4">
          Débloque les modèles de trains exclusifs et le personnel avancé. La mise en vente arrive prochainement.
        </p>
        <div className="flex items-center justify-between border border-line p-4">
          <span className={`text-xs font-mono2 uppercase tracking-wide ${company.isPremium ? "text-amber" : "text-slate2"}`}>
            {company.isPremium ? "Premium actif" : "Compte gratuit"}
          </span>
          {!company.isPremium && (
            <span className="text-[11px] font-mono2 uppercase text-slate2 border border-line px-2 py-1">
              Bientôt disponible
            </span>
          )}
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
                className="bg-rail-red text-offwhite text-xs font-semibold uppercase px-3 py-2 hover:bg-rail-red/90 transition-colors disabled:opacity-50"
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
