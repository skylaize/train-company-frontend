import { StaffFigure } from "../components/StaffFigure";
import { MuseumSection } from "../components/MuseumSection";
import { AlertsPanel, useAlertFeed } from "../components/PremiumTools";
import { useCallback, useEffect, useState, useRef } from "react";
import { TrainPicture } from "../components/TrainPicture";
import { COUNTRIES, COUNTRY_LABELS, SEA_LABELS } from "../components/europeMap";
import { RIVERS, RELIEF, RELIEF_LABELS, GRATICULE } from "../components/mapDecor";
import { useMapCamera } from "../components/useMapCamera";
import { MOUNTAIN_STATIONS, setMountainOwned, hasMountain } from "../geo";
import { stationVisible, setTunnelOpen, STATION_COORDS, lineCurve, pointOnCurve, LINE_PALETTE, distanceKm, durationFromKm, lengthYieldPct, routeStations, routeMinutes, routeKm, positionOnRoute, routePath, MAX_STOPS } from "../geo";

import { UpdateBanner } from "../components/UpdateBanner";
import { useInstall, isStandalone } from "../install";
import { InstallGuide, InstallPanel } from "../components/InstallApp";
import { InstagramMark } from "../components/InstagramMark";
import { DiscordMark } from "../components/DiscordMark";
import { DiscordPanel } from "../components/DiscordPanel";
import { INSTAGRAM, DISCORD } from "../social";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { clearReferral, pendingReferral, referralLink } from "../referral";
import { PioneersBanner, PioneersModal } from "../components/Pioneers";
import { Train200Card, Train200MapLayer } from "../components/Train200";
import { HalloweenCard, HalloweenMapLayer } from "../components/Halloween";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { JournalBell } from "../components/Journal";
import { WAGON_TYPES, FREIGHT_CATALOG, isFreightLoco, wagonForCargo, freightModel, loadFor, tourMinutes, fmtLoad } from "../freight";
import { FreightComposition } from "../components/FreightComposition";
import { MarketSection, ConstructionPanel } from "../components/MarketSection";
import { NotificationsPanel } from "../components/NotificationsPanel";
import { ShopSection } from "../components/ShopSection";
import { Emblem } from "../components/Emblem";

/* Durée de chantier, en clair. Le joueur doit lire « 2 h 15 », pas « 2.25 ». */
function formatBuildHours(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}
import { TrainMark, TrackMark, CargoMark, TrophyMark, LedgerMark, ChartMark, MedalMark, SwapMark, MapMark, StaffMark, GearMark, TenderMark, ShopMark, MoonMark, InstallMark, LockMark, FragileMark, RankMark, AnnounceMark, StationMark, BankMark, SeasonMark, AllianceMark } from "../components/TrainMark";
import { InfrastructureSection } from "../components/InfrastructureSection";
import { LineLoadModal } from "../components/LineLoadModal";
import { adsEnabled, loadAds, showRewardedAd } from "../ads";
import { AdBanner } from "../components/AdBanner";
import { Plate } from "../components/Plate";
import { HomeBoard, MiniRoute } from "../components/HomeBoard";
import { SeasonSection, SeasonData, loadSeason, seasonLead, DIVISION_COLORS } from "../components/SeasonSection";
import { NavRow, NavGroup, MobileTabBar, CompanyBadge } from "../components/AppNav";
import { TrainStage, TrainArrival } from "../components/TrainStage";
import { TrainSheet, PartsStore } from "../components/TrainSheet";
import { GazetteData, loadGazette } from "../components/Gazette";
import { modelLabel, hhmm, minutesLeft, PART_LABEL, PART_NEED, modelSpeed, hslOpen, hslBuilding } from "../models";
import { playChime, playAlert, vibrate, soundsOn, setSoundsOn, setSoundPack } from "../sfx";
import { AllianceSection, AllianceData, loadAlliance, allianceLead } from "../components/AllianceSection";
import { WorldData } from "../components/WorldCard";
import { WeeklyReportSection, BankSection, StockMarketSection } from "../components/FinanceSection";
import { RailSchematic } from "../components/RailSchematic";
import { LogoMark } from "../components/Logo";
import { Tutorial } from "../components/Tutorial";
import { SplitFlap } from "../components/SplitFlap";
import { SteamEffect } from "../components/SteamEffect";
import { TendersSection } from "../components/TendersSection";
import { ThemeTrialBanner, ThemeTrial } from "../components/ShopSection";
import { WhatsNewModal } from "../components/WhatsNewModal";
import { ProfitabilitySection } from "../components/ProfitabilitySection";
import { AbsenceReport } from "../components/AbsenceReport";
import { resyncPush } from "../push";
import { PremiumCTA } from "../components/PremiumCTA";
import { CabView, CabTrain } from "../components/CabView";
import { LiveCab } from "../components/LiveCab";
import { NetworkData, StationEventsPanel, LineShareCell, DemandCell, RivalsDetail, stationOf, pairOf, SeasonBanner, HubCell, hubPreview, LicencePanel, LineMarket, RushPanel } from "../components/NetworkPanels";
import { FirstVisitHint } from "../components/FirstVisitHint";
import { FirstSteps, firstStepsActive, firstStepsProgress, firstStepsDone, FirstStepsInput } from "../components/FirstSteps";
import { Decision, DecisionBanner, DecisionModal } from "../components/Decisions";
import { NewsTicker, NewsItem } from "../components/NewsTicker";
import { applyTheme, readLocalTheme, THEMES, ThemeId } from "../theme";
import { CURRENT_VERSION } from "../changelog";
import { setStationWeather } from "../stationWeather";
import { PurchaseReveal, Reveal, fetchReveals, markSeen } from "../components/PurchaseReveal";
import { WreckYard, loadWrecks, RARITY_COLOR, type Wreck as WreckInfo } from "../components/WreckYard";

interface Train {
  id: string;
  name: string;
  model: "STANDARD" | "EXPRESS" | "FRET_LOURD" | "COUCHETTES" | "NUIT_EUROPE" | "VAPEUR" | "LUXE" | "CREMAILLERE" | "LOCOTRACTEUR" | "FRET_RAPIDE" | "FRET_ELECTRIQUE" | "TGV";
  status: "IDLE" | "EN_ROUTE" | "MAINTENANCE";
  progress: number;
  wear: number;
  departedAt?: string | null;
  line?: { id: string; name: string; departureStation: string; arrivalStation: string; durationMinutes?: number; stops?: string[]; electrified?: boolean; doubleTrack?: boolean; highSpeedAt?: string | null } | null;
  // 1.7
  direction?: number;
  cars?: string[];
  plateStyle?: string | null; // 2.1 : plaque nominative
  serviceFrom?: number | null; // 2.1.1 (Premium) : horaires
  serviceTo?: number | null;
  lastPassengers?: number | null;
  lastSeats?: number | null;
  // 2.0 : l'atelier
  organs?: { id: string; label: string; wear: number; broken: boolean }[];
  brokenPart?: string | null;
  partsEta?: string | null;
  workshopUntil?: string | null;
  serviceAt?: number | null;
  resaleValue?: number;
  crew?: { id: string; name: string; role: string; level: number }[];
  // 2.0 : rame de collection restaurée depuis une épave
  heritage?: { label: string; serial: string; rarity: string; skin: string; livery: string; prestige: number; year: number; history: string } | null;
}

interface Weather {
  type: string;
  label: string | null;
  endsAt: string | null;
}

interface Staff {
  id: string;
  role: "MECANICIEN" | "CHEF_DEPOT" | "DIRECTEUR_COMMERCIAL" | "CONTROLEUR" | "CONDUCTEUR";
  salaryPerTick: number;
  name?: string;
  level?: number;
  raiseRequested?: boolean;
  trainId?: string | null; // 2.0 : équipage
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
  current?: number;
  target?: number;
}

interface CareerRank {
  id: number;
  name: string;
  requirements: CareerRequirement[];
  achieved: boolean;
  reward?: string | null;
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
  // 1.7
  stops?: string[];
  priceRatio?: number;
  electrified?: boolean;
  autoPrice?: boolean;
  doubleTrack?: boolean; // 2.1
  highSpeedAt?: string | null; // 2.2 : LGV (ouverture, ou fin de chantier si dans le futur)
}

interface Company {
  adFree?: boolean; // 1.7 : billet sans pub
  id: string;
  name: string;
  liveryColor: string;
  balance: number;
  maxTrains: number;
  reputation: number;
  isPremium: boolean;
  premiumTrialUntil?: string | null; // 2.1 : Premium d'essai
  premiumTrialEndedAt?: string | null;
  tutorialSeen: boolean;
  nextDepotCost?: number;
  nextDepotHours?: number;
  repairCostPerPoint?: number;
  emblem?: string | null;
  title?: string | null;
  cabSkin?: string | null;
  // 2.1 : sons de gare, habillage des gares, tenues du personnel
  soundPack?: string | null;
  stationSkin?: string | null;
  yards?: string[]; // 2.1 : gares de triage
  uniform?: string | null;
  unlocked?: {
    themes: string[]; emblems: string[]; titles: string[]; liveries: string[];
    trainPlates?: string[]; sounds?: string[]; stationSkins?: string[]; uniforms?: string[]; posters?: string[]; museum?: boolean;
  };
  construction?: { id: string; label: string; endsAt: string } | null;
  queuedConstruction?: { id: string; label: string; endsAt: string } | null;
  canQueue?: boolean;
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
  acceptedAt?: string | null;
  reward: number;
  risky: boolean;
  insured: boolean;
  status: "DISPONIBLE" | "EN_COURS" | "LIVREE";
  expiresAt?: string | null;
  train?: { id: string; name: string; progress: number } | null;
  // 2.0 : l'ordre de donneur d'ordre que cette livraison fera avancer
  forOrder?: { ref: string; client: string; progress: number; target: number; more: number } | null;
}

function OrderTag({ o }: { o: NonNullable<Contract["forOrder"]> }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-body text-cobalt border border-cobalt/40 px-2 py-0.5 mt-1"
      title={o.more ? `Puis ${o.more} autre${o.more > 1 ? "s" : ""} ordre${o.more > 1 ? "s" : ""} de la même marchandise` : undefined}
    >
      Compte pour l'ordre nº {o.ref} · {o.client} · {o.progress}/{o.target}
      {o.more > 0 && <span className="text-slate2">+{o.more}</span>}
    </span>
  );
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
  emblem?: string | null;
  grade: string;
  title: string | null;
  plate?: string | null; // 1.7 : plaque d'honneur
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
  const { showToast, showComposter, notify, setJournalOwner, setNavigator } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(true);
  // 2.2 : lien vers le panneau d'administration, pour les comptes de l'équipe
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    api.get("/me").then(({ data }) => setIsAdmin(Boolean(data?.isAdmin))).catch(() => undefined);
  }, []);
  // 2.1.2 : le premier chargement a échoué (serveur lent, réseau coupé)
  const [loadFailed, setLoadFailed] = useState(false);
  // 2.1.2 : la fenêtre des 200 pionniers
  const [pioneersOpen, setPioneersOpen] = useState(false);
  const closePioneers = useCallback(() => setPioneersOpen(false), []);
  const [view, setView] = useState<DashboardView>("trains");
  const [now, setNow] = useState(new Date());
  const [market, setMarket] = useState<Contract[]>([]);
  const [myContracts, setMyContracts] = useState<Contract[]>([]);
  const [leaderTotal, setLeaderTotal] = useState(0);
  // 2.0 : saison, alliance, Grand Chantier
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [alliance, setAlliance] = useState<AllianceData | null>(null);
  const [world, setWorld] = useState<WorldData | null>(null);
  const reloadSeason = () => loadSeason().then((d) => d && setSeason(d));
  const reloadAlliance = () => loadAlliance().then((d) => d && setAlliance(d));
  /* 2.0.3 : le journal de bord se tient par compagnie, et ses liens ouvrent la bonne rubrique */
  useEffect(() => setJournalOwner(company?.id ?? null), [company?.id, setJournalOwner]);
  // 2.1.1 (Premium) : les alertes personnalisées déclenchées s'affichent aussi dans le jeu
  useAlertFeed(company?.id, !!company?.isPremium, (msg) => notify(/^Rames usées/.test(msg) ? "rames" : /^Contrat de fret/.test(msg) ? "fret" : "argent", msg, { label: "Mes alertes", view: "alertes" }));
  // 2.1 : le son de gare choisi en boutique remplace le carillon
  useEffect(() => setSoundPack(company?.soundPack ?? null), [company?.soundPack]);
  useEffect(() => {
    setNavigator((link) => {
      setView(link.view as DashboardView);
      if (link.trainId) setSheetRequest(link.trainId);
    });
    return () => setNavigator(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* 2.0.3 : invitations et candidatures d'alliance arrivent au journal de bord */
  const allianceSeen = useRef<{ invites: Set<string>; apps: Set<string> } | null>(null);
  useEffect(() => {
    if (!alliance) return;
    const invites = new Set((alliance.invites ?? []).map((i) => i.id));
    const apps = new Set((alliance.applications ?? []).map((a) => a.id));
    const prev = allianceSeen.current;
    allianceSeen.current = { invites, apps };
    if (!prev) return;
    for (const i of alliance.invites ?? []) if (!prev.invites.has(i.id)) notify("alliance", `${i.alliance} vous invite à la rejoindre`, { label: "Répondre", view: "alliance" });
    for (const a of alliance.applications ?? []) if (!prev.apps.has(a.id)) notify("alliance", `${a.name} veut rejoindre votre alliance`, { label: "Voir la candidature", view: "alliance" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alliance]);
  const [leaderMe, setLeaderMe] = useState<{ rank?: number; aheadName?: string | null; gap?: number } | null>(null);
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
  // 1.7 : décisions à trancher, et le fil du réseau
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [openDecision, setOpenDecision] = useState<Decision | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  // 1.7 : la trésorerie qui monte se voit (« +48 pi. » au-dessus du compteur)
  const lastBalance = useRef<number | null>(null);
  const [gain, setGain] = useState<{ amount: number; key: number } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  // 2.0.3 : le tutoriel attend que le joueur ouvre la carte avec une rame en route
  const [mapSeen, setMapSeen] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [buyingTrain, setBuyingTrain] = useState(false);

  /* 2.0 : la rame neuve entre en gare (voir TrainStage) */
  const [arrival, setArrival] = useState<{ id: string; name: string; model: Train["model"]; skin?: string; livery?: string; kicker?: string; subtitle?: string } | null>(null);
  const [composeId, setComposeId] = useState<string | null>(null);
  const clearCompose = useCallback(() => setComposeId(null), []);
  // 2.0 : ouvrir la fiche atelier d'une rame depuis l'accueil de la flotte
  const [sheetRequest, setSheetRequest] = useState<string | null>(null);
  const clearSheet = useCallback(() => setSheetRequest(null), []);
  // 2.0 : la Gazette du Rail, relue toutes les dix minutes
  const [gazette, setGazette] = useState<GazetteData | null>(null);
  useEffect(() => {
    const load = () => void loadGazette().then(setGazette);
    load();
    const id = window.setInterval(load, 10 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  async function buyTrain(model: string) {
    setBuyingTrain(true);
    try {
      const trainName = `Rame ${trains.length + 1}`;
      const { data } = await api.post("/trains", { name: trainName, model });
      setShowCatalog(false);
      if (data?.id) setArrival({ id: data.id, name: data.name ?? trainName, model: (data.model ?? model) as Train["model"] });
      else showToast(`${trainName} acquise`);
      loadAll();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBuyingTrain(false);
    }
  }

  // abonnement aux notifications renvoyé au serveur à chaque ouverture du jeu (voir push.ts)
  useEffect(() => {
    resyncPush();
  }, []);

  /* Carte vivante du réseau (1.4) : gares, événements, concurrence. Rafraîchie
     toutes les minutes — la concurrence se calcule sur tout le réseau, pas
     question de la redemander à chaque battement du tableau de bord. */
  const [network, setNetwork] = useState<NetworkData | null>(null);
  // essai d'un habillage de la boutique : appliqué partout, jusqu'à ce qu'on revienne au sien
  /* L'essai n'est jamais enregistré : le thème local reste celui du compte,
     et c'est lui qu'on remet en quittant l'essai (y compris s'il vient d'être
     changé en équipant un habillage). */
  const [themeTrial, setThemeTrial] = useState<ThemeTrial | null>(null);
  // 1.6 : application installable
  const install = useInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  // retour d'un achat : boutique rechargée, objet acheté en vitrine
  const [shopKey, setShopKey] = useState(0);
  const [shopFocus, setShopFocus] = useState<string | null>(null);
  /* 2.0 : le déballage. File de ce qui vient d'arriver (achat, cadeau, Premium) */
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const revealKey = (r: Reveal) => (r.type === "premium" ? "premium" : r.purchaseId);
  const queueReveals = (list: Reveal[]) => {
    if (!list.length) return;
    setReveals((q) => [...q, ...list.filter((r) => !q.some((x) => revealKey(x) === revealKey(r)))]);
  };
  // on regarde au chargement, au retour sur l'onglet et de temps en temps : un cadeau peut arriver à tout moment
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") void fetchReveals().then(queueReveals);
    };
    check();
    const t = setInterval(check, 120_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* après un paiement, l'objet n'arrive qu'avec le webhook : on guette le
     déballage quelques secondes, puis la boutique se recharge */
  function awaitReveal(onFound?: () => void) {
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const list = await fetchReveals();
      if (list.length || tries >= 12) {
        clearInterval(timer);
        queueReveals(list);
        onFound?.();
        if (!list.length) showToast("Le paiement est enregistré, l'objet arrive dans un instant. Rechargez la page si besoin.");
      }
    }, 1500);
    return () => clearInterval(timer);
  }
  const themeTrialRef = useRef<ThemeTrial | null>(null);
  themeTrialRef.current = themeTrial;
  useEffect(() => {
    if (!themeTrial) return;
    applyTheme(themeTrial.theme as ThemeId, { persist: false });
    return () => applyTheme(readLocalTheme(), { persist: false });
  }, [themeTrial]);
  /* rechargée aussi quand une ligne change de gares ou gagne/perd une rame :
     les correspondances en dépendent, pas seulement le nombre de lignes */
  const linesSignature = lines
    .map((l) => `${l.id}:${l.departureStation}>${l.arrivalStation}:${(l as { trains?: unknown[] }).trains?.length ?? 0}:${l.priceRatio ?? 1}:${l.autoPrice ? 1 : 0}`)
    .join("|");
  useEffect(() => {
    const load = () => api.get("/network/map").then(({ data }) => { setTunnelOpen(Boolean(data?.tunnel?.open)); setMountainOwned(Boolean((data?.stations ?? []).find((st: { dlc?: { owned: boolean } | null }) => st.dlc)?.dlc?.owned)); setNetwork(data); }).catch(() => undefined);
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [linesSignature, company?.isPremium, (company as { intlLicenceAt?: string | null } | null)?.intlLicenceAt]);

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
    /* 2.0 : Stripe renvoie l'identifiant de la session ; le serveur la redemande
       à Stripe et livre tout de suite, sans attendre le webhook. Sans effet si
       le webhook est déjà passé, et rien n'est accordé sans paiement. */
    /* 2.1 : retour de la liaison Discord */
    const discord = params.get("discord");
    if (discord) {
      window.history.replaceState({}, "", window.location.pathname);
      setView("parametres");
      if (discord === "ok") showToast("Discord lié : vos rôles arrivent sur le serveur");
      else if (discord === "annule") showToast("Liaison Discord annulée");
      else showToast(params.get("raison") ?? "Liaison Discord impossible", "error");
      return;
    }

    const sessionId = params.get("session_id");
    if (sessionId) void api.post("/billing/confirm", { sessionId }).catch(() => undefined);

    /* Retour de la boutique : même principe que le Premium, l'objet n'est
       livré que par le webhook, on se contente d'attendre qu'il arrive. */
    const boutique = params.get("boutique");
    if (boutique) {
      window.history.replaceState({}, "", window.location.pathname);
      if (boutique === "annule") {
        showToast("Achat abandonné — rien n'a été débité");
      } else if (boutique === "cadeau") {
        // 2.0 : un cadeau part chez quelqu'un d'autre, rien à attendre ici
        showToast(`Paiement reçu : votre cadeau part pour ${params.get("pour") ?? "l'autre compagnie"}`);
        return;
      } else {
        // 2.0 : l'objet se déballe dès que le webhook l'a livré
        const sansPub = params.get("objet") === "sans-pub";
        if (!sansPub) setView("boutique");
        return awaitReveal(() => {
          loadAll();
          setShopKey((k) => k + 1);
        });
      }
      return;
    }

    const premium = params.get("premium");
    if (!premium) return;

    // on nettoie l'adresse pour que le message ne revienne pas à chaque rechargement
    window.history.replaceState({}, "", window.location.pathname);

    if (premium === "annule") {
      showToast("Paiement abandonné — votre compagnie n'a pas été débitée");
      return;
    }
    if (premium === "cadeau") {
      showToast(`Paiement reçu : ${params.get("pour") ?? "l'autre compagnie"} passe Premium dans un instant`);
      return;
    }
    if (premium !== "ok") return;

    showToast("Paiement reçu — votre billet arrive…");
    let tries = 0;
    const retry = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await api.get("/company");
        if (data?.isPremium) {
          clearInterval(retry);
          setCompany(data);
          // 2.0 : le billet de première classe se composte à l'écran
          const list = await fetchReveals();
          if (list.length) queueReveals(list);
          else showToast("Premium activé. Merci de soutenir le réseau.");
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

  /* 2.0 : le tableau de bord demandait tout, toutes les dix secondes, même
     onglet caché : une vingtaine de requêtes, dont des calculs lourds, par
     joueur connecté. Désormais trois rythmes : l'essentiel (trésorerie, rames,
     lignes) toutes les 10 s, le reste toutes les 30 s, et les succès, la
     carrière, les ordres et la météo toutes les 2 min. Rien quand l'onglet
     est caché. Une action du joueur recharge tout, tout de suite. */
  const loadingRef = useRef(false);
  // 2.1.2 : vrai jusqu'au premier affichage du tableau de bord
  const loadingFirstRef = useRef(true);
  const queuedRef = useRef(false);
  const lastMidRef = useRef(0);
  const lastSlowRef = useRef(0);
  async function loadAll(opts?: { auto?: boolean }) {
    if (loadingRef.current) {
      if (!opts?.auto) queuedRef.current = true;
      return;
    }
    loadingRef.current = true;
    const nowMs = Date.now();
    const mid = !opts?.auto || nowMs - lastMidRef.current >= 30_000;
    const slow = !opts?.auto || nowMs - lastSlowRef.current >= 120_000;
    if (mid) lastMidRef.current = nowMs;
    if (slow) lastSlowRef.current = nowMs;
    const SKIP = { data: undefined as any, skipped: true };
    const when = (due: boolean, call: () => Promise<{ data: any }>) => (due ? call() : Promise.resolve(SKIP));
    try {
      const { data: c } = await api.get("/company");
      setCompany(c);
      setLoadFailed(false);
      if (c && typeof c.balance === "number") {
        if (lastBalance.current !== null && c.balance > lastBalance.current) {
          setGain({ amount: c.balance - lastBalance.current, key: Date.now() });
        }
        lastBalance.current = c.balance;
      }
      api.get("/decisions").then(({ data }) => setDecisions(data?.decisions ?? [])).catch(() => undefined);
      if (mid) {
        api.get("/news").then(({ data }) => setNews(data?.items ?? [])).catch(() => undefined);
        // 2.0
        reloadSeason();
        reloadAlliance();
        api.get("/world").then(({ data }) => setWorld(data)).catch(() => undefined);
      }
      // 1.6 : ouverte depuis l'écran d'accueil — une fois suffit pour le succès
      if (isStandalone() && c && !(c.hintsSeen ?? "").split(",").includes("app")) {
        api.patch("/company", { seenHint: "app" }).catch(() => undefined);
      }

      /* Le thème du compte fait foi : il suit le joueur d'un appareil à l'autre.
         Le thème local n'a servi qu'à éviter le flash pendant cet appel. */
      if (c?.theme && c.theme !== readLocalTheme()) {
        applyTheme(c.theme);
        // un essai en cours garde l'écran : le thème du compte n'est qu'enregistré
        if (themeTrialRef.current) applyTheme(themeTrialRef.current.theme as ThemeId, { persist: false });
      }
      /* 2.1.2 : l'écran s'affiche dès que les lignes et les rames sont là.
         Il attendait la quinzaine d'appels, dont les plus lents (succès,
         classement, résumé du jour) prennent plusieurs secondes : le reste
         arrive juste après, sans bloquer le premier affichage. */
      const linesReq = api.get("/lines");
      const trainsReq = api.get("/trains");
      if (loadingFirstRef.current) {
        const [{ data: l0 }, { data: t0 }] = await Promise.all([linesReq, trainsReq]);
        setLines(l0);
        setTrains(t0);
        loadingFirstRef.current = false;
        setLoading(false);
      }
      const [{ data: l }, { data: t }, { data: mkt }, { data: mine }, { data: lb }, { data: inc }, { data: tx }, { data: ach }, { data: dc }, { data: st }, { data: wx }, { data: sum }, { data: car }, { data: ref }, { data: cli }] = await Promise.all([
        linesReq,
        trainsReq,
        when(mid, () => api.get("/contracts/market")),
        api.get("/contracts/mine"),
        when(mid, () => api.get("/leaderboard")),
        api.get("/incidents/mine"),
        when(mid, () => api.get("/transactions/mine")),
        when(slow, () => api.get("/achievements/mine")),
        when(mid, () => api.get("/daily-challenge/mine")),
        when(mid, () => api.get("/staff/mine")),
        when(slow, () => api.get("/weather/stations").catch(() => ({ data: null }))),
        when(mid, () => api.get("/summary/today")),
        when(slow, () => api.get("/career/mine")),
        when(slow, () => api.get("/referral/mine").catch(() => ({ data: null }))),
        when(slow, () => api.get("/clients/mine").catch(() => ({ data: null }))),
      ]);
      setLines(l);
      if (mid) {
        setMarket(mkt);
        setLeaderTotal(lb?.total ?? 0);
        setLeaderMe(lb?.me ?? null);
      }

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
      if (slow) setMissionCount(liveMissions);

      /* Un filleul qui prend le départ est la seule bonne nouvelle du parrainage
         que le joueur ne peut pas deviner : on la lui annonce. */
      const nextReferral: ReferralInfo | null = ref ?? null;
      if (slow) setReferral((prev) => {
        const ref = nextReferral;
        if (ref && prev) {
          if (ref.totalReferred > prev.totalReferred) {
            notify("argent", `Un filleul a rejoint le réseau (${ref.totalReferred} au total)`, { label: "Voir le parrainage", view: "parametres" });
          } else if (ref.rewardsGranted > prev.rewardsGranted) {
            notify("argent", "Prime de parrainage versée : +150 pi.", { label: "Voir le parrainage", view: "parametres" });
          }
          if (ref.milestoneReached > prev.milestoneReached) {
            const reached = ref.milestones.find((m) => m.count === ref.milestoneReached);
            if (reached) notify("progression", `Palier de parrainage atteint : ${reached.label}`, { label: "Voir le parrainage", view: "parametres" });
          }
        }
        return ref ?? prev;
      });
      if (mid) {
        setTransactions(tx);
        setTodaySummary(sum);
      }
      if (slow) {
        setCareer(car);
        // 2.0 : la vraie météo des gares, lue par la vue cabine
        setStationWeather(wx?.stations);
      }

      // notifie si un employé est parti faute de trésorerie
      if (mid) setStaff((prevStaff) => {
        prevStaff.forEach((prevS) => {
          const now = st.find((newS: Staff) => newS.id === prevS.id);
          if (!now) {
            notify("equipe", `${prevS.name || "Un employé"} a quitté la compagnie, faute de salaire`, { label: "Voir le personnel", view: "personnel" });
          } else if (now.raiseRequested && !prevS.raiseRequested) {
            // seulement au passage à « demandée », pas à chaque rafraîchissement
            notify("equipe", `${now.name || "Un employé"} demande une augmentation`, { label: "Répondre", view: "personnel" });
          }
        });
        return st;
      });

      // notifie quand le défi du jour vient d'être complété
      if (mid) setDailyChallenge((prev) => {
        if (prev && !prev.completed && dc.completed) {
          showComposter(`Défi accompli : ${dc.label}`);
          notify("progression", `Défi du jour accompli : ${dc.label}`, undefined, { silent: true });
        }
        return dc;
      });

      // notifie les succès nouvellement débloqués
      if (slow) setAchievements((prevAchievements) => {
        ach.forEach((newA: Achievement) => {
          const prev = prevAchievements.find((p) => p.id === newA.id);
          if (prev && !prev.unlocked && newA.unlocked) {
            showComposter(`Succès débloqué : ${newA.name}`);
            notify("progression", `Succès débloqué : ${newA.name}`, { label: "Voir les succès", view: "succes" }, { silent: true });
          }
        });
        return ach;
      });

      // notifie les nouveaux incidents (retards, pannes) apparus depuis le dernier rafraîchissement
      setIncidents((prevIncidents) => {
        const prevIds = new Set(prevIncidents.map((i) => i.id));
        inc.forEach((newInc: Incident) => {
          if (!prevIds.has(newInc.id) && prevIncidents.length > 0) {
            notify("incident", newInc.message, { label: "Voir la flotte", view: "trains" });
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
            notify("fret", `Livraison « ${newC.cargoType} » terminée : +${newC.reward} pi.`, { label: "Voir le fret", view: "fret" }, { silent: true });
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
            notify("rames", `Arrivée de ${newTrain.name} à ${newTrain.line.arrivalStation}, repart aussitôt`, { label: "Voir la rame", view: "trains", trainId: newTrain.id });
          }
        });
        // 2.0 : une rame qui vient de casser se fait entendre (et vibrer sur téléphone)
        const brokeNow = t.filter(
          (n: Train) => n.status === "MAINTENANCE" && !n.workshopUntil && prevTrains.some((p) => p.id === n.id && (p.status !== "MAINTENANCE" || p.workshopUntil))
        );
        if (prevTrains.length > 0 && brokeNow.length > 0) {
          playAlert();
          vibrate([90, 60, 90]);
          for (const b of brokeNow)
            notify(
              "incident",
              `${b.name} est en panne${b.brokenPart ? ` : ${(b.organs?.find((o: { id: string }) => o.id === b.brokenPart)?.label ?? "un organe").toLowerCase()} hors service` : ""}`,
              { label: "Ouvrir la fiche", view: "trains", trainId: b.id }
            );
        }
        return t;
      });
    } catch (err: any) {
      // 404 = utilisateur authentifié mais sans compagnie -> formulaire de création
      // 401 = token invalide/expiré -> déconnexion propre et retour à la connexion
      if (err?.response?.status === 404) {
        setCompany(null);
        setLoadFailed(false);
      } else if (err?.response?.status === 401) {
        logout();
      } else {
        /* 2.1.2 : serveur en erreur ou trop lent. Sans compagnie chargée, on
           proposait de fonder une compagnie, ou le squelette tournait sans
           fin : on le dit, avec un bouton pour réessayer. */
        setLoadFailed(true);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void loadAll();
      }
    }
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void loadAll({ auto: true });
    }, 10_000);
    // retour sur l'onglet : tout est remis à jour d'un coup
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (view === "carte" && trains.some((t) => !!t.line)) setMapSeen(true);
  }, [view, trains]);

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

  if (!company && loadFailed) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-[22px] mb-2">Le réseau ne répond pas</h1>
          <p className="font-body text-[14px] text-slate2 mb-5">Le serveur met trop de temps à répondre. Votre compagnie n'est pas perdue : réessayez dans un instant.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setLoadFailed(false);
                setLoading(true);
                void loadAll();
              }}
              className="px-4 py-2 bg-cobalt text-onaccent font-mono2 text-[12px] uppercase tracking-wide"
            >
              Réessayer
            </button>
            <button onClick={logout} className="px-4 py-2 border border-line font-body text-[13px] text-slate2">
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return <CreateCompanyForm onCreated={loadAll} onLogout={logout} />;
  }

  const enRoute = trains.filter((t) => t.status === "EN_ROUTE").length;

  /* 1.6 : tant que la liste « Premiers pas » est ouverte, on épargne au nouveau
     venu ce qui ne le concerne pas encore (résumé du jour vide, parrainage,
     défi du jour, pastilles « Nouveau »). */
  const firstSteps: FirstStepsInput = {
    lineCount: lines.length,
    trainCount: trains.length,
    assignedCount: trains.filter((t) => !!t.line).length,
    unlocked: new Set(achievements.filter((a) => a.unlocked).map((a) => a.id)),
    hintsSeen: company.hintsSeen ?? "",
  };
  const onboarding = firstStepsActive(firstSteps);
  const onboardingProgress = firstStepsProgress(firstSteps);
  /* 1.7 : onze rubriques d'un coup, c'était « trop compliqué ». Pendant les
     premiers pas, une rubrique n'apparaît que quand elle devient utile ; les
     autres attendent en bas du menu, avec ce qui les débloque. Un joueur
     installé (liste fermée) voit tout, comme avant. */
  const stepDone = firstStepsDone(firstSteps);
  const gradeId = career?.currentRank.id ?? 0;
  const navOpen = {
    appels: !onboarding || gradeId >= 1,
    cours: !onboarding || stepDone.fret,
    personnel: !onboarding || trains.length >= 2,
    comptes: !onboarding || stepDone.service,
    classement: !onboarding || stepDone.service,
  };
  const lockedNav = [
    !navOpen.comptes && { label: "Comptes", hint: "à la première rame en service" },
    !navOpen.classement && { label: "Classement", hint: "à la première rame en service" },
    !navOpen.personnel && { label: "Personnel", hint: "avec une deuxième rame" },
    !navOpen.cours && { label: "Cours", hint: "après une livraison de fret" },
    !navOpen.appels && { label: "Appels d'offres", hint: "au grade « Gestionnaire confirmé »" },
  ].filter(Boolean) as { label: string; hint: string }[];
  /* 2.0 : la phrase d'en-tête de chaque rubrique, tirée de la partie en cours */
  const plural = (n: number, one: string, many: string) => `${n.toLocaleString("fr-FR")} ${n > 1 ? many : one}`;
  const pageLead = ((): string | null => {
    const rolling = trains.filter((t) => t.status === "EN_ROUTE").length;
    const broken = trains.filter((t) => t.status === "MAINTENANCE" && !t.workshopUntil).length;
    const servicing = trains.filter((t) => t.workshopUntil).length;
    const worn = trains.filter((t) => t.status !== "MAINTENANCE" && t.wear >= 70).length;
    switch (view) {
      case "trains": {
        if (trains.length === 0) return "Votre dépôt est vide : achetez une première rame.";
        const head = rolling === 0 ? "Aucune rame ne roule pour l'instant" : rolling === trains.length ? `Vos ${plural(rolling, "rame roule", "rames roulent")}` : `${plural(rolling, "rame roule", "rames roulent")} sur ${trains.length}`;
        const tail = broken > 0 ? `, ${plural(broken, "attend", "attendent")} une réparation` : worn > 0 ? `, ${plural(worn, "demande", "demandent")} une révision` : servicing > 0 ? "" : ", sans incident";
        const shop = servicing > 0 ? ` ${servicing > 1 ? `${servicing} sont` : "Une est"} en révision à l'atelier.` : "";
        return head + tail + "." + shop;
      }
      case "lignes":
      case "carte": {
        if (lines.length === 0) return "Tracez une première ligne entre deux gares.";
        const rs = (network?.lines ?? []).map((m) => m.ridership).filter(Boolean) as { fill: number; left: number }[];
        const full = rs.filter((r) => r.left > 0);
        const waiting = full.reduce((a, r) => a + r.left, 0);
        const empty = rs.filter((r) => r.left === 0 && r.fill < 40).length;
        if (view === "carte") return `${plural(lines.length, "ligne", "lignes")} et ${plural(rolling, "rame en mouvement", "rames en mouvement")}, en direct.`;
        if (full.length > 0) return `${full.length > 1 ? `${full.length} lignes sont pleines et laissent` : "Une ligne est pleine et laisse"} ${plural(waiting, "voyageur", "voyageurs")} à quai.`;
        if (empty > 0) return `${empty > 1 ? `${empty} lignes roulent` : "Une ligne roule"} à moitié vide : baissez le billet ou retirez une rame.`;
        return `Vos ${plural(lines.length, "ligne est bien remplie", "lignes sont bien remplies")}.`;
      }
      case "fret":
      case "missions": {
        const open = market.length;
        const going = myContracts.filter((c) => c.status === "EN_COURS").length;
        if (open === 0 && going === 0) return "Pas de contrat pour l'instant, de nouveaux arrivent toutes les heures.";
        return [open > 0 && `${plural(open, "contrat attend", "contrats attendent")} une rame`, going > 0 && `${plural(going, "livraison est", "livraisons sont")} en route`].filter(Boolean).join(", ") + ".";
      }
      case "personnel": {
        if (staff.length === 0) return "Personne à l'effectif : un mécanicien réduit l'usure de toute la flotte.";
        const raise = staff.filter((s) => s.raiseRequested).length;
        return `${plural(staff.length, "employé", "employés")}${raise > 0 ? `, dont ${raise > 1 ? `${raise} qui demandent` : "un qui demande"} une augmentation` : ", tout le monde est content"}.`;
      }
      case "rapport":
      case "rentabilite":
      case "banque":
      case "bourse":
      case "historique":
        if (!todaySummary) return null;
        return `Aujourd'hui, ${todaySummary.net >= 0 ? "+" : "−"}${Math.abs(todaySummary.net).toLocaleString("fr-FR")} pi. net, et ${company.balance.toLocaleString("fr-FR")} pi. en caisse.`;
      case "carriere":
      case "succes":
        if (!career) return null;
        return career.nextRank ? `Vous êtes ${career.currentRank.name.toLowerCase()}. Prochain grade : ${career.nextRank.name.toLowerCase()}.` : `Vous êtes ${career.currentRank.name.toLowerCase()}, le plus haut grade.`;
      case "saison":
        return seasonLead(season);
      case "alliance":
        return allianceLead(alliance);
      case "classement":
        if (!leaderMe?.rank) return null;
        return leaderMe.rank === 1 ? "Vous êtes en tête du classement." : `Vous êtes ${leaderMe.rank}e${leaderMe.aheadName && leaderMe.gap ? `, à ${leaderMe.gap.toLocaleString("fr-FR")} pi. de ${leaderMe.aheadName}` : ""}.`;
      default:
        return null;
    }
  })();
  function goFirstStep(go: "lignes" | "catalogue" | "trains" | "fret") {
    if (go === "catalogue") {
      setView("trains");
      setShowCatalog(true);
    } else if (go === "trains") {
      setView("trains");
      setTimeout(() => document.querySelector('[data-tutorial="trains-table"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    } else {
      setView(go);
    }
  }

  /* 2.0 : les rubriques, une seule liste pour le menu d'ordinateur et le « Plus » du téléphone */
  const navGroups: NavGroup[] = [
    {
      label: "Exploitation",
      items: [
        { id: "trains", label: "Flotte", icon: <TrainMark size={16} />, count: trains.length, active: view === "trains", onClick: () => setView("trains") },
        { id: "lignes", label: "Lignes", icon: <TrackMark size={16} />, count: lines.length, active: view === "lignes", onClick: () => setView("lignes") },
        { id: "carte", label: "Carte", icon: <MapMark size={16} />, active: view === "carte", onClick: () => setView("carte"), dataTutorial: "nav-carte" },
        ...(lines.length > 0 ? [{ id: "infrastructures", label: "Infrastructures", icon: <StationMark size={16} />, active: view === "infrastructures", onClick: () => setView("infrastructures") }] : []),
      ],
    },
    {
      label: "Commerce",
      items: [
        { id: "fret", label: "Fret", icon: <CargoMark size={16} />, count: myContracts.filter((c) => c.status === "EN_COURS").length + missionCount, active: view === "fret" || view === "missions", onClick: () => setView("fret") },
        ...(navOpen.cours ? [{ id: "cours", label: "Cours", icon: <SwapMark size={16} />, active: view === "cours", onClick: () => setView("cours"), dataTutorial: "nav-cours" }] : []),
        ...(navOpen.appels ? [{ id: "appels", label: "Appels d'offres", icon: <TenderMark size={16} />, active: view === "appels", onClick: () => setView("appels") }] : []),
      ],
    },
    {
      label: "Compagnie",
      items: [
        ...(navOpen.personnel ? [{ id: "personnel", label: "Personnel", icon: <StaffMark size={16} />, count: staff.length, alert: staff.some((x) => x.raiseRequested), active: view === "personnel", onClick: () => setView("personnel") }] : []),
        ...(navOpen.comptes ? [{ id: "finances", label: "Finances", icon: <BankMark size={16} />, active: FINANCE_VIEWS.includes(view), onClick: () => setView("rapport") }] : []),
        // 2.1 : le musée, une fois ouvert en boutique
        ...(company?.unlocked?.museum ? [{ id: "musee", label: "Musée", icon: <MedalMark size={16} />, active: view === "musee", onClick: () => setView("musee") }] : []),
        // 2.1.1 (Premium) : alertes personnalisées
        ...(company?.isPremium ? [{ id: "alertes", label: "Alertes", icon: <AnnounceMark size={16} />, active: view === "alertes", onClick: () => setView("alertes") }] : []),
        { id: "carriere", label: "Progression", icon: <RankMark size={16} />, count: achievements.filter((x) => x.unlocked).length, active: view === "carriere" || view === "succes", onClick: () => setView("carriere") },
      ],
    },
    ...(navOpen.classement
      ? [
          {
            label: "Compétition",
            items: [
              { id: "saison", label: "Saison", icon: <SeasonMark size={16} />, count: season?.me?.points ? season.me.rank : undefined, active: view === "saison", onClick: () => setView("saison") },
              { id: "alliance", label: "Alliance", icon: <AllianceMark size={16} />, alert: (!alliance?.alliance && (alliance?.invites?.length ?? 0) > 0) || (!!alliance?.alliance?.founder && (alliance?.applications?.length ?? 0) > 0), count: alliance?.alliance ? alliance.members?.length : undefined, active: view === "alliance", onClick: () => setView("alliance") },
              { id: "classement", label: "Classement", icon: <TrophyMark size={16} />, count: leaderTotal, active: view === "classement", onClick: () => setView("classement"), dataTutorial: "nav-classement" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-navy-950 grid grid-cols-1 md:grid-cols-[232px_1fr] relative overflow-x-clip">
      <RailSchematic className="fixed inset-0 w-full h-full opacity-[0.10] pointer-events-none" />
      {themeTrial && <ThemeTrialBanner trial={themeTrial} onEnd={() => setThemeTrial(null)} />}
      <UpdateBanner />
      {/* 2.0 : le menu. Sur ordinateur, une colonne calme : la compagnie, la
          saison, les rubriques sans cadres autour des icônes. Sur téléphone,
          une barre d'onglets en bas de l'écran et le reste dans « Plus ». */}
      <aside className={`hidden md:flex border-r border-line flex-col relative bg-navy-950/40 backdrop-blur-[1px] sticky top-0 self-start h-screen ${themeTrial ? "pb-[52px]" : ""}`}>
        <div className="flex items-center pr-4">
          <button
            onClick={() => setEditingCompany(true)}
            className="flex-1 min-w-0 text-left pl-5 pr-2 pt-5 pb-4 hover:bg-navy-900/40 transition-colors flex items-center gap-3"
            title="Modifier la compagnie"
          >
            <CompanyBadge company={company} size={38} />
            <span className="min-w-0">
              <span className="block font-display text-[17px] leading-tight truncate">{company.name}</span>
              <span className="block text-[12.5px] text-amber font-body truncate">{career ? career.currentRank.name : "Console d'exploitation"}</span>
            </span>
          </button>
          <JournalBell className="mt-1" />
        </div>
        {season?.season && season.me && navOpen.classement && (
          <button onClick={() => setView("saison")} className="mx-5 mb-2 flex items-center gap-2 text-[12.5px] font-body text-slate2 hover:text-offwhite text-left">
            <span className="w-2 h-2 rotate-45 shrink-0" style={{ background: DIVISION_COLORS[season.me.division] }} />
            <span className="truncate">
              {season.me.rank}
              {season.me.rank === 1 ? "er" : "e"} du groupe {season.me.divisionName}
            </span>
            <span className="ml-auto font-mono2 text-amber tabular-nums">{season.me.points.toLocaleString("fr-FR")}</span>
          </button>
        )}
        {onboarding && (
          <button onClick={() => setView("trains")} className="text-left mx-5 mt-1 mb-1 border border-amber/40 bg-amber/[0.06] px-3 py-2 hover:bg-amber/10 transition-colors">
            <div className="flex items-center justify-between text-[12.5px] font-body text-amber">
              <span>Premiers pas</span>
              <span className="font-mono2">{onboardingProgress.done}/{onboardingProgress.total}</span>
            </div>
            <div className="h-[2px] bg-line mt-1.5">
              <div className="h-full bg-amber transition-all duration-700" style={{ width: `${(onboardingProgress.done / onboardingProgress.total) * 100}%` }} />
            </div>
          </button>
        )}

        <nav className="flex-1 min-h-0 overflow-y-auto pb-3" aria-label="Rubriques">
          {navGroups.map((g) => (
            <div key={g.label} className="pt-3">
              <div className="px-5 pb-1 text-[12px] font-body text-slate2/70">{g.label}</div>
              {g.items.map((it) => (
                <NavRow key={it.id} item={it} />
              ))}
            </div>
          ))}
          {lockedNav.length > 0 && (
            <div className="mx-5 mt-4 pt-3 border-t border-line/60">
              <div className="text-[12px] font-body text-slate2/60 mb-1">Bientôt</div>
              {lockedNav.map((n) => (
                <div key={n.label} className="flex items-start gap-2 py-1">
                  <LockMark size={11} className="text-slate2/50 mt-[3px] shrink-0" />
                  <div className="min-w-0">
                    <div className="font-body text-[12.5px] text-slate2/70 leading-tight">{n.label}</div>
                    <div className="font-body text-[11px] text-slate2/50 leading-tight">{n.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-line px-3 py-3 flex flex-col gap-1">
          <button
            onClick={() => setView("boutique")}
            className={`flex items-center gap-2.5 px-2.5 py-2 text-[14px] font-body border transition-colors ${view === "boutique" ? "border-amber text-amber bg-amber/10" : "border-amber/40 text-amber hover:bg-amber/10"}`}
          >
            <ShopMark size={16} />
            Boutique
          </button>
          {!install.installed && (
            <button
              onClick={async () => {
                if (install.canPrompt) await install.prompt();
                else setShowInstallGuide(true);
              }}
              className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13.5px] font-body text-slate2 hover:text-offwhite"
            >
              <InstallMark size={15} />
              Installer l'app
            </button>
          )}
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap px-2.5 pt-1 text-[12.5px] font-body text-slate2">
            <button onClick={() => setView("parametres")} className={`hover:text-offwhite ${view === "parametres" ? "text-offwhite" : ""}`}>Paramètres</button>
            <button onClick={() => setShowTutorial(true)} className="hover:text-offwhite">Aide</button>
            <button onClick={() => setShowWhatsNew(true)} title="Voir les notes de version" className="font-mono2 text-[11.5px] hover:text-cobalt">v{CURRENT_VERSION}</button>
            <a href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" title={`Suivre Réseau sur Instagram (@${INSTAGRAM.handle})`} aria-label={`Réseau sur Instagram (@${INSTAGRAM.handle})`} className="hover:text-offwhite">
              <InstagramMark size={14} />
            </a>
            <a href={DISCORD.url} target="_blank" rel="noopener noreferrer" title="Rejoindre le serveur Discord de Réseau" aria-label="Réseau sur Discord" className="hover:text-offwhite">
              <DiscordMark size={14} />
            </a>
            {isAdmin && (
              <a href="/admin" className="text-amber hover:text-offwhite">Admin</a>
            )}
            <button onClick={logout} className="ml-auto hover:text-offwhite">Quitter</button>
          </div>
        </div>
      </aside>

      {/* téléphone : en-tête court, onglets en bas, le reste dans « Plus » */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-2.5 border-b border-line bg-navy-950/95 backdrop-blur">
        <button onClick={() => setEditingCompany(true)} className="flex items-center gap-2.5 min-w-0 text-left">
          <CompanyBadge company={company} size={30} />
          <span className="min-w-0">
            <span className="block font-display text-[15px] leading-tight truncate">{company.name}</span>
            <span className="block text-[11.5px] text-amber font-body truncate">{career ? career.currentRank.name : ""}</span>
          </span>
        </button>
        <span className="ml-auto font-mono2 text-[15px] text-amber tabular-nums whitespace-nowrap">
          {Math.max(0, company.balance).toLocaleString("fr-FR")} pi.
        </span>
        <JournalBell />
      </header>
      <MobileTabBar
        tabs={[
          { id: "trains", label: "Flotte", icon: <TrainMark size={20} />, active: view === "trains", onClick: () => setView("trains") },
          { id: "lignes", label: "Lignes", icon: <TrackMark size={20} />, active: view === "lignes", onClick: () => setView("lignes") },
          { id: "carte", label: "Carte", icon: <MapMark size={20} />, active: view === "carte", onClick: () => setView("carte"), dataTutorial: "nav-carte" },
          navOpen.classement
            ? { id: "saison", label: "Saison", icon: <SeasonMark size={20} />, active: view === "saison", onClick: () => setView("saison") }
            : { id: "fret", label: "Fret", icon: <CargoMark size={20} />, active: view === "fret" || view === "missions", onClick: () => setView("fret") },
        ]}
        groups={navGroups}
        current={view}
        extra={[
          { id: "boutique", label: "Boutique", onClick: () => setView("boutique"), accent: true },
          { id: "parametres", label: "Paramètres", onClick: () => setView("parametres") },
          ...(!install.installed ? [{ id: "install", label: "Installer l'app", onClick: () => (install.canPrompt ? void install.prompt() : setShowInstallGuide(true)) }] : []),
          { id: "aide", label: "Aide", onClick: () => setShowTutorial(true) },
          { id: "notes", label: `Nouveautés de la v${CURRENT_VERSION}`, onClick: () => setShowWhatsNew(true) },
          ...(isAdmin ? [{ id: "admin", label: "Panneau admin", onClick: () => { window.location.href = "/admin"; } }] : []),
          { id: "quitter", label: "Quitter", onClick: logout },
        ]}
      />

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
            mapSeen: mapSeen || (view === "carte" && trains.some((t) => !!t.line)),
            // un prix réglé à la main, le prix auto, ou une ligne déjà au prix conseillé
            priceSet: lines.some((l) => {
              if ((l.priceRatio ?? 1) !== 1 || l.autoPrice) return true;
              const r = network?.lines.find((x) => x.lineId === l.id)?.ridership;
              return !!r && !r.estimated && Math.abs(r.idealPrice - (l.priceRatio ?? 1)) < 0.05;
            }),
          }}
          onReward={async (step) => {
            try {
              const { data } = await api.post("/company/tutorial-reward", { step });
              if (data?.amount > 0) {
                notify("argent", `Prime de stage : +${data.amount} pi.`, undefined, { silent: true });
                loadAll();
              }
            } catch {
              /* étape pas encore vue par le serveur : la prime se réclame à la prochaine étape */
            }
          }}
        />
      )}
      {showWhatsNew && !showTutorial && <WhatsNewModal onClose={dismissWhatsNew} />}
      {!showWhatsNew && !showTutorial && <AbsenceReport onNavigate={setView} company={company} onChange={loadAll} />}
      {editingCompany && (
        <EditCompanyModal company={company} onClose={() => setEditingCompany(false)} onChange={loadAll} />
      )}
      {showInstallGuide && <InstallGuide onClose={() => setShowInstallGuide(false)} />}
      {showCatalog && (
        <TrainCatalogModal buying={buyingTrain} gradeId={career?.currentRank.id ?? 0} hasLicence={!!(company as { intlLicenceAt?: string | null }).intlLicenceAt} onBuy={buyTrain} onClose={() => setShowCatalog(false)} livery={company.liveryColor} onOpenShop={(id) => { setShowCatalog(false); setShopFocus(id); setView("boutique"); }} />
      )}
      {reveals.length > 0 && (
        <PurchaseReveal
          queue={reveals}
          companyName={company.name}
          liveryColor={company.liveryColor}
          onDone={(r) => {
            markSeen(r);
            setReveals((q) => q.filter((x) => revealKey(x) !== revealKey(r)));
          }}
          onWorn={() => {
            loadAll();
            setShopKey((k) => k + 1);
          }}
        />
      )}
      {arrival && (
        <TrainArrival
          name={arrival.name}
          model={arrival.model}
          livery={arrival.livery ?? company.liveryColor}
          skin={arrival.skin}
          kicker={arrival.kicker}
          subtitle={arrival.subtitle}
          station={lines[0]?.departureStation ?? "Paris"}
          onClose={() => setArrival(null)}
          onCompose={arrival.skin ? undefined : () => {
            setComposeId(arrival.id);
            setView("trains");
            setArrival(null);
          }}
        />
      )}

      {/* Main */}
      <div className="relative min-w-0 bg-navy-950/30 backdrop-blur-[1px]">
        <div className="flex items-center justify-between px-6 py-2 border-b border-line font-mono2 text-[11px] text-slate2 uppercase tracking-wide gap-3">
          {news.length > 0 ? (
            <NewsTicker items={news} />
          ) : (
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rail-green blink-dot" />
              Réseau opérationnel
            </span>
          )}
          {network?.night?.active && (
            <span className="flex items-center gap-1.5 text-cobalt shrink-0" title="De 22 h à 6 h, les rames couchettes rapportent trois fois plus">
              <MoonMark size={12} />
              Service de nuit
            </span>
          )}
          <SplitFlap
            value={now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            size="sm"
            className="shrink-0"
          />
        </div>

        {/* La trésorerie a sa propre largeur : c'est le seul chiffre qui grandit
            vraiment, et à 1/5 de la rangée ses derniers chiffres étaient coupés
            (4 820 pi. s'affichait « 482 »). Sur téléphone, elle prend toute la
            première ligne. */}
        {/* 2.0 : la caisse et les compteurs tiennent sur une ligne ; la place va au tableau de bord */}
        <div className="border-b border-line hidden md:flex flex-wrap items-center gap-x-7 gap-y-2 px-4 md:px-8 py-3 relative">
          <div className="flex items-end gap-2 relative">
            {gain && (
              <span key={gain.key} className="gain-pop absolute -top-3 left-full ml-2 font-mono2 text-sm text-rail-green pointer-events-none whitespace-nowrap" aria-hidden="true">
                +{gain.amount} pi.
              </span>
            )}
            <SplitFlap value={String(Math.max(0, company.balance))} size="sm" className="text-amber" />
            <span className="font-mono2 text-sm text-amber pb-0.5">pi.</span>
            {todaySummary && todaySummary.net !== 0 && (
              <span className={`text-[13px] font-body ml-1.5 pb-0.5 ${todaySummary.net > 0 ? "text-rail-green" : "text-rail-red"}`}>
                {todaySummary.net > 0 ? "+" : "−"}
                {Math.abs(todaySummary.net).toLocaleString("fr-FR")} aujourd'hui
              </span>
            )}
          </div>
          <span className="text-[14px] text-slate2 font-body"><span className="text-offwhite font-semibold">{enRoute}</span> rame{enRoute > 1 ? "s" : ""} en route sur {trains.length}</span>
          <span className="text-[14px] text-slate2 font-body"><span className="text-offwhite font-semibold">{lines.length}</span> ligne{lines.length > 1 ? "s" : ""}</span>
          <span className="text-[14px] text-slate2 font-body">
            réputation{" "}
            <span className={`font-semibold ${company.reputation >= 80 ? "text-rail-green" : company.reputation >= 50 ? "text-amber" : "text-rail-red"}`}>{company.reputation} %</span>
          </span>
        </div>

        <DecisionBanner decisions={decisions} onOpen={setOpenDecision} />
        {openDecision && (
          <DecisionModal
            key={openDecision.id}
            decision={openDecision}
            onClose={() => setOpenDecision(null)}
            onDone={loadAll}
          />
        )}
        {dailyChallenge && !onboarding && (view !== "trains" || dailyChallenge.completed) && <DailyChallengeBanner challenge={dailyChallenge} onChange={loadAll} />}

        <main className={`p-4 md:p-8 pb-24 ${themeTrial ? "pb-32 md:pb-28" : ""}`}>
          {/* une rubrique réunie garde la même clé d'un onglet à l'autre : l'en-tête
              et les onglets ne sont pas recréés, le focus clavier reste en place */}
          <div key={({ missions: "fret", historique: "rentabilite", succes: "carriere" } as Record<string, string>)[view] ?? view} className="view-transition">
            <PageHeader view={view} lead={pageLead} />
            {/* 1.5 : trois rubriques en réunissent deux chacune */}
            {(view === "fret" || view === "missions") && (
              <SubTabs value={view} onChange={setView} tabs={[{ id: "fret", label: "Contrats" }, { id: "missions", label: "Donneurs d'ordre", count: missionCount }]} />
            )}
            {FINANCE_VIEWS.includes(view) && (
              <SubTabs
                value={view}
                onChange={setView}
                tabs={[
                  { id: "rapport", label: "Rapport de la semaine" },
                  { id: "rentabilite", label: "Rentabilité" },
                  { id: "banque", label: "Banque" },
                  { id: "bourse", label: "Bourse" },
                  { id: "historique", label: "Grand livre", count: transactions.length },
                ]}
              />
            )}
            {view === "rapport" && <WeeklyReportSection isPremium={company.isPremium} />}
            {view === "banque" && <BankSection balance={company.balance} onChange={loadAll} />}
            {view === "bourse" && <StockMarketSection balance={company.balance} onChange={loadAll} />}
            {view === "musee" && <MuseumSection onGoShop={() => { setShopFocus("coffret-musee"); setView("boutique"); }} />}
            {view === "alertes" && <AlertsPanel isPremium={company.isPremium} trains={trains.map((t) => ({ id: t.id, name: t.name }))} onGoPremium={() => setView("boutique")} />}
            {view === "infrastructures" && (
              <InfrastructureSection
                balance={company.balance}
                stationSizes={Object.fromEntries((network?.stations ?? []).map((st) => [st.name, { size: st.size, sizeLabel: st.sizeLabel }]))}
                onChange={loadAll}
              />
            )}
            {(view === "carriere" || view === "succes") && (
              <SubTabs value={view} onChange={setView} tabs={[{ id: "carriere", label: "Grades" }, { id: "succes", label: "Succès", count: achievements.filter((a) => a.unlocked).length }]} />
            )}
            {/* 2.1.2 : les 200 pionniers */}
            {view === "trains" && !onboarding && <PioneersBanner onOpen={() => setPioneersOpen(true)} />}
            {view === "trains" && !onboarding && <HalloweenCard onShowMap={() => setView("carte")} />}
            {view === "trains" && !onboarding && <Train200Card onShowMap={() => setView("carte")} />}
            {view === "trains" && <FirstSteps input={firstSteps} onGo={goFirstStep} onSeen={loadAll} />}
            {/* 2.1 : Premium d'essai en cours, puis la proposition de le garder */}
            {view === "trains" && company.premiumTrialUntil && (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-amber/40 bg-amber/5 px-4 py-3 mb-6">
                <span className="text-sm font-body text-offwhite">
                  <span className="text-amber">💎 Premium d'essai</span> · {trialLeft(company.premiumTrialUntil)}, jusqu'au {trialEnd(company.premiumTrialUntil)}
                </span>
                <button onClick={() => setView("parametres")} className="text-[11px] font-mono2 uppercase tracking-[0.14em] text-amber border border-amber/50 px-3 py-1.5 hover:bg-amber/10">
                  Garder le Premium
                </button>
              </div>
            )}
            {view === "trains" && !company.isPremium && company.premiumTrialEndedAt && Date.now() - new Date(company.premiumTrialEndedAt).getTime() < 14 * 86_400_000 && (
              <FirstVisitHint
                id="essai-termine"
                tag="Premium"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Votre essai Premium est terminé"
                body="Il vous a plu ? Le Premium s'achète une fois, pour toujours, et ne donne aucun bonus de revenu : seulement le confort et les outils que vous venez d'essayer."
                points={["Vue cabine en direct, veille concurrentielle, bilans de retour et rentabilité détaillée.", "Horaires par rame, alertes personnalisées, ordres de bourse et marché élargi."]}
                action={{ label: "Garder le Premium", onClick: () => setView("parametres") }}
              />
            )}
            {view === "trains" && !onboarding && (
              <FirstVisitHint
                id="discord"
                tag="Annonce"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Réseau a son serveur Discord"
                body="Retrouvez les autres compagnies, recrutez pour votre alliance et suivez la saison et le Grand Chantier en direct."
                points={[
                  "Liez votre compte dans Paramètres → « Lier mon Discord » pour recevoir vos rôles : Joueur, Premium, Chef d'alliance, Champion de saison.",
                  "Le bot du réseau : /profil, /classement et /alliance.",
                ]}
                action={{ label: "Rejoindre", href: DISCORD.url }}
              />
            )}
            {/* 2.0 : le tableau de bord montre la partie au lieu d'empiler des cases */}
            {view === "trains" && !onboarding && (
              <HomeBoard
                livery={company.liveryColor}
                trains={trains}
                lines={lines}
                network={network}
                summary={todaySummary}
                decision={decisions.find((d) => d.status === "OUVERTE") ?? null}
                challenge={dailyChallenge && !dailyChallenge.claimed ? dailyChallenge : null}
                repairCostPerPoint={company.repairCostPerPoint ?? 2}
                onOpenMap={() => setView("carte")}
                onOpenLines={() => setView("lignes")}
                onOpenDecision={() => {
                  const d = decisions.find((x) => x.status === "OUVERTE");
                  if (d) setOpenDecision(d);
                }}
                onChange={loadAll}
                season={season}
                world={world}
                onOpenSeason={() => setView("saison")}
                gazette={gazette}
                onOpenTrain={(id) => setSheetRequest(id)}
              />
            )}
            {view === "trains" && onboarding && todaySummary && <TodaySummaryCard summary={todaySummary} />}
            {view === "trains" && adsEnabled && !onboarding && <AdWatchCard onChange={loadAll} isPremium={company.isPremium || Boolean(company.adFree)} />}
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
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-amber pl-3 py-1 mb-6 font-body">
                <span className="text-[14px] text-offwhite">
                  Chantier en cours : {company.construction.label.charAt(0).toLowerCase() + company.construction.label.slice(1)}, livré à{" "}
                  <span className="font-mono2 text-amber">{new Date(company.construction.endsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                {company.queuedConstruction && (
                  <span className="text-[12.5px] text-slate2">
                    Ensuite : {company.queuedConstruction.label.charAt(0).toLowerCase() + company.queuedConstruction.label.slice(1)}, vers{" "}
                    {new Date(company.queuedConstruction.endsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            )}
            {view === "trains" && (
              <FirstVisitHint
                id="trains-de-nuit"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Les trains de nuit arrivent"
                body="La rame couchettes (dès « Chef de réseau ») ne roule que sur les grandes lignes, de 10 minutes de trajet ou plus. De 22 h à 6 h, heure de Paris, chacun de ses trajets rapporte trois fois plus."
                points={[
                  "Le jour, elle roule aussi, mais rapporte 20 % de moins qu'une rame assise.",
                  "Sur une journée, elle rapporte environ une fois et demie une rame Standard.",
                  "Paris–Nice, Paris–Toulouse, Paris–Barcelone : les longues lignes sont faites pour elle.",
                ]}
              />
            )}
            {view === "trains" && <TrainsSection trains={trains} lines={lines} incidents={incidents} company={company} staff={staff} weatherType={weather?.type} onChange={loadAll} onOpenCatalog={() => setShowCatalog(true)} composeId={composeId} onComposeHandled={clearCompose} sheetRequest={sheetRequest} onSheetHandled={clearSheet} onGoStaff={() => setView("personnel")} onGoPremium={() => setView("boutique")} onGoFreight={() => setView("fret")} />}
            {view === "trains" && !onboarding && (
              <div id="epaves">
                <WreckYard
                  balance={company.balance}
                  onChange={loadAll}
                  onCommissioned={(c) =>
                    setArrival({
                      id: c.train.id,
                      name: c.train.name,
                      model: c.train.model as Train["model"],
                      skin: c.heritage.skin,
                      livery: c.heritage.livery,
                      kicker: "Remise en service",
                      subtitle: `${c.heritage.label} ${c.heritage.serial}, ${new Date().getFullYear() - c.heritage.year} ans · billet +${Math.round((c.heritage.prestige - 1) * 100)} %`,
                    })
                  }
                />
              </div>
            )}
            {view === "trains" && referral && !onboarding && <div className="mt-10"><ReferralBanner referral={referral} /></div>}
            {/* conseils de première visite : au-dessus du contenu, pas sous une page qu'on ne fait pas défiler */}
            {view === "lignes" && lines.length > 0 && (
              <FirstVisitHint
                id="gares"
                tag="Bon à savoir"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Ce qui fait une bonne ligne"
                body="Une ligne rapporte selon ses deux gares : Paris attire plus de voyageurs que Chartres. Les colonnes Demande et Voyageurs du tableau vous disent où vous en êtes."
                points={[
                  "Correspondance : deux de vos lignes qui partent de la même gare rapportent plus, jusqu'à +12 % par gare.",
                  "Concurrence : si une autre compagnie roule sur la même liaison, la plus attractive prend des voyageurs à l'autre.",
                  "Une ligne longue paie mieux à la minute, mais une panne en route y coûte plus cher.",
                ]}
              />
            )}
            {view === "lignes" && (
              <FirstVisitHint
                id="international"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Le réseau passe la frontière"
                body="Londres, Bruxelles, Francfort, Genève, Milan et Barcelone rejoignent la carte. Une ligne qui passe la frontière rapporte bien plus par trajet, mais paie un péage au réseau étranger."
                points={[
                  "Il faut la licence internationale : grade « Baron du rail » et 6 000 pi., une fois pour toutes.",
                  "Recette ×1,6 par trajet, dont 25 % reversés en péage de sillon : net, c'est la meilleure ligne du jeu.",
                  "Les gares étrangères comptent comme les autres pour les correspondances.",
                ]}
              />
            )}
            {view === "lignes" && (
              <FirstVisitHint
                id="correspondances"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Les correspondances rapportent"
                body="Quand plusieurs de vos lignes arrivent dans la même gare, les voyageurs y changent de train sans changer de compagnie : chaque trajet qui passe par cette gare rapporte plus."
                points={[
                  "+4 % par destination au-delà de la première, jusqu'à +12 % par gare. Une ligne entre deux correspondances pleines rapporte jusqu'à +24 %.",
                  "Seules comptent les lignes où roule une rame, et deux lignes vers la même gare ne comptent qu'une fois.",
                  "Le formulaire de création vous montre la correspondance qu'une nouvelle ligne ouvrirait, et la carte les marque d'un losange.",
                  "Pendant un temps fort de saison, certaines gares attirent plus de voyageurs : c'est affiché en haut de cette page.",
                ]}
              />
            )}
            {view === "appels" && (
              <FirstVisitHint
                id="appels-offres"
                tag="Bon à savoir"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Les régions cherchent des exploitants"
                body="Chaque semaine, trois liaisons sont mises en concurrence. Proposez la subvention la plus basse possible : la moins chère l'emporte, mais une bonne réputation vous permet de demander un peu plus et de gagner quand même."
                points={[
                  "Il faut exploiter une ligne sur la liaison pour déposer une offre, et la subvention n'est versée que les heures où une de vos rames y roule.",
                  "Faites le nombre de trajets demandé pour toucher une prime d'une journée, sinon c'est une pénalité d'une demi-journée, même sans avoir roulé.",
                  "Les offres sont cachées : personne ne voit votre montant, et vous ne voyez pas celui des autres.",
                ]}
              />
            )}
            {view === "lignes" && (
              <FirstVisitHint
                id="concurrence"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Les gares ont une taille, et les lignes se disputent"
                body="Une ligne rapporte désormais selon ses deux gares : Paris attire plus de voyageurs que Chartres, et un salon ou un festival fait grimper la demande pendant quelques heures. Et si une autre compagnie roule sur la même liaison, vous vous partagez les voyageurs."
                points={[
                  "La compagnie la plus attractive prend des voyageurs aux autres : jusqu'à +40 % pour elle, −40 % pour la moins bonne.",
                  "Ce qui attire : la réputation, le nombre de rames, les rames Express et des rames en bon état.",
                  "À attractivité égale, personne ne perd rien. Une liaison que personne n'exploite reste à vous.",
                ]}
              />
            )}
            {view === "appels" && <TendersSection company={company} onChange={loadAll} onOpenLines={() => setView("lignes")} />}
            {view === "lignes" && <LinesSection lines={lines} onChange={loadAll} network={network} company={company} onOpenShop={() => setView("boutique")} />}
            {view === "fret" && (
              <FirstVisitHint
                id="fret"
                tag="Bon à savoir"
                seen={company.hintsSeen ?? ""}
                onSeen={loadAll}
                title="Le fret, pour une rame qui n'a pas de ligne"
                body="Chaque contrat dit quoi transporter, d'où, où et en combien de temps. Une locomotive de fret le charge si elle a le bon wagon, part, et la paie tombe à la livraison. Plusieurs wagons du même type portent plus ; des types différents prennent plusieurs contrats en une tournée."
                points={[
                  "Les offres expirent au bout de quelques minutes : ce qui est là maintenant ne le sera plus tout à l'heure.",
                  "Une cargaison fragile peut arriver abîmée ; une prime « risquée » paie plus pour ce risque.",
                  "Les donneurs d'ordre, dans l'onglet voisin, paient votre fidélité : plus vous livrez pour eux, plus ils paient.",
                ]}
              />
            )}
            {view === "fret" && (
              <FreightSection
                market={market}
                myContracts={myContracts}
                trains={trains}
                onChange={loadAll}
                company={company}
                onOpenCatalog={() => setShowCatalog(true)}
              />
            )}
            {view === "missions" && (
              <FirstVisitHint
                id="missions"
                tag="Bon à savoir"
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
            {view === "boutique" && <ShopSection key={shopKey} initialItem={shopFocus} onOpenMuseum={() => setView("musee")} onChange={loadAll} company={{ name: company.name, liveryColor: company.liveryColor, emblem: company.emblem, title: company.title }} grade={career?.currentRank.name} onTryTheme={setThemeTrial} />}
            {view === "rentabilite" && <ProfitabilitySection company={company} onChange={loadAll} />}
            {view === "cours" && (
              <>
                <FirstVisitHint
                  id="cours"
                tag="Bon à savoir"
                  seen={company.hintsSeen ?? ""}
                  title="Le cours des marchandises"
                  body="Chaque marchandise a un cours qui monte et descend. Achetez quand il est bas, gardez la marchandise dans votre entrepôt, revendez quand il remonte — et livrez de préférence ce que le marché recherche : une livraison paie jusqu'à un quart de plus. Garder du stock coûte des frais de garde, donc attendre a un prix."
                  points={[
                    "L'entrepôt et les places de dépôt passent par un chantier : payé à la commande, livré quelques dizaines de minutes plus tard.",
                    "Un seul chantier à la fois : l'argent ne suffit pas, il faut choisir par quoi commencer.",
                  ]}
                  onSeen={loadAll}
                />
                <MarketSection onChange={loadAll} />
                <ConstructionPanel onChange={loadAll} />
              </>
            )}
            {view === "saison" && <SeasonSection data={season} world={world} onReload={reloadSeason} companyName={company.name} onChange={loadAll} />}
            {view === "alliance" && <AllianceSection data={alliance} onReload={reloadAlliance} onChange={loadAll} />}
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
              <CareerSection career={career} onOpenShop={() => setView("boutique")} />
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
                <NetworkMap lines={lines} trains={trains} contracts={myContracts} onChange={loadAll} network={network} livery={company.liveryColor} onOpenWrecks={() => { setView("trains"); window.setTimeout(() => document.getElementById("epaves")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250); }} />
              </>
            )}
            {view === "personnel" && (
              <StaffSection staff={staff} gradeId={career?.currentRank.id ?? 0} onChange={loadAll} trains={trains} uniform={company.uniform ?? null} livery={company.liveryColor} />
            )}
            {view === "parametres" && (
              <>
                <button onClick={() => setPioneersOpen(true)} className="mb-6 px-3 py-2 border border-amber/50 text-amber font-body text-[13px] hover:bg-amber/10">
                  Les 200 pionniers : mon billet et la grande carte
                </button>
                <SettingsSection company={company} referral={referral} onChange={loadAll} onOpenShop={() => setView("boutique")} />
              </>
            )}
            {pioneersOpen && <PioneersModal onClose={closePioneers} />}
            {/* 1.7 : une bannière en pied de page, seulement sur les pages qu'on lit */}
            {adsEnabled && !company.isPremium && !company.adFree && !onboarding && BANNER_VIEWS.includes(view) && <AdBanner placement={view} />}
          </div>
        </main>
      </div>
    </div>
  );
}

const PAGE_COPY = {
  trains: { title: "Votre flotte", subtitle: "Achetez, affectez et suivez chaque rame en circulation." },
  lignes: { title: "Vos lignes", subtitle: "Tracez les trajets que vos trains emprunteront." },
  fret: { title: "Fret", subtitle: "Contrats de marchandises au comptant, et ordres des donneurs d'ordre qui paient votre fidélité." },
  missions: { title: "Fret", subtitle: "Contrats de marchandises au comptant, et ordres des donneurs d'ordre qui paient votre fidélité." },
  classement: { title: "Classement", subtitle: "Les compagnies les plus prospères du réseau." },
  historique: { title: "Finances", subtitle: "Le registre de tous les mouvements de trésorerie." },
  rentabilite: { title: "Finances", subtitle: "Ce que rapporte chaque ligne et chaque rame, sur sept jours." },
  // 1.7
  rapport: { title: "Finances", subtitle: "Le bilan de la semaine : ce qui est entré, ce qui est sorti, et d'où." },
  banque: { title: "Finances", subtitle: "Emprunter pour investir plus tôt, et rembourser heure par heure." },
  bourse: { title: "Finances", subtitle: "Les compagnies du réseau cotées entre joueurs : cours, dividendes et portefeuille." },
  infrastructures: { title: "Infrastructures", subtitle: "Gares, ateliers et caténaires : ce qui ne roule pas mais rapporte." },
  alertes: { title: "Alertes", subtitle: "Ce qui mérite qu'on vous prévienne, avec votre seuil." },
  musee: { title: "Musée", subtitle: "Vos épaves restaurées, sous les projecteurs." },
  succes: { title: "Progression", subtitle: "Votre carrière grade après grade, et les étapes franchies par la compagnie." },
  carte: { title: "Carte du réseau", subtitle: "Vos lignes et vos trains, positionnés en temps réel." },
  personnel: { title: "Personnel", subtitle: "Une équipe qui prend de l'expérience et doit suivre la taille de votre flotte." },
  parametres: { title: "Paramètres", subtitle: "Gérez votre compte." },
  // 2.0
  saison: { title: "Saison", subtitle: "Quatre semaines, un classement qui repart à zéro, face à des compagnies de votre taille." },
  alliance: { title: "Alliance", subtitle: "Jusqu'à cinq compagnies qui jouent ensemble." },
  carriere: { title: "Progression", subtitle: "Votre carrière grade après grade, et les étapes franchies par la compagnie." },
  cours: { title: "Cours du fret", subtitle: "Ce que valent les marchandises aujourd'hui, et ce que vous en faites." },
  boutique: { title: "Boutique", subtitle: "Le Pass de saison, deux extensions, des couleurs, des emblèmes, des titres. Rien qui rende plus fort, et tout s'offre." },
  appels: { title: "Appels d'offres", subtitle: "Chaque semaine, les régions cherchent une compagnie pour exploiter une liaison." },
};

export type DashboardView = keyof typeof PAGE_COPY;
const FINANCE_VIEWS: string[] = ["rapport", "rentabilite", "banque", "bourse", "historique"];
// pages de consultation où une bannière en bas ne gêne pas : ni la carte, ni la flotte, ni les formulaires
const BANNER_VIEWS: string[] = ["classement", "historique", "rentabilite", "rapport", "carriere", "succes", "appels", "cours"];

/* 1.7 : l'en-tête de page est un panneau de gare. Le pictogramme de la
   rubrique dans son carré, le nom en grand, et l'exploitant sur le côté. */
const PAGE_ICON: Partial<Record<DashboardView, (p: { size: number }) => JSX.Element>> = {
  trains: TrainMark,
  lignes: TrackMark,
  carte: MapMark,
  infrastructures: StationMark,
  fret: CargoMark,
  missions: CargoMark,
  cours: SwapMark,
  appels: TenderMark,
  personnel: StaffMark,
  rapport: BankMark,
  rentabilite: BankMark,
  banque: BankMark,
  bourse: BankMark,
  historique: BankMark,
  carriere: RankMark,
  succes: RankMark,
  classement: TrophyMark,
  saison: SeasonMark,
  alliance: AllianceMark,
  boutique: ShopMark,
  parametres: GearMark,
};

/* 2.0 : l'en-tête dit ce qui se passe. Le nom de la rubrique en petit, et en
   grand une phrase tirée de la partie en cours : combien de rames roulent,
   quelles lignes débordent, ce que la journée a rapporté. */
function PageHeader({ view, lead }: { view: DashboardView; lead?: string | null }) {
  const copy = PAGE_COPY[view];
  const Icon = PAGE_ICON[view] ?? TrainMark;
  return (
    <header className="mb-7 pb-5 border-b border-line">
      <div className="flex items-center gap-2 text-cobalt">
        <Icon size={15} />
        <h1 className="text-[14px] font-semibold font-body text-offwhite">{copy.title}</h1>
      </div>
      <p className="font-display text-[22px] md:text-[28px] leading-snug mt-1.5 max-w-3xl">{lead || copy.subtitle}</p>
      {lead && <p className="text-[13px] text-slate2 font-body mt-1 max-w-xl">{copy.subtitle}</p>}
    </header>
  );
}

/* 1.7 : le résumé du jour tient sur une ligne, comme un bandeau de gare.
   Le solde net d'abord (c'est le chiffre qu'on cherche), le reste à la suite,
   et le détail recettes / dépenses se déplie à la demande. Le choix est retenu. */

const SUMMARY_OPEN_KEY = "reseau.resume-ouvert";

function TodaySummaryCard({ summary }: { summary: TodaySummary }) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SUMMARY_OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  function toggle() {
    setOpen((v) => {
      try {
        localStorage.setItem(SUMMARY_OPEN_KEY, v ? "0" : "1");
      } catch {
        // stockage refusé : le choix vaut pour la session
      }
      return !v;
    });
  }
  const fmt = (n: number) => Math.abs(n).toLocaleString("fr-FR");
  const netUp = summary.net >= 0;

  return (
    <div className="border border-line mb-6 font-mono2">
      <button onClick={toggle} aria-expanded={open} className="w-full flex items-center gap-x-4 gap-y-1 px-4 py-2 text-left hover:bg-navy-900/40 transition-colors">
        <span className="flex items-center gap-2 shrink-0">
          <LedgerMark size={13} className="text-cobalt" />
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-slate2">Aujourd'hui</span>
        </span>
        <span className={`text-sm tabular-nums shrink-0 ${netUp ? "text-rail-green" : "text-rail-red"}`}>
          {netUp ? "+" : "−"}
          {fmt(summary.net)} pi. <span className="text-[10.5px] text-slate2">net</span>
        </span>
        <span className="hidden sm:flex items-center gap-3 text-[12px] text-slate2 tabular-nums min-w-0 truncate">
          <span>·</span>
          <span>{summary.lineTrips} trajet{summary.lineTrips > 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{summary.freightDeliveries} livraison{summary.freightDeliveries > 1 ? "s" : ""}</span>
          <span>·</span>
          <span className={summary.incidents > 0 ? "text-rail-red" : ""}>
            {summary.incidents} incident{summary.incidents > 1 ? "s" : ""}
          </span>
        </span>
        <span className="ml-auto text-[10.5px] uppercase tracking-wide text-slate2 shrink-0">
          Détails <span className={`inline-block transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>
      {open && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-t border-line text-[12px] tabular-nums">
          <span>
            <span className="text-slate2">recettes </span>
            <span className="text-rail-green">+{fmt(summary.income)} pi.</span>
          </span>
          <span>
            <span className="text-slate2">dépenses </span>
            <span className="text-rail-red">−{fmt(summary.expenses)} pi.</span>
          </span>
          {/* sur téléphone, les compteurs du bandeau passent ici */}
          <span className="sm:hidden text-slate2">
            {summary.lineTrips} trajets · {summary.freightDeliveries} livraisons ·{" "}
            <span className={summary.incidents > 0 ? "text-rail-red" : ""}>{summary.incidents} incidents</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* 1.7 : vidéos récompensées (Google AdSense). Le joueur choisit d'en regarder
   une contre des pièces ; rien d'autre dans le jeu n'est une publicité. Un
   abonné Premium ne charge même pas le script tant qu'il ne le demande pas. */
/* 2.1 : Premium d'essai */
function trialEnd(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function trialLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "se termine";
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `encore ${d} jour${d > 1 ? "s" : ""}`;
  const h = Math.max(1, Math.floor(ms / 3_600_000));
  return `encore ${h} heure${h > 1 ? "s" : ""}`;
}

function AdWatchCard({ onChange, isPremium }: { onChange: () => void; isPremium: boolean }) {
  const [status, setStatus] = useState<{ watchedToday: number; remaining: number; maxPerDay: number; rewardPerAd: number } | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "playing">("idle");
  const { showToast, showComposter } = useToast();

  useEffect(() => {
    api.get("/ads/status").then(({ data }) => setStatus(data)).catch(() => {});
    // préchargement pour les joueurs gratuits : la vidéo démarre sans attente
    if (!isPremium) loadAds();
  }, [isPremium]);

  async function watchAd() {
    if (phase !== "idle") return;
    setPhase("loading");
    try {
      const { data: start } = await api.post("/ads/start");
      const outcome = await showRewardedAd(() => setPhase("playing"));
      if (outcome === "viewed") {
        const { data } = await api.post("/ads/claim", { token: start.token });
        showComposter(`+${data.reward} pi. — merci d'avoir regardé la publicité`);
        onChange();
      } else if (outcome === "dismissed") {
        showToast("Publicité fermée avant la fin : pas de récompense cette fois", "error");
      } else if (outcome === "blocked") {
        showToast("Les publicités ne se chargent pas (bloqueur de publicité ?)", "error");
      } else {
        showToast("Aucune publicité disponible pour le moment, réessayez dans quelques minutes", "error");
      }
      const { data: newStatus } = await api.get("/ads/status");
      setStatus(newStatus);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setPhase("idle");
    }
  }

  if (!status) return null;
  // un abonné ne voit qu'une ligne discrète : la vidéo reste possible, jamais mise en avant
  if (isPremium) {
    return status.remaining > 0 ? (
      <div className="mb-6 flex items-center justify-end gap-2 text-[11.5px] font-body text-slate2">
        <span>Envie de pièces en plus ? Une vidéo facultative rapporte {status.rewardPerAd} pi.</span>
        <button onClick={watchAd} disabled={phase !== "idle"} className="font-mono2 uppercase text-[10.5px] text-cobalt hover:underline disabled:opacity-50">
          {phase === "idle" ? "Regarder" : "Chargement…"}
        </button>
      </div>
    ) : null;
  }

  return (
    <div className="border border-line mb-6 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <AnnounceMark size={15} className="text-cobalt shrink-0" />
          <span className="text-[11px] font-body text-slate2 uppercase tracking-[0.14em]">Vidéo récompensée</span>
        </div>
        <p className="text-xs text-slate2 font-body">
          +{status.rewardPerAd} pi. par vidéo regardée jusqu'au bout, jusqu'à {status.maxPerDay} par jour — {status.watchedToday}/{status.maxPerDay} aujourd'hui.
          <span className="text-slate2/70"> Le Premium n'affiche aucune publicité.</span>
        </p>
      </div>
      <button
        onClick={watchAd}
        disabled={phase !== "idle" || status.remaining === 0}
        className="text-xs font-mono2 uppercase text-cobalt border border-cobalt/40 px-3 py-2 hover:bg-cobalt/10 transition-colors disabled:opacity-50 shrink-0"
      >
        {phase === "loading" ? "Chargement…" : phase === "playing" ? "Lecture…" : status.remaining === 0 ? "Revenez demain" : `Regarder (+${status.rewardPerAd} pi.)`}
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
  emptyText,
}: {
  placeholder: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  triggerClassName?: string;
  emptyText?: string; // 2.2 : pourquoi la liste est vide (rame TGV sans LGV)
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // l'appui au doigt en cours sur une option (voir onPointerDown)
  const press = useRef<{ id: string; x: number; y: number; scroll: number } | null>(null);

  /* Place le menu sous son bouton, ou au-dessus près du bas de l'écran, et
     ne le laisse jamais déborder : sur téléphone, la barre d'onglets du bas
     et la barre de Safari mangent la fin de la liste. */
  function place(rect: DOMRect, width: number) {
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 12));
    const viewH = window.visualViewport?.height ?? window.innerHeight;
    const wanted = Math.min(240, options.length * 33 + 4);
    const below = viewH - rect.bottom - 4 - 8;
    const above = rect.top - 4 - 8;
    if (below >= wanted || below >= above) {
      return { top: rect.bottom + 4, left, width, maxH: Math.max(120, Math.min(wanted, below)) };
    }
    const maxH = Math.max(120, Math.min(wanted, above));
    return { top: Math.max(8, rect.top - 4 - maxH), left, width, maxH };
  }

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords(place(rect, Math.max(rect.width, 200)));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    /* 1.6 : un défilement ne ferme plus le menu. Cliquer une option près du
       bas de l'écran fait défiler la page (le navigateur amène le bouton en
       vue) : le menu se fermait avant que le clic n'arrive, et l'affectation
       n'était jamais envoyée. On le recale sous son bouton à la place, et on
       ne le ferme que si le bouton sort de l'écran. */
    function handleScrollOrResize(e: Event) {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      setCoords((c) => (c ? place(rect, c.width) : c));
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
          className="fixed z-[70] bg-navy-900 border border-line shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)] overflow-y-auto overscroll-contain touch-pan-y dropdown-menu-enter"
          style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: coords.maxH, WebkitOverflowScrolling: "touch" }}
        >
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate2 font-body">{emptyText ?? "Aucune option disponible"}</div>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onPointerDown={(e) => {
                // souris : la sélection part dès l'appui, rien ne peut fermer le menu entre l'appui et le clic
                if (e.pointerType === "mouse") {
                  e.preventDefault();
                  handlePick(opt.id);
                  return;
                }
                /* 2.1.x : au doigt, un appui peut être le début d'un défilement.
                   Choisir dès l'appui rendait la liste impossible à faire
                   défiler sur iPhone : le premier glissement affectait la
                   rame à la ligne sous le doigt. On attend le relâché. */
                press.current = { id: opt.id, x: e.clientX, y: e.clientY, scroll: menuRef.current?.scrollTop ?? 0 };
              }}
              onPointerUp={(e) => {
                const p = press.current;
                press.current = null;
                if (e.pointerType === "mouse" || !p || p.id !== opt.id) return;
                const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10;
                const scrolled = Math.abs((menuRef.current?.scrollTop ?? 0) - p.scroll) > 4;
                if (!moved && !scrolled) handlePick(opt.id);
              }}
              // iOS annonce ainsi qu'il prend la main pour faire défiler
              onPointerCancel={() => (press.current = null)}
              onClick={(e) => {
                // clavier (Entrée, Espace) : pas d'appui de pointeur
                if (e.detail === 0) handlePick(opt.id);
              }}
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

type SubTab<T extends string> = { id: T; label: string; count?: number };
function SubTabs<T extends string>({ value, onChange, tabs }: { value: string; onChange: (v: T) => void; tabs: SubTab<T>[] }) {
  // 1.7 : des onglets comme des voies de quai : l'onglet actif se détache du panneau
  return (
    <div role="tablist" className="flex border-b border-line mb-6 -mt-2 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`shrink-0 px-4 py-2 text-[13.5px] font-body border -mb-px transition-colors ${
            value === t.id
              ? "border-line border-b-navy-950 bg-navy-950 text-offwhite shadow-[inset_0_2px_0_rgb(var(--c-cobalt))]"
              : "border-transparent text-slate2 hover:text-offwhite"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-2 font-mono2 text-[11px] text-slate2 tabular-nums">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}



function StatCell({
  label,
  value,
  unit,
  color,
  accent,
  flap,
  className = "",
  pop,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  accent: string;
  flap?: boolean;
  className?: string;
  pop?: { amount: number; key: number } | null;
}) {
  return (
    <div className={`px-4 py-4 md:px-6 md:py-6 border-r border-line last:border-0 overflow-hidden relative min-w-0 ${className}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: accent }} />
      {pop && (
        <span key={pop.key} className="gain-pop absolute right-4 md:right-6 top-3 font-mono2 text-sm text-rail-green pointer-events-none" aria-hidden="true">
          +{pop.amount} pi.
        </span>
      )}
      {flap ? (
        <div className="flex items-end gap-2">
          {/* au-delà du million, les palettes rapetissent plutôt que de sortir du cadre */}
          <SplitFlap value={value} size={value.length >= 7 ? "md-compact" : "md"} className={color} />
          {unit && <span className={`font-mono2 text-sm md:text-base pb-1 ${color}`}>{unit}</span>}
        </div>
      ) : (
        <div key={value} className={`text-2xl md:text-4xl font-mono2 ${color} animate-flip-in`}>{value}</div>
      )}
      <div className="text-[10px] md:text-[11px] text-slate2 font-body uppercase tracking-[0.1em] md:tracking-[0.14em] mt-1 md:mt-1.5">{label}</div>
    </div>
  );
}

/* 1.6 : l'écran de fondation. C'était un cadre nu, un champ et un bouton :
   le premier écran du jeu, et celui qui « faisait brut ». Il dit maintenant ce
   qu'on va faire, laisse choisir une livrée, et propose des noms à qui n'en a pas. */
const NAME_IDEAS = [
  "Compagnie du Nord", "Rail Atlantique", "Ligne Bleue", "Express du Midi", "Transalpin",
  "Compagnie des Deux Mers", "Rail d'Armor", "Voies de l'Est", "Étoile du Sud", "Compagnie du Léman",
  "Rail Normand", "Les Trains d'Occitanie", "Grande Ceinture", "Compagnie Rhône-Méditerranée", "Rail du Couchant",
];
const pickIdeas = () => [...NAME_IDEAS].sort(() => Math.random() - 0.5).slice(0, 3);
const FOUNDING_LIVERIES = ["#c99a3e", "#4f7fa3", "#5c8a68", "#a8483a", "#8a6ba3", "#c97a3e"];

function FoundingScene({ color }: { color: string }) {
  // deux gares, une voie, une rame à la couleur choisie qui fait l'aller-retour
  return (
    <svg viewBox="0 0 320 96" className="w-full h-auto" aria-hidden="true">
      <path d="M40 60 C 110 60, 130 30, 200 30 S 270 44, 284 44" fill="none" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" />
      <path id="found-track" d="M40 60 C 110 60, 130 30, 200 30 S 270 44, 284 44" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 7" />
      <g>
        <rect x="-11" y="-4.5" width="22" height="9" rx="2.5" fill={color} />
        <rect x="3" y="-2.4" width="5" height="3" rx="0.8" fill="#0b0f19" opacity="0.7" />
        <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1">
          <mpath href="#found-track" />
        </animateMotion>
      </g>
      <rect x="34" y="54" width="12" height="12" rx="1.2" transform="rotate(45 40 60)" fill="#f8fafc" />
      <rect x="278" y="38" width="12" height="12" rx="1.2" transform="rotate(45 284 44)" fill="#f8fafc" />
      <text x="40" y="88" textAnchor="middle" className="fill-slate2" style={{ font: "10px 'Space Mono', monospace", letterSpacing: "0.12em" }}>PARIS</text>
      <text x="284" y="72" textAnchor="middle" className="fill-slate2" style={{ font: "10px 'Space Mono', monospace", letterSpacing: "0.12em" }}>LYON</text>
    </svg>
  );
}

function CreateCompanyForm({ onCreated, onLogout }: { onCreated: () => void; onLogout: () => void }) {
  const [name, setName] = useState("");
  const [livery, setLivery] = useState(FOUNDING_LIVERIES[0]);
  const [ideas, setIdeas] = useState(pickIdeas);
  const [referralCode, setReferralCode] = useState(pendingReferral);
  const [showReferral, setShowReferral] = useState(() => !!pendingReferral());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/company", { name: clean, liveryColor: livery, referralCode: referralCode.trim() || undefined });
      clearReferral();
      showToast(`Compagnie « ${clean} » fondée`);
      onCreated();
    } catch (err: any) {
      const message = err?.response?.data?.error || "Erreur";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const label = "block text-[10.5px] font-mono2 uppercase tracking-[0.18em] text-slate2 mb-2";

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 bg-navy-950 overflow-hidden">
      <RailSchematic className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" />
      <div className="relative w-full max-w-4xl grid md:grid-cols-[1.05fr_1fr] border border-line bg-navy-900/80 backdrop-blur-sm view-transition">
        {/* ce qui vous attend */}
        <div className="p-6 md:p-9 border-b md:border-b-0 md:border-r border-line flex flex-col">
          <div className="flex items-center gap-3">
            <LogoMark size={34} />
            <div>
              <div className="font-display text-lg leading-none">Réseau</div>
              <div className="font-mono2 text-[9.5px] uppercase tracking-[0.24em] text-slate2 mt-1">Compagnie ferroviaire</div>
            </div>
          </div>
          <h1 className="font-display text-3xl md:text-[40px] leading-[1.05] mt-8 md:mt-10">Fondez votre compagnie</h1>
          <p className="font-body text-[14px] text-slate2 leading-relaxed mt-3 max-w-[40ch]">
            Vous partez avec <span className="text-amber font-mono2">500 pi.</span> et un dépôt de deux places. Le reste, c'est vous qui le tracez.
          </p>
          <div className="mt-6 md:mt-8">
            <FoundingScene color={livery} />
          </div>
          <ol className="mt-5 md:mt-6 space-y-2.5">
            {[
              "Tracez une ligne entre deux gares",
              "Achetez une rame et mettez-la en service",
              "Elle roule et rapporte, même jeu fermé",
            ].map((t, i) => (
              <li key={t} className="flex items-baseline gap-3 font-body text-[13.5px] text-offwhite/90">
                <span className="font-mono2 text-[11px] text-amber w-4 shrink-0">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <p className="mt-auto pt-6 font-body text-[12px] text-slate2">Un guide vous accompagne pour les premiers gestes.</p>
        </div>

        {/* le formulaire */}
        <form onSubmit={handleSubmit} className="p-6 md:p-9 flex flex-col">
          <label htmlFor="co-name" className={label}>Nom de la compagnie</label>
          <input
            id="co-name"
            className="w-full bg-navy-950/60 border border-line px-3.5 py-3 text-[15px] font-body focus:outline-none focus:border-cobalt"
            placeholder="Ex. Compagnie du Nord"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
            required
          />
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="font-body text-[11.5px] text-slate2 mr-0.5">Idées :</span>
            {ideas.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setName(n)}
                className="font-body text-[11.5px] text-slate2 border border-line px-2 py-0.5 hover:text-offwhite hover:border-slate2 transition-colors"
              >
                {n}
              </button>
            ))}
            <button type="button" onClick={() => setIdeas(pickIdeas())} className="font-mono2 text-[12px] text-slate2 hover:text-offwhite px-1" title="D'autres idées" aria-label="D'autres idées">
              ↻
            </button>
          </div>

          <div className="mt-7">
            <span className={label}>Couleur de livrée</span>
            <div className="flex gap-2.5">
              {FOUNDING_LIVERIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setLivery(c)}
                  aria-label={`Livrée ${c}`}
                  aria-pressed={livery === c}
                  className={`w-9 h-9 border-2 transition-transform ${livery === c ? "border-offwhite scale-105" : "border-transparent hover:scale-105"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="font-body text-[11.5px] text-slate2 mt-2">Vos rames, votre nom sur la carte. Modifiable plus tard.</p>
          </div>

          {/* comme l'en-tête du jeu : c'est ce que verront les autres */}
          <div className="mt-7 border border-line border-t-[3px] px-4 py-3 flex items-center gap-3" style={{ borderTopColor: livery }}>
            <TrainMark size={20} style={{ color: livery }} className="shrink-0" />
            <div className="min-w-0">
              <div className="font-mono2 text-[9.5px] uppercase tracking-[0.2em] text-slate2">Exploitant</div>
              <div className="font-display text-lg leading-tight truncate" style={{ color: name.trim() ? livery : undefined }}>
                {name.trim() || <span className="text-slate2/60">Votre compagnie</span>}
              </div>
            </div>
          </div>

          <div className="mt-5">
            {showReferral ? (
              <div>
                <label htmlFor="co-ref" className={label}>Code de parrainage</label>
                <input
                  id="co-ref"
                  className="w-full bg-navy-950/60 border border-line px-3 py-2.5 text-sm font-mono2 uppercase tracking-[0.2em] focus:outline-none focus:border-cobalt"
                  placeholder="ABC123"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                {referralCode && <p className="text-[11.5px] text-amber font-body mt-1.5">+100 pi. de bienvenue si le code est valide</p>}
              </div>
            ) : (
              <button type="button" onClick={() => setShowReferral(true)} className="font-body text-[12.5px] text-slate2 hover:text-offwhite underline underline-offset-4 decoration-line">
                Un ami vous a donné un code ?
              </button>
            )}
          </div>

          {error && <p className="text-rail-red text-sm mt-4">{error}</p>}

          <div className="mt-auto pt-7">
            <button
              disabled={submitting || !name.trim()}
              className="w-full bg-cobalt text-onaccent font-semibold py-3 text-sm uppercase tracking-wide hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
            >
              {submitting ? "Fondation…" : "Fonder la compagnie"}
            </button>
            <button type="button" onClick={onLogout} className="block mx-auto mt-3 text-xs text-slate2 hover:text-offwhite">
              Se déconnecter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// par ordre alphabétique : à trente-huit gares, c'est le seul ordre où l'on retrouve la sienne
const STATIONS = [
  "Amiens", "Angers", "Avignon", "Bayonne", "Besançon", "Bordeaux", "Brest", "Caen",
  "Chartres", "Clermont-Ferrand", "Dijon", "Grenoble", "La Rochelle", "Le Havre", "Le Mans", "Lille",
  "Limoges", "Lyon", "Marseille", "Metz", "Montpellier", "Mulhouse", "Nancy", "Nantes",
  "Nice", "Orléans", "Paris", "Pau", "Perpignan", "Poitiers", "Reims", "Rennes",
  "Rouen", "Saint-Étienne", "Strasbourg", "Toulouse", "Tours", "Troyes",
];
// 1.6 : les gares à l'étranger, à part dans la liste (il faut la licence internationale)
const INTL_STATIONS = ["Barcelone", "Bruxelles", "Francfort", "Genève", "Londres", "Milan", "Turin", "Zurich"];
const INTL_CODE: Record<string, string> = { Barcelone: "ES", Bruxelles: "BE", Francfort: "DE", "Genève": "CH", Londres: "GB", Milan: "IT", Turin: "IT", Zurich: "CH" };
const isIntl = (s: string) => INTL_STATIONS.includes(s);

/* 1.6 : service de nuit, de 22 h à 6 h à Paris (comme le serveur) */
function isParisNight(at = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(at));
  return h >= 22 || h < 6;
}

function StationPicker({
  label,
  value,
  onChange,
  exclude,
  intlLocked,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude?: string | string[];
  intlLocked?: boolean; // pas encore de licence internationale
}) {
  const excluded = new Set(Array.isArray(exclude) ? exclude : exclude ? [exclude] : []);
  function handlePick(e: React.MouseEvent<HTMLButtonElement>, station: string) {
    onChange(station);
    const details = e.currentTarget.closest("details");
    if (details) details.open = false;
  }

  return (
    <div className="flex-1">
      {label && <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">{label}</label>}
      <details className="relative">
        <summary className="cursor-pointer select-none list-none w-full flex items-center justify-between bg-transparent border border-line px-3 py-2 text-sm hover:border-cobalt transition-colors [&::-webkit-details-marker]:hidden">
          <span className={value ? "text-offwhite" : "text-slate2"}>{value || "Choisir une gare…"}</span>
          <span className="text-[10px] text-slate2">▾</span>
        </summary>
        <div className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto bg-navy-900 border border-line shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)]">
          {STATIONS.filter((s) => !excluded.has(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => handlePick(e, s)}
              className="w-full text-left px-3 py-2 text-xs font-body text-offwhite hover:bg-cobalt/15 hover:text-cobalt transition-colors border-b border-line last:border-0"
            >
              {s}
            </button>
          ))}
          <div className="px-3 py-1.5 bg-navy-950 border-b border-line font-mono2 text-[10px] uppercase tracking-[0.14em] text-slate2">
            À l'étranger{intlLocked ? " · licence requise" : ""}
          </div>
          {INTL_STATIONS.filter((s) => !excluded.has(s) && stationVisible(s)).map((s) => (
            <button
              key={s}
              type="button"
              disabled={intlLocked}
              onClick={(e) => handlePick(e, s)}
              className="w-full text-left px-3 py-2 text-xs font-body text-offwhite hover:bg-cobalt/15 hover:text-cobalt transition-colors border-b border-line last:border-0 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-offwhite disabled:cursor-not-allowed flex items-center justify-between"
            >
              {s}
              <span className="font-mono2 text-[10px] text-slate2">{INTL_CODE[s]}</span>
            </button>
          ))}
          {/* 2.0 : l'extension Montagne */}
          <div className="px-3 py-1.5 bg-navy-950 border-b border-line font-body text-[11.5px] text-slate2">
            Montagne{hasMountain() ? "" : ", extension requise"}
          </div>
          {MOUNTAIN_STATIONS.filter((s) => !excluded.has(s)).map((s) => (
            <button
              key={s}
              type="button"
              disabled={!hasMountain()}
              onClick={(e) => handlePick(e, s)}
              className="w-full text-left px-3 py-2 text-xs font-body text-offwhite hover:bg-cobalt/15 hover:text-cobalt transition-colors border-b border-line last:border-0 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-offwhite disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function LinesSection({
  lines,
  onChange,
  network,
  company,
  onOpenShop,
}: {
  lines: Line[];
  onChange: () => void;
  network: NetworkData | null;
  company: Company;
  onOpenShop?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  // 1.7 : arrêts intermédiaires, dans l'ordre du trajet aller
  const [stops, setStops] = useState<string[]>([]);
  /* La durée n'est plus un champ : elle est déduite de l'itinéraire, comme sur la
     carte, et le serveur la recalcule de son côté. */
  const route = [departure, ...stops, arrival];
  const plan =
    departure && arrival && route.every((s) => STATION_COORDS[s])
      ? (() => {
          const km = routeKm(route);
          const minutes = routeMinutes(route);
          const demand = route.reduce((a, n) => a + (stationOf(network, n)?.demand ?? 1), 0) / route.length;
          // 1.6 : une ligne qui passe la frontière rapporte plus, péage déduit
          const intl = route.some(isIntl);
          const intlFactor = intl && network?.international ? network.international.revenueBonus * (1 - network.international.tollRate) : 1;
          // 1.7 : chaque arrêt amène 20 % de voyageurs en plus, dans la limite des places d'une rame standard
          const stopFactor = 1 + 0.2 * stops.length;
          return { km, minutes, yieldPct: lengthYieldPct(minutes), hourly: Math.round(hourlyRevenue(minutes) * demand * intlFactor * Math.min(stopFactor, 1.35)), demand, intl };
        })()
      : null;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loadLine, setLoadLine] = useState<Line | null>(null);
  const { showToast } = useToast();

  function startCreate() {
    setEditingId(null);
    setName(""); setDeparture(""); setArrival(""); setStops([]);
    setOpen((v) => !v);
  }

  function startEdit(line: Line) {
    setEditingId(line.id);
    setName(line.name ?? "");
    setDeparture(line.departureStation);
    setArrival(line.arrivalStation);
    setStops(line.stops ?? []);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch("/lines", {
          lineId: editingId,
          name: name.trim() || `${departure} — ${arrival}`,
          departureStation: departure,
          arrivalStation: arrival,
          stops,
        });
        showToast(`Ligne ${departure} → ${arrival} mise à jour`);
      } else {
        await api.post("/lines", {
          name: name.trim() || `${departure} — ${arrival}`,
          departureStation: departure,
          arrivalStation: arrival,
          stops,
        });
        showToast(`Ligne ${departure} → ${arrival} créée`);
      }
      setName(""); setDeparture(""); setArrival(""); setStops([]);
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
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-[20px]">{lines.length > 0 ? `Vos ${lines.length} ligne${lines.length > 1 ? "s" : ""}` : "Aucune ligne pour l'instant"}</h2>
        <button
          data-tutorial="btn-new-line"
          onClick={startCreate}
          className={`text-[13.5px] font-semibold px-3.5 py-2 active:scale-[0.96] transition-transform font-body ${open ? "border border-line text-slate2 hover:text-offwhite" : "bg-cobalt text-onaccent hover:bg-cobalt/90"}`}
        >
          {open ? "Annuler" : "Tracer une ligne"}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="border border-line border-t-2 border-t-cobalt p-5 mb-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-slate2 mb-1.5 font-body">
              Nom de la ligne <span className="normal-case tracking-normal text-slate2/70">(facultatif)</span>
            </label>
            {/* 1.6 : facultatif. Un champ obligatoire en tête du tout premier formulaire
                bloquait le nouveau venu avant même qu'il ait choisi ses gares. */}
            <input
              className="w-full bg-transparent border border-line px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
              placeholder={departure && arrival ? `${departure} — ${arrival}` : "Ex. Ligne du Littoral"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="flex items-end gap-2">
            <StationPicker label="Gare de départ" value={departure} onChange={setDeparture} exclude={arrival} intlLocked={!network?.international?.licence.owned} />
            <button
              type="button"
              onClick={() => { const tmp = departure; setDeparture(arrival); setArrival(tmp); setStops((st) => [...st].reverse()); }}
              title="Inverser départ et arrivée"
              className="mb-0.5 p-2 border border-line text-slate2 hover:text-cobalt hover:border-cobalt transition-colors shrink-0"
            >
              <SwapMark size={16} />
            </button>
            <StationPicker label="Gare d'arrivée" value={arrival} onChange={setArrival} exclude={departure} intlLocked={!network?.international?.licence.owned} />
          </div>

          {/* 1.7 : arrêts intermédiaires. La rame dessert chaque gare à l'aller
              puis au retour, et chaque arrêt amène sa part de voyageurs. */}
          {departure && arrival && (
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-wide text-slate2 font-body">
                  Arrêts intermédiaires <span className="normal-case tracking-normal text-slate2/70">({stops.length}/{MAX_STOPS} · +20 % de voyageurs par arrêt, 1 min à quai)</span>
                </span>
              </div>
              <ol className="border-l-2 border-line ml-1.5 pl-4 space-y-1.5">
                {stops.map((st, i) => (
                  <li key={st} className="relative flex items-center gap-2 text-sm font-body">
                    <span className="absolute -left-[22px] w-2.5 h-2.5 rounded-full bg-navy-950 border-2 border-cobalt" />
                    <span className="text-offwhite">{st}</span>
                    <span className="ml-auto flex items-center gap-1">
                      <button type="button" disabled={i === 0} onClick={() => setStops((a) => { const b = [...a]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; return b; })} className="w-6 h-6 border border-line text-slate2 hover:text-offwhite disabled:opacity-30" aria-label={`Avancer ${st}`}>↑</button>
                      <button type="button" disabled={i === stops.length - 1} onClick={() => setStops((a) => { const b = [...a]; [b[i + 1], b[i]] = [b[i], b[i + 1]]; return b; })} className="w-6 h-6 border border-line text-slate2 hover:text-offwhite disabled:opacity-30" aria-label={`Reculer ${st}`}>↓</button>
                      <button type="button" onClick={() => setStops((a) => a.filter((x) => x !== st))} className="w-6 h-6 border border-line text-slate2 hover:text-rail-red hover:border-rail-red/50" aria-label={`Retirer ${st}`}>×</button>
                    </span>
                  </li>
                ))}
                {stops.length < MAX_STOPS && (
                  <li className="relative">
                    <span className="absolute -left-[22px] top-[13px] w-2.5 h-2.5 rounded-full bg-navy-950 border-2 border-dashed border-slate2" />
                    <StationPicker
                      key={stops.length}
                      label=""
                      value=""
                      onChange={(v) => setStops((a) => [...a, v])}
                      exclude={[departure, arrival, ...stops]}
                      intlLocked={!network?.international?.licence.owned}
                    />
                  </li>
                )}
              </ol>
            </div>
          )}

          {(departure || arrival) && (
            <div className="border border-dashed border-line px-3 py-2.5 text-sm font-mono2 text-slate2">
              <div className="flex items-center gap-2 flex-wrap">
                <TrainMark size={14} className="text-cobalt shrink-0" />
                {(departure && arrival ? route : [departure || "?", arrival || "?"]).map((st, i, all) => (
                  <span key={st + i} className="flex items-center gap-2">
                    <span className={i === 0 || i === all.length - 1 ? "text-offwhite" : "text-slate2"}>{st}</span>
                    {i < all.length - 1 && <span>→</span>}
                  </span>
                ))}
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
                  {plan.intl && network?.international && (
                    <div className="text-cobalt mt-0.5 font-body">
                      Ligne internationale : recette ×{String(network.international.revenueBonus).replace(".", ",")}, dont {Math.round(network.international.tollRate * 100)} % reversés en péage de sillon (déjà déduits).
                    </div>
                  )}
                  {plan.minutes >= (network?.night?.minDuration ?? 10) && (
                    <div className="text-slate2 mt-0.5 font-body">Grande ligne : une rame couchettes peut y faire des trains de nuit.</div>
                  )}
                </div>
              )}
              {/* 1.4 : ce que valent les deux gares, et qui roule déjà sur cette liaison */}
              {plan && network && (
                <div className="text-[11px] mt-1 pl-[22px] font-body">
                  {[departure, arrival].map((n, i) => {
                    const st = stationOf(network, n);
                    return (
                      <span key={n}>
                        {i > 0 && " · "}
                        {n} : {st?.sizeLabel ?? "—"}
                        {st && st.events.length > 0 && <span className="text-amber"> ({st.events.map((e) => e.label.toLowerCase()).join(", ")})</span>}
                      </span>
                    );
                  })}
                  {" "}· demande <DemandCell demand={plan.demand} />
                  {/* 1.5 : correspondances ouvertes ou renforcées par cette ligne */}
                  {hubPreview(lines, route, network.hubRule, editingId).map((h) => (
                    <div key={h.station} className="text-cobalt mt-0.5">
                      {h.before === 1 ? "Nouvelle correspondance" : "Correspondance renforcée"} à {h.station} : {h.after} destinations, +{h.total} % sur chaque trajet qui y passe
                      {h.gain === 0 && " (plafond atteint)"}, dès qu'une rame y roule
                    </div>
                  ))}
                  {(() => {
                    const p = pairOf(network, departure, arrival);
                    const others = p ? p.companies - (p.mine ? 1 : 0) : 0;
                    return others > 0 ? (
                      <div className="text-amber mt-0.5">
                        Déjà exploitée par {others} compagnie{others > 1 ? "s" : ""} : il faudra leur prendre des voyageurs.
                      </div>
                    ) : (
                      <div className="text-rail-green mt-0.5">Aucune autre compagnie sur cette liaison.</div>
                    );
                  })()}
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

      {/* 1.6 : une page Lignes vide proposait un tableau vide sous trois encarts.
          Le nouveau venu y trouve maintenant trois tracés pour commencer. */}
      {lines.length === 0 && !open && (
        <FirstLineIdeas
          network={network}
          onPick={(a, b) => {
            setEditingId(null);
            setName("");
            setDeparture(a);
            setArrival(b);
            setOpen(true);
          }}
        />
      )}

      {loadLine && (
        <LineLoadModal
          lineId={loadLine.id}
          title={`${loadLine.departureStation} ⇄ ${loadLine.arrivalStation}`}
          isPremium={company.isPremium}
          onClose={() => setLoadLine(null)}
        />
      )}
      {/* 2.0 : une ligne se lit comme une phrase. Son tracé et son état d'abord,
          puis ce qu'on règle : le billet, et la place face aux concurrents. */}
      {lines.length > 0 && (
        <ul className="border-t border-line">
          {lines.map((l, i) => {
            const m = network?.lines.find((x) => x.lineId === l.id);
            const r = m?.ridership;
            const route = [l.departureStation, ...(l.stops ?? []), l.arrivalStation];
            const nTrains = r?.trains ?? m?.self?.trains ?? 0;
            const state = !r ? null : r.estimated ? { tone: "text-slate2", text: "Pas de rame en route" } : r.left > 0 ? { tone: "text-[#fca5a5]", text: `Pleine, ${r.left} à quai` } : r.fill < 40 ? { tone: "text-amber", text: `${r.fill} % rempli, trop de places` } : { tone: "text-rail-green", text: `${r.fill} % rempli` };
            return (
              <li key={l.id} className="py-4 border-b border-line grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1.3fr)_150px_minmax(0,1fr)_auto] items-start">
                <div className="flex gap-3.5 min-w-0">
                  <div className="pt-1"><MiniRoute stations={route} color={LINE_PALETTE[i % LINE_PALETTE.length]} width={56} /></div>
                  <div className="min-w-0">
                    <div className="text-[15.5px] font-semibold font-body">{route.join(", ")}</div>
                    <div className="text-[12.5px] text-slate2 font-body mt-0.5">
                      <span>{l.durationMinutes} min, {nTrains} rame{nTrains > 1 ? "s" : ""}</span>
                      {l.electrified && <span className="text-amber">, électrifiée</span>}
                      {l.doubleTrack && <span className="text-offwhite">, double voie</span>}
                      {hslOpen(l) && <span className="text-cobalt">, grande vitesse</span>}
                      {hslBuilding(l) && <span className="text-amber">, LGV en chantier jusqu'au {new Date(l.highSpeedAt!).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>}
                      {m?.demand !== undefined && <span>, demande <DemandCell demand={m.demand} /></span>}
                      {m?.hub && m.hub > 1.0001 && <span>, correspondance <HubCell hub={m.hub} /></span>}
                    </div>
                    {state && <div className={`text-[13px] font-body mt-1 ${state.tone}`}>{state.text}</div>}
                  </div>
                </div>
                <div>
                  <FillCell ridership={r} onDetail={() => setLoadLine(l)} premium={company.isPremium} quiet />
                </div>
                <div className="min-w-0" data-tutorial={i === 0 ? "line-price" : undefined}>
                  <PriceControl line={l} ridership={r} premium={company.isPremium} onChange={onChange} />
                  <div className="mt-2 text-[12px] font-body flex items-center gap-2">
                    <span className="text-slate2">Voyageurs</span>
                    <LineShareCell market={m} />
                  </div>
                  {m && <RivalsDetail market={m} premium={network!.isPremium} company={company} onChange={onChange} />}
                </div>
                <div className="flex lg:flex-col items-end gap-2">
                  {confirmDeleteId === l.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-[12px] text-slate2 font-body">{l.highSpeedAt ? "Supprimer la ligne et sa LGV, sans remboursement ?" : "Supprimer ?"}</span>
                      <button onClick={() => confirmDelete(l.id)} className="text-[12.5px] text-rail-red border border-rail-red/40 px-2.5 py-1 hover:bg-rail-red/10 font-body">Oui</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-[12.5px] text-slate2 border border-line px-2.5 py-1 hover:text-offwhite font-body">Non</button>
                    </span>
                  ) : (
                    <>
                      <button onClick={() => startEdit(l)} className="text-[13px] text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 font-body">Modifier</button>
                      <button onClick={() => setConfirmDeleteId(l.id)} className="text-[13px] text-slate2 hover:text-rail-red font-body">Supprimer</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ce qui pèse sur vos lignes : temps fort, licence, gares du moment */}
      {network && (
        <div className="mt-10">
          <h2 className="font-display text-[20px] mb-4">Autour de vos lignes</h2>
          {network && <SeasonBanner network={network} onOpenShop={onOpenShop} />}
          {network && <LicencePanel network={network} onChange={onChange} />}
          {network && <RushPanel network={network} premium={company.isPremium} />}
          {network && <StationEventsPanel network={network} company={company} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

/* ---------------- 1.7 : itinéraire, remplissage, prix du billet ---------------- */

type Ridership = NonNullable<LineMarket["ridership"]>;

function RouteCell({ line }: { line: Line }) {
  const stops = line.stops ?? [];
  return (
    <div>
      <div className="flex items-center gap-1.5 text-offwhite whitespace-nowrap">
        {line.departureStation}
        <span className="text-slate2 text-xs">⇄</span>
        {line.arrivalStation}
      </div>
      {(stops.length > 0 || line.electrified || line.doubleTrack || line.highSpeedAt) && (
        <div className="text-[11px] text-slate2 mt-0.5 flex items-center gap-1.5 flex-wrap">
          {stops.length > 0 && <span>via {stops.join(", ")}</span>}
          {line.electrified && (
            <span className="font-mono2 text-[10px] uppercase text-amber" title="Ligne électrifiée : trajets 10 % plus rapides, usure réduite">
              ϟ électrifiée
            </span>
          )}
          {line.doubleTrack && (
            <span className="font-mono2 text-[10px] uppercase text-offwhite" title="Double voie : trajets 7 % plus rapides, moins de retards, cadencement">
              ‖ double voie
            </span>
          )}
          {hslOpen(line) && (
            <span className="font-mono2 text-[10px] uppercase text-cobalt" title="Ligne à grande vitesse : les rames TGV y roulent presque deux fois plus vite">
              » grande vitesse
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* Jauge de remplissage : on lit d'un coup d'œil si la ligne manque de places
   (voyageurs laissés à quai) ou si les rames roulent à moitié vides. */
function FillCell({ ridership, onDetail, premium, quiet }: { ridership?: Ridership; onDetail: () => void; premium: boolean; quiet?: boolean }) {
  if (!ridership) return <span className="text-slate2 font-mono2 text-xs">—</span>;
  const { fill, carried, seats, left, estimated } = ridership;
  const tone = left > 0 ? "bg-rail-red" : fill >= 70 ? "bg-rail-green" : fill >= 40 ? "bg-amber" : "bg-slate2";
  return (
    <div className="w-32">
      <div className="flex items-baseline justify-between font-mono2 text-xs">
        <span className="text-offwhite tabular-nums">{fill} %</span>
        <span className="text-slate2 tabular-nums">{carried}/{seats}</span>
      </div>
      <div className="h-1.5 bg-navy-900 border border-line mt-1">
        <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, fill)}%` }} />
      </div>
      <div className={`text-[10.5px] font-body mt-1 leading-tight ${quiet ? "hidden" : ""}`}>
        {estimated ? (
          <span className="text-slate2">estimation, aucune rame en route</span>
        ) : left > 0 ? (
          <span className="text-rail-red">{left} voyageurs restés à quai</span>
        ) : fill < 40 ? (
          <span className="text-slate2">rames peu remplies</span>
        ) : null}
      </div>
      {/* 1.7 — Premium : la courbe des 24 dernières heures */}
      <button onClick={onDetail} className="mt-0.5 text-[10.5px] font-mono2 uppercase tracking-wide text-cobalt hover:underline flex items-center gap-1">
        {!premium && <LockMark size={9} />} 24 h
      </button>
    </div>
  );
}

const fmtPrice = (r: number) => `×${r.toFixed(2).replace(".", ",")}`;

/* Prix du billet, de ×0,6 à ×2 du tarif de base. Plus cher, chaque voyageur
   rapporte plus mais il en vient moins : le bon prix remplit juste les rames. */
function PriceControl({ line, ridership, premium, onChange }: { line: Line; ridership?: Ridership; premium: boolean; onChange: () => void }) {
  const saved = line.priceRatio ?? 1;
  const [value, setValue] = useState(saved);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  useEffect(() => setValue(saved), [saved]);

  /* 1.7 — Premium : le prix se cale tout seul sur le prix conseillé.
     2.0.3 : l'état du bouton vient de la ligne elle-même (rechargée à chaque
     action) et bascule dès le clic. Avant, il venait de la carte du réseau,
     relue toutes les minutes : le bouton restait éteint après le clic, et un
     second clic éteignait le prix automatique qu'on venait d'allumer. */
  const savedAuto = Boolean(line.autoPrice ?? ridership?.auto);
  const [autoOn, setAutoOn] = useState(savedAuto);
  useEffect(() => setAutoOn(savedAuto), [savedAuto]);
  const auto = premium && autoOn;

  async function save(next: number) {
    const v = Math.round(Math.min(2, Math.max(0.6, next)) * 20) / 20;
    const wasAuto = autoOn;
    setValue(v);
    setAutoOn(false); // un prix posé à la main reprend la main
    setSaving(true);
    try {
      await api.patch("/lines", { lineId: line.id, priceRatio: v });
      if (wasAuto && premium) showToast("Prix fixé à la main : le prix automatique est coupé sur cette ligne", "info");
      onChange();
    } catch (err: any) {
      setValue(saved);
      setAutoOn(wasAuto);
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAuto() {
    if (!premium) {
      showToast("Le prix automatique est réservé aux abonnés Premium", "error");
      return;
    }
    if (saving) return;
    const next = !autoOn;
    setAutoOn(next);
    setSaving(true);
    try {
      const { data } = await api.patch("/lines", { lineId: line.id, autoPrice: next });
      if (typeof data?.priceRatio === "number") setValue(data.priceRatio);
      onChange();
    } catch (err: any) {
      setAutoOn(!next);
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  }

  const ideal = ridership?.idealPrice;
  const gap = ideal == null ? 0 : ideal - value;
  return (
    <div className="w-40">
      <div className="flex items-center gap-1">
        <button type="button" disabled={saving || value <= 0.6} onClick={() => save(value - 0.05)} className="w-6 h-6 border border-line text-slate2 hover:text-offwhite disabled:opacity-30" aria-label="Baisser le prix">−</button>
        <input
          type="range"
          min={0.6}
          max={2}
          step={0.05}
          value={value}
          disabled={saving}
          onChange={(e) => setValue(Number(e.target.value))}
          onPointerUp={() => value !== saved && save(value)}
          onKeyUp={() => value !== saved && save(value)}
          className="flex-1 accent-[rgb(var(--c-cobalt))] h-1"
          aria-label="Prix du billet"
        />
        <button type="button" disabled={saving || value >= 2} onClick={() => save(value + 0.05)} className="w-6 h-6 border border-line text-slate2 hover:text-offwhite disabled:opacity-30" aria-label="Monter le prix">+</button>
      </div>
      <div className="flex items-baseline justify-between font-mono2 text-xs mt-1">
        <span className={value > 1 ? "text-amber" : value < 1 ? "text-cobalt" : "text-offwhite"}>{fmtPrice(value)}</span>
        {auto ? (
          <span className="text-[10.5px] text-rail-green" title="Le billet suit le prix conseillé, recalculé chaque minute : pointe, rames en ligne, concurrents, événements">
            réglé tout seul
          </span>
        ) : ideal != null && (
          <button
            type="button"
            onClick={() => save(ideal)}
            disabled={saving || Math.abs(gap) < 0.05}
            className={`text-[10.5px] disabled:cursor-default ${Math.abs(gap) < 0.05 ? "text-rail-green" : "text-slate2 hover:text-cobalt"}`}
            title={
              Math.abs(gap) < 0.05
                ? "Bon prix : il remplit juste vos rames"
                : gap > 0
                ? "Les rames sont pleines : vous pouvez monter le prix. Cliquer pour l'appliquer."
                : "Trop cher pour remplir les rames. Cliquer pour appliquer le prix conseillé."
            }
          >
            {Math.abs(gap) < 0.05 ? "✓ bon prix" : `${gap > 0 ? "↑" : "↓"} ${fmtPrice(ideal)}`}
          </button>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={auto}
        onClick={toggleAuto}
        disabled={saving && premium}
        title={premium ? "Le billet se cale sur le prix conseillé, recalculé chaque minute. Régler le prix à la main coupe le mode automatique." : "Premium : le prix se règle tout seul, en continu"}
        className={`group mt-2 w-full flex items-center gap-2 px-1.5 py-1 border text-[12px] font-body text-left transition-colors ${
          auto ? "border-rail-green/50 bg-rail-green/10 text-rail-green" : "border-line text-slate2 hover:text-offwhite hover:border-slate2"
        }`}
      >
        <span className={`shrink-0 w-7 h-3.5 border relative transition-colors ${auto ? "border-rail-green bg-rail-green/30" : "border-slate2/60"}`}>
          <span className={`absolute top-[2px] w-2 h-2 transition-all duration-150 ${auto ? "left-[15px] bg-rail-green" : "left-[2px] bg-slate2"}`} />
        </span>
        <span className="flex-1">Prix auto</span>
        {!premium ? <LockMark size={10} /> : <span className="text-[10.5px] font-mono2">{auto ? "oui" : "non"}</span>}
      </button>
    </div>
  );
}

/* ---------------- 1.7 : composition des rames ---------------- */

// doit rester aligné sur ridership.service.ts
const MODEL_SEATS: Record<string, number> = { STANDARD: 400, EXPRESS: 400, FRET_LOURD: 200, COUCHETTES: 250, NUIT_EUROPE: 200, VAPEUR: 300, LUXE: 120, CREMAILLERE: 220, TGV: 500 };
const CAR_TYPES: { id: string; label: string; short: string; seats: number; first: boolean; price: number; unique?: boolean; blurb: string }[] = [
  { id: "SECONDE", label: "Voiture de 2de classe", short: "2", seats: 100, first: false, price: 150, blurb: "+100 places. Pour les lignes où des voyageurs restent à quai." },
  { id: "PREMIERE", label: "Voiture de 1re classe", short: "1", seats: 60, first: true, price: 300, blurb: "+60 places payées 1,8 fois le billet. Rentable sur les lignes chargées." },
  { id: "BAR", label: "Voiture-bar", short: "B", seats: 0, first: false, price: 250, unique: true, blurb: "+8 % de recette par trajet. Une seule par rame." },
];
const MAX_CARS = 3;
const CAR_SLOWDOWN = 0.03;

function seatsOf(model: string, cars: string[]) {
  const second = (MODEL_SEATS[model] ?? 400) + cars.reduce((n, c) => n + (c === "SECONDE" ? 100 : 0), 0);
  const first = cars.filter((c) => c === "PREMIERE").length * 60;
  return { second, first, total: second + first };
}

/* Petit schéma de la rame : la motrice, puis une case par voiture. */
function ConsistMini({ model, cars }: { model: string; cars: string[] }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-hidden>
      <span className={`h-2 w-3.5 rounded-l-[3px] ${model === "EXPRESS" ? "bg-amber" : "bg-cobalt"}`} />
      <span className="h-2 w-3 bg-slate2/70" />
      {cars.map((c, i) => (
        <span key={i} className={`h-2 w-3 ${c === "PREMIERE" ? "bg-amber/80" : c === "BAR" ? "bg-rail-green/80" : "bg-slate2/70"}`} />
      ))}
    </span>
  );
}

function CompositionModal({ train, balance, livery, onClose, onChange }: { train: Train; balance: number; livery: string | null; onClose: () => void; onChange: () => void }) {
  const cars = train.cars ?? [];
  const seats = seatsOf(train.model, cars);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function change(car: string, action: "add" | "remove") {
    if (busy) return;
    setBusy(car + action);
    try {
      await api.post("/trains/cars", { trainId: train.id, car, action });
      const def = CAR_TYPES.find((c) => c.id === car)!;
      showToast(action === "add" ? `${def.label} attelée à ${train.name}` : `${def.label} dételée, ${Math.floor(def.price / 2)} pi. récupérées`);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  const fill = train.lastSeats ? Math.round(((train.lastPassengers ?? 0) / train.lastSeats) * 100) : null;
  const modelName = modelLabel(train.model);

  /* dans <body> : la page est animée (transform), ce qui décalerait une fenêtre « fixed » */
  return createPortal(
    <div data-modal className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-navy-900 border border-line border-t-[3px] border-t-cobalt" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Composition de ${train.name}`}>
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-line">
          <div>
            <div className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-slate2">Composition · {modelName}</div>
            <h3 className="font-display text-xl leading-tight">{train.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate2 hover:text-offwhite text-lg leading-none px-1" aria-label="Fermer">×</button>
        </div>

        {/* 2.0 : la rame à quai ; la voiture attelée arrive et s'accroche */}
        <div className="border-b border-line">
          <TrainStage model={train.model} cars={cars} maxCars={MAX_CARS} livery={livery ?? "#38bdf8"} station={train.line?.departureStation ?? "Dépôt"} />
          {cars.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 pt-1 bg-navy-950">
              {cars.map((c, i) => {
                const def = CAR_TYPES.find((d) => d.id === c)!;
                return (
                  <button
                    key={i}
                    onClick={() => change(c, "remove")}
                    disabled={!!busy}
                    className="text-[12.5px] font-body text-slate2 border border-line px-2 py-1 hover:text-rail-red hover:border-rail-red/60 disabled:opacity-40"
                    title={`Dételer (${Math.floor(def.price / 2)} pi. récupérées)`}
                  >
                    Dételer la {c === "BAR" ? "voiture-bar" : c === "PREMIERE" ? "1re classe" : "2de classe"} n° {i + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 border-b border-line text-center">
          <div className="py-3 border-r border-line">
            <div className="font-mono2 text-lg tabular-nums">{seats.total}</div>
            <div className="text-[10.5px] uppercase tracking-wide text-slate2 font-body">places{seats.first ? ` · ${seats.first} en 1re` : ""}</div>
          </div>
          <div className="py-3 border-r border-line">
            <div className="font-mono2 text-lg tabular-nums">{fill == null ? "—" : `${fill} %`}</div>
            <div className="text-[10.5px] uppercase tracking-wide text-slate2 font-body">remplissage</div>
          </div>
          <div className="py-3">
            <div className="font-mono2 text-lg tabular-nums">{cars.length ? `−${Math.round(CAR_SLOWDOWN * cars.length * 100)} %` : "—"}</div>
            <div className="text-[10.5px] uppercase tracking-wide text-slate2 font-body">vitesse</div>
          </div>
        </div>

        {train.model === "TGV" ? (
          // 2.2 : une rame articulée : rien ne s'y attelle
          <p className="p-5 text-[13px] text-slate2 font-body">Une rame TGV est indéformable : ses {seats.total} places sont celles de ses voitures, on n'y attelle rien.</p>
        ) : (
        <div className="p-5 space-y-2">
          {CAR_TYPES.map((c) => {
            const full = cars.length >= MAX_CARS;
            const dup = c.unique && cars.includes(c.id);
            const poor = balance < c.price;
            return (
              <div key={c.id} className="flex items-center gap-3 border border-line px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-body text-offwhite">{c.label}</div>
                  <div className="text-[11.5px] text-slate2 font-body">{c.blurb}</div>
                </div>
                <button
                  onClick={() => change(c.id, "add")}
                  disabled={!!busy || full || dup || poor}
                  title={full ? `${MAX_CARS} voitures au plus` : dup ? "Une seule par rame" : poor ? "Trésorerie insuffisante" : undefined}
                  className="shrink-0 text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-2.5 py-1.5 hover:bg-cobalt/10 disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  Atteler · {c.price} pi.
                </button>
              </div>
            );
          })}
          <p className="text-[11px] text-slate2 font-body pt-1">
            Chaque voiture ralentit la rame de {Math.round(CAR_SLOWDOWN * 100)} %. Une voiture dételée rend la moitié de son prix.
          </p>
        </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function TrainsSection({
  trains,
  lines,
  incidents,
  company,
  staff,
  weatherType,
  onChange,
  onOpenCatalog,
  composeId,
  onComposeHandled,
  onGoStaff,
  onGoPremium,
  onGoFreight,
  sheetRequest,
  onSheetHandled,
}: {
  onGoFreight?: () => void;
  sheetRequest?: string | null;
  onSheetHandled?: () => void;
  onGoStaff?: () => void;
  onGoPremium?: () => void;
  composeId?: string | null;
  onComposeHandled?: () => void;
  trains: Train[];
  lines: Line[];
  incidents: Incident[];
  company: Company;
  staff: Staff[];
  weatherType?: string;
  onChange: () => void;
  onOpenCatalog: () => void;
}) {
  // vue cabine (1.4) : la rame suivie, relue à chaque rafraîchissement du tableau de bord
  const [cabId, setCabId] = useState<string | null>(null);
  const cabTrain = cabId ? trains.find((x) => x.id === cabId) ?? null : null;
  const [compoId, setCompoId] = useState<string | null>(null);
  const compoTrain = compoId ? trains.find((x) => x.id === compoId) ?? null : null;
  // 2.0 : la fiche atelier
  const [sheetId, setSheetId] = useState<string | null>(null);
  const sheetTrain = sheetId ? trains.find((x) => x.id === sheetId) ?? null : null;
  useEffect(() => {
    if (sheetRequest && trains.some((x) => x.id === sheetRequest)) {
      setSheetId(sheetRequest);
      onSheetHandled?.();
    }
  }, [sheetRequest, trains, onSheetHandled]);
  // 2.0 : « Ajouter des voitures » depuis l'arrivée d'une rame neuve
  useEffect(() => {
    if (composeId && trains.some((x) => x.id === composeId)) {
      setCompoId(composeId);
      onComposeHandled?.();
    }
  }, [composeId, trains, onComposeHandled]);
  const [expanding, setExpanding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { showToast, showComposter } = useToast();
  /* Le prix vient du serveur : avec la couverture des chefs de dépôt, il dépend
     de la taille de la flotte et du niveau de chacun. Repli sur l'ancien calcul
     tant que le serveur ne l'envoie pas. */
  const repairCostPerPoint =
    company.repairCostPerPoint ?? (staff.some((s) => s.role === "CHEF_DEPOT") ? 1 : 2);

  const atCapacity = trains.length >= company.maxTrains;
  /* Le barème géométrique vit côté serveur : le recopier ici, c'est prendre le
     risque que les deux divergent après un réglage d'équilibrage. */
  const expandCost = company.nextDepotCost ?? company.maxTrains * 200;

  async function expandFleet() {
    setExpanding(true);
    try {
      const { data } = await api.post("/company/expand-fleet");
      showToast(
        data?.queued
          ? "Agrandissement mis en file : il démarrera à la fin du chantier en cours"
          : `Chantier lancé — la ${company.maxTrains + 1}e place sera livrée dans ${formatBuildHours(
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

  const [repairing, setRepairing] = useState<string | null>(null);
  async function repair(trainId: string, preventive = false) {
    // un double clic envoyait deux réparations : la seconde revenait en 409
    if (repairing) return;
    setRepairing(trainId);
    try {
      await api.post("/trains/repair", { trainId });
      showComposter(preventive ? "La rame part à l'atelier pour sa révision" : "Rame réparée et remise en service");
      if (preventive) playChime();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors de la réparation", "error");
    } finally {
      setRepairing(null);
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
      {cabTrain && cabTrain.line && (
        <CabView
          train={cabTrain}
          weatherType={weatherType}
          livery={company.liveryColor}
          skin={company.cabSkin ?? null}
          stationSkin={company.stationSkin ?? null}
          others={trains}
          yards={company.yards ?? []}
          company={company}
          onClose={() => setCabId(null)}
        />
      )}
      {sheetTrain && (
        <TrainSheet
          train={sheetTrain}
          trains={trains}
          balance={company.balance}
          isPremium={company.isPremium}
          plateStyles={company.unlocked?.trainPlates ?? []}
          costPerPoint={repairCostPerPoint}
          crew={staff.filter((s) => s.role === "CONTROLEUR" || s.role === "CONDUCTEUR").map((s) => ({ id: s.id, name: s.name ?? "Employé", role: s.role, level: s.level, trainId: s.trainId ?? null }))}
          onClose={() => setSheetId(null)}
          onChange={onChange}
          onGoStaff={() => { setSheetId(null); onGoStaff?.(); }}
          onGoPremium={() => { setSheetId(null); onGoPremium?.(); }}
        />
      )}
      {compoTrain &&
        (isFreightLoco(compoTrain.model) ? (
          <FreightComposition train={compoTrain} balance={company.balance} livery={company.liveryColor} onClose={() => setCompoId(null)} onChange={onChange} />
        ) : (
          <CompositionModal train={compoTrain} balance={company.balance} livery={company.isPremium ? company.liveryColor : null} onClose={() => setCompoId(null)} onChange={onChange} />
        ))}
      {/* 1.6 : la vue cabine s'installe en tête de la flotte (Premium) */}
      <LiveCab
        trains={trains as unknown as CabTrain[]}
        isPremium={company.isPremium}
        livery={company.liveryColor}
        skin={company.cabSkin ?? null}
        weatherType={weatherType}
        hintsSeen={company.hintsSeen ?? ""}
        onOpen={(id) => setCabId(id)}
        onSeen={onChange}
      />
      {/* 2.0 : la flotte se lit rame par rame, comme les lignes */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-[20px]">Vos {trains.length} rame{trains.length > 1 ? "s" : ""}</h2>
          <p className="text-[12.5px] text-slate2 font-body mt-0.5">
            {trains.length} place{trains.length > 1 ? "s" : ""} prise{trains.length > 1 ? "s" : ""} sur {company.maxTrains} au dépôt
            {company.upkeepPerHour ? (
              <span title="L'entretien croît avec le carré de votre parc : chaque rame supplémentaire coûte plus cher que la précédente.">
                , entretien {company.upkeepPerHour} pi. par heure
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {atCapacity && (
            <button
              onClick={expandFleet}
              /* Un seul chantier à la fois : mieux vaut griser le bouton que
                 laisser le joueur découvrir la règle par un message d'erreur. */
              disabled={expanding || (Boolean(company.construction) && !company.canQueue)}
              className="text-[13px] text-amber border border-amber/50 px-3 py-2 hover:bg-amber/10 transition-colors disabled:opacity-50 font-body"
            >
              {expanding
                ? "Chantier…"
                : company.construction && company.canQueue
                ? `Mettre en file l'agrandissement, ${expandCost} pi.`
                : company.construction
                ? company.queuedConstruction
                  ? "Chantier en cours, file pleine"
                  : "Chantier déjà en cours"
                : `Agrandir le dépôt, ${expandCost} pi. (${formatBuildHours(company.nextDepotHours ?? 0.5)})`}
            </button>
          )}
          <button
            onClick={onOpenCatalog}
            disabled={atCapacity}
            className="text-[13.5px] font-semibold font-body bg-cobalt text-onaccent px-3.5 py-2 hover:bg-cobalt/90 active:scale-[0.96] transition-transform disabled:opacity-40 disabled:active:scale-100"
          >
            {atCapacity ? "Dépôt complet" : "Acheter une rame"}
          </button>
        </div>
      </div>

      {trains.length === 0 && (
        <div className="flex flex-col items-center gap-2 text-slate2 py-10 border-y border-line">
          <TrainMark size={18} className="opacity-40" />
          <span className="text-sm font-body">Le dépôt est vide : achetez votre première rame.</span>
        </div>
      )}
      <ul className="border-t border-line">
        {trains.map((t) => {
          const inWorkshop = Boolean(t.workshopUntil);
          const broken = !inWorkshop && (t.status === "MAINTENANCE" || t.wear >= 100);
          const cost = Math.ceil(t.wear * repairCostPerPoint);
          const serviceCost = Math.ceil(t.wear * repairCostPerPoint * 0.6);
          const from = t.line ? (t.direction === 1 ? t.line.arrivalStation : t.line.departureStation) : "";
          const to = t.line ? (t.direction === 1 ? t.line.departureStation : t.line.arrivalStation) : "";
          const stops = t.line?.stops ?? [];
          return (
            <li key={t.id} className={`relative py-3.5 border-b border-line grid gap-x-6 gap-y-2.5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_200px_auto] items-center ${broken ? "bg-rail-red/5" : ""}`}>
              {/* la rame : nom, modèle, composition */}
              <div className="min-w-0">
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    className="bg-transparent border border-cobalt px-2 py-1 text-sm w-36 focus:outline-none"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => submitRename(t.id)}
                    onKeyDown={(e) => e.key === "Enter" && submitRename(t.id)}
                  />
                ) : (
                  <button
                    onClick={() => { setRenamingId(t.id); setRenameValue(t.name); }}
                    className="text-[15.5px] font-semibold font-body hover:text-cobalt transition-colors text-left"
                    title="Renommer"
                  >
                    {t.name}
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[12.5px] font-body text-slate2">
                  {t.heritage ? (
                    <span title={t.heritage.history} style={{ color: RARITY_COLOR[t.heritage.rarity] }}>
                      Collection · {t.heritage.serial} · billet +{Math.round((t.heritage.prestige - 1) * 100)} %
                    </span>
                  ) : (
                    <span className={t.model === "STANDARD" ? "" : "text-amber"}>{modelLabel(t.model)}</span>
                  )}
                  {t.model === "COUCHETTES" && (
                    <span className={`inline-flex items-center gap-1 ${isParisNight() ? "text-cobalt" : ""}`} title="Recette ×3 de 22 h à 6 h (heure de Paris), ×0,8 le jour">
                      <MoonMark size={11} />
                      {isParisNight() ? "nuit ×3" : "jour ×0,8"}
                    </span>
                  )}
                  {t.model === "NUIT_EUROPE" && (
                    <span className={`inline-flex items-center gap-1 ${isParisNight() ? "text-cobalt" : ""}`} title="Recette ×3,9 et péage de nuit à moitié prix de 22 h à 6 h (heure de Paris), ×0,6 le jour">
                      <MoonMark size={11} />
                      {isParisNight() ? "nuit ×3,9" : "jour ×0,6"}
                    </span>
                  )}
                  {/* 1.7 : composition de la rame */}
                  <button onClick={() => setCompoId(t.id)} className="flex items-center gap-1.5 whitespace-nowrap hover:text-cobalt transition-colors" title={isFreightLoco(t.model) ? "Composition : atteler ou dételer des wagons" : "Composition : ajouter ou retirer des voitures"}>
                    <span className="inline-block w-[92px]">
                      <TrainPicture model={t.model} skin={t.heritage?.skin} livery={t.heritage?.livery ?? company.liveryColor} cars={t.cars ?? []} firstLivery={company.isPremium && !t.heritage} height={30} track={false} fit={false} align="right" label={`Composition de ${t.name}`} />
                    </span>
                    {isFreightLoco(t.model)
                      ? `${(t.cars ?? []).filter((c) => c.startsWith("W_")).length}/${freightModel(t.model)?.maxWagons ?? 0} wagons`
                      : `${seatsOf(t.model, t.cars ?? []).total} places`}
                  </button>
                  {(t.crew?.length ?? 0) > 0 && (
                    <button onClick={() => setSheetId(t.id)} className="whitespace-nowrap hover:text-cobalt" title={t.crew!.map((c) => `${c.role === "CONTROLEUR" ? "Contrôleur" : "Conducteur"} : ${c.name}`).join(", ")}>
                      {t.crew!.length === 2 ? "équipage complet" : t.crew![0].role === "CONTROLEUR" ? "contrôleur à bord" : "conducteur à bord"}
                    </button>
                  )}
                </div>
              </div>

              {/* ce qu'elle fait */}
              <div className="min-w-0 font-body">
                {inWorkshop ? (
                  <div className="text-[14px] text-cobalt flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cobalt blink-dot" />
                    En révision à l'atelier, sortie à {hhmm(t.workshopUntil!)}
                  </div>
                ) : broken ? (
                  <>
                    <div className="text-[14px] text-[#fca5a5] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rail-red blink-dot" />
                      {t.brokenPart ? `${t.organs?.find((o) => o.id === t.brokenPart)?.label ?? "Organe"} hors service` : "En panne"}
                      {t.line ? ` sur ${t.line.departureStation} – ${t.line.arrivalStation}` : ""}
                    </div>
                    {t.brokenPart && (
                      <div className="text-[12.5px] text-slate2 mt-0.5 pl-3.5">
                        {t.partsEta
                          ? `${PART_LABEL[t.brokenPart]} en route, livrée à ${hhmm(t.partsEta)} (dans ${minutesLeft(t.partsEta)} min)`
                          : `Il faut ${PART_NEED[t.brokenPart] ?? "la pièce"}`}
                      </div>
                    )}
                  </>
                ) : t.line ? (
                  <>
                    <div className="text-[14px] flex items-center gap-2 flex-wrap">
                      <span className={`w-1.5 h-1.5 rounded-full ${t.status === "EN_ROUTE" && t.departedAt ? "bg-rail-green blink-dot" : "bg-slate2"}`} />
                      <span>
                        {/* 2.1.1 (Premium) : hors de ses horaires, la rame attend au terminus */}
                        {t.status === "EN_ROUTE" && !t.departedAt && t.serviceFrom != null ? `Garée jusqu'à ${t.serviceFrom} h, repartira vers ` : t.status === "EN_ROUTE" ? "Roule vers " : "À quai, part vers "}
                        <span className="font-semibold">{to}</span>
                        <span className="text-slate2"> depuis {from}{stops.length > 0 ? `, via ${(t.direction === 1 ? [...stops].reverse() : stops).join(", ")}` : ""}</span>
                      </span>
                    </div>
                    {t.lastSeats ? (
                      <div className="text-[12.5px] text-slate2 mt-0.5 pl-3.5" title="Voyageurs au dernier trajet / places">
                        Dernier trajet : <span className="font-mono2 text-offwhite">{t.lastPassengers ?? 0}</span> voyageurs pour {t.lastSeats} places
                      </div>
                    ) : null}
                  </>
                ) : t.status === "IDLE" ? (
                  <div className="text-[14px] text-slate2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate2" />
                    {isFreightLoco(t.model) ? ((t.cars ?? []).some((c) => c.startsWith("W_")) ? "Au dépôt, prête pour le fret" : "Au dépôt, sans wagon") : "Au dépôt, sans ligne"}
                  </div>
                ) : (
                  <div className="text-[14px] text-amber flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                    En tournée de fret, {Math.round(t.progress ?? 0)} %
                  </div>
                )}
              </div>

              {/* l'usure */}
              <div className="flex items-center gap-3">
                <button onClick={() => setSheetId(t.id)} className="flex items-center gap-2 group" title="Ouvrir l'atelier de la rame">
                  <WearGauge value={t.wear} />
                </button>
                <div className="flex flex-col items-start gap-0.5">
                  {/* Révision préventive : à l'atelier, au tarif réduit, sans pièce à commander. */}
                  {t.wear > 0 && t.wear < 100 && t.status !== "MAINTENANCE" && (
                    <button
                      onClick={() => repair(t.id, true)}
                      disabled={repairing === t.id || company.balance < serviceCost || (t.status === "EN_ROUTE" && !t.line)}
                      title={company.balance < serviceCost ? "Trésorerie insuffisante" : "La rame passe quelques minutes à l'atelier, au tarif réduit"}
                      className={`whitespace-nowrap text-[12.5px] font-body transition-colors disabled:opacity-40 ${t.wear >= 70 ? "text-amber hover:underline" : "text-slate2 hover:text-amber"}`}
                    >
                      {repairing === t.id ? "Révision…" : `Réviser, ${serviceCost} pi.`}
                    </button>
                  )}
                  <button onClick={() => setSheetId(t.id)} className="text-[12.5px] font-body text-slate2 hover:text-cobalt whitespace-nowrap" title={t.serviceAt ? `Révision programmée à ${t.serviceAt} %` : "Ouvrir l'atelier de la rame"}>
                    Atelier{t.serviceAt ? ` · auto ${t.serviceAt} %` : ""}
                  </button>
                </div>
              </div>

              {/* les actions */}
              <div className="flex items-center gap-2 lg:justify-end">
                {inWorkshop ? null : broken ? (
                  t.partsEta ? (
                    <button onClick={() => setSheetId(t.id)} className="text-[13px] font-body text-amber border border-amber/50 px-3 py-1.5 hover:bg-amber/10">
                      Pièce en route
                    </button>
                  ) : t.brokenPart ? (
                    <button onClick={() => setSheetId(t.id)} className="text-[13px] font-semibold font-body bg-rail-red text-white px-3 py-1.5 hover:bg-rail-red/90">
                      Réparer…
                    </button>
                  ) : (
                    <button onClick={() => repair(t.id)} className="text-[13px] font-semibold font-body bg-rail-red text-white px-3 py-1.5 hover:bg-rail-red/90">
                      Réparer, {cost} pi.
                    </button>
                  )
                ) : t.line ? (
                  <>
                    <button onClick={() => setCabId(t.id)} className="text-[13px] font-body text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10" title="Suivre cette rame en direct">
                      Vue cabine
                    </button>
                    <button onClick={() => release(t.id)} className="text-[13px] font-body text-slate2 hover:text-rail-red px-1">
                      Retirer
                    </button>
                  </>
                ) : t.status === "IDLE" && isFreightLoco(t.model) ? (
                  /* 2.1 : une locomotive de fret ne va pas sur une ligne voyageurs */
                  <span className="flex items-center gap-2">
                    <button onClick={() => setCompoId(t.id)} className="text-[13px] font-body text-amber border border-amber/40 px-3 py-1.5 hover:bg-amber/10">
                      Wagons
                    </button>
                    {onGoFreight && (
                      <button onClick={onGoFreight} className="text-[13px] font-body text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10">
                        Livrer du fret
                      </button>
                    )}
                  </span>
                ) : t.status === "IDLE" ? (
                  <span data-tutorial="btn-assign" className="inline-block">
                  <AssignDropdown
                    placeholder="Affecter à une ligne…"
                    options={lines
                      // 1.6 : une rame couchettes ne fait que les grandes lignes
                      .filter((l) => (t.model !== "COUCHETTES" || l.durationMinutes >= 10) && (t.model !== "LUXE" || l.durationMinutes >= 12))
                      // 2.1.1 : le train de nuit international passe une frontière
                      .filter((l) => t.model !== "NUIT_EUROPE" || (l.durationMinutes >= 10 && [l.departureStation, ...(l.stops ?? []), l.arrivalStation].some((s) => INTL_STATIONS.includes(s))))
                      // 2.2 : la rame TGV ne roule que sur une LGV ouverte
                      .filter((l) => t.model !== "TGV" || hslOpen(l))
                      .map((l) => ({ id: l.id, label: `${l.departureStation} → ${l.arrivalStation}${hslOpen(l) ? " · LGV" : ""}` }))}
                    onSelect={(lineId) => assign(t.id, lineId)}
                    emptyText={t.model === "TGV" ? "Une rame TGV ne roule que sur une LGV ouverte. Construisez-en une dans Infrastructures." : undefined}
                  />
                  </span>
                ) : null}
              </div>

              {/* l'avancement du trajet, en filet sous la rame */}
              {t.line && !broken && !inWorkshop && (
                <span className="absolute left-0 bottom-[-1px] h-[2px] bg-rail-green/70 transition-all duration-700 ease-out" style={{ width: `${t.progress}%` }} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ul>

      {/* 2.0 : les pièces détachées */}
      {trains.length > 0 && <PartsStore balance={company.balance} onChange={onChange} />}

      {incidents.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-[20px] mb-3">Journal d'incidents</h2>
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

/* 2.1 : le fret se livre avec une locomotive et ses wagons.
   On choisit la locomotive, puis on compose sa tournée : un contrat par
   type de wagon attelé. Chaque ligne du marché dit si la locomotive
   choisie peut le prendre, avec quelle charge, et ce qu'il rapportera. */
function FreightSection({
  market,
  myContracts,
  trains,
  onChange,
  company,
  onOpenCatalog,
}: {
  market: Contract[];
  myContracts: Contract[];
  trains: Train[];
  onChange: () => void;
  company: Company;
  onOpenCatalog: () => void;
}) {
  const { showToast } = useToast();
  const [insuredSelections, setInsuredSelections] = useState<Record<string, boolean>>({});
  const locos = trains.filter((t) => isFreightLoco(t.model));
  const ready = locos.filter((t) => t.status === "IDLE" && t.wear < 100 && (t.cars ?? []).some((c) => c.startsWith("W_")));
  const [locoId, setLocoId] = useState<string | null>(null);
  const loco = locos.find((t) => t.id === locoId) ?? ready[0] ?? null;
  const [picked, setPicked] = useState<string[]>([]);
  const [compoId, setCompoId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => setPicked([]), [loco?.id]);
  // un contrat parti du marché (pris ailleurs, expiré) sort de la tournée en préparation
  useEffect(() => setPicked((p) => p.filter((id) => market.some((c) => c.id === id))), [market]);

  const activeContracts = myContracts.filter((c) => c.status === "EN_COURS");
  const deliveredContracts = myContracts.filter((c) => c.status === "LIVREE").slice(0, 5);
  const locoCars = (loco?.cars ?? []).filter((c) => c.startsWith("W_"));
  const locoIdle = !!loco && loco.status === "IDLE" && loco.wear < 100;
  const fm = loco ? freightModel(loco.model) : null;
  const pickedContracts = picked.map((id) => market.find((c) => c.id === id)).filter(Boolean) as Contract[];
  const usedWagons = new Set(pickedContracts.map((c) => wagonForCargo(c.cargoType)?.id));
  const estimate = (c: Contract) => Math.round(c.reward * (loadFor(locoCars, c.cargoType) || 1) * (fm?.bonus ?? 1));
  // 2.1 : une gare de triage au départ ou à l'arrivée raccourcit la part du contrat (×0,85, comme le serveur)
  const yardSet = new Set(company.yards ?? []);
  const viaYard = (c: { originStation: string; destinationStation: string }) => yardSet.has(c.originStation) || yardSet.has(c.destinationStation);
  const tour = loco && pickedContracts.length ? tourMinutes(loco.model, pickedContracts.map((c) => Math.round(c.durationMinutes * (viaYard(c) ? 0.85 : 1))), locoCars.length) : 0;

  function status(c: Contract): { ok: boolean; text: string } {
    const w = wagonForCargo(c.cargoType);
    if (!loco) return { ok: false, text: "Il faut une locomotive de fret" };
    if (!locoIdle) return { ok: false, text: `${loco.name} est en tournée` };
    if (!w || !locoCars.includes(w.id)) return { ok: false, text: `Il faut un ${w ? w.label.toLowerCase() : "wagon adapté"}` };
    if (!picked.includes(c.id) && usedWagons.has(w.id)) return { ok: false, text: `Le ${w.short.toLowerCase()} est déjà chargé` };
    return { ok: true, text: "" };
  }

  async function send() {
    if (!loco || !pickedContracts.length || sending) return;
    setSending(true);
    try {
      await api.post("/contracts/accept", { trainId: loco.id, contractIds: picked, insuredIds: picked.filter((id) => insuredSelections[id]) });
      showToast(picked.length > 1 ? `${loco.name} part en tournée avec ${picked.length} cargaisons` : `${loco.name} part livrer ${pickedContracts[0].cargoType.toLowerCase()}`);
      setPicked([]);
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur lors du départ de la tournée", "error");
    } finally {
      setSending(false);
    }
  }

  // les livraisons en cours, par locomotive
  const tours = new Map<string, Contract[]>();
  for (const c of activeContracts) {
    const k = c.train?.id ?? c.id;
    tours.set(k, [...(tours.get(k) ?? []), c]);
  }
  const compoTrain = trains.find((t) => t.id === compoId) ?? null;

  return (
    <div className="space-y-8" data-tutorial="freight-market">
      {/* le parc de fret */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="font-display text-[20px]">Vos locomotives</h2>
          {locos.length > 0 && (
            <button onClick={onOpenCatalog} className="text-[13px] font-body text-cobalt hover:underline underline-offset-[3px]">
              Commander une locomotive
            </button>
          )}
        </div>
        {locos.length === 0 ? (
          <div className="border border-amber/40 bg-amber/[0.05] p-4 flex flex-wrap items-center gap-4">
            <div className="w-[200px] shrink-0">
              <TrainPicture model="LOCOTRACTEUR" cars={["W_TREMIE", "W_PLAT"]} livery={company.liveryColor} height={44} label="Un locotracteur et deux wagons" />
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="font-display text-[17px]">Le fret se livre avec une locomotive de fret</div>
              <p className="text-[13.5px] text-slate2 font-body mt-1">
                Les rames voyageurs ne livrent plus de marchandises. Le Locotracteur coûte 300 pi. et tire deux wagons : de quoi prendre vos premiers contrats.
              </p>
            </div>
            <button onClick={onOpenCatalog} className="bg-cobalt text-onaccent px-4 py-2 text-[14px] font-semibold font-body">
              Voir les locomotives
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Locomotive à charger">
            {locos.map((t) => {
              const tc = (t.cars ?? []).filter((c) => c.startsWith("W_"));
              const busy = t.status !== "IDLE";
              const sel = loco?.id === t.id;
              const groups = WAGON_TYPES.map((w) => ({ w, n: tc.filter((c) => c === w.id).length })).filter((g) => g.n);
              return (
                <div
                  key={t.id}
                  role="radio"
                  aria-checked={sel}
                  tabIndex={0}
                  onClick={() => setLocoId(t.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setLocoId(t.id)}
                  className={`text-left border p-3 cursor-pointer transition-colors ${sel ? "border-cobalt bg-cobalt/[0.06]" : "border-line hover:border-slate2"}`}
                >
                  <div className="h-[34px] -mx-1">
                    <TrainPicture model={t.model} cars={t.cars ?? []} livery={company.liveryColor} height={34} track={false} fit label={t.name} />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-2">
                    <span className="text-[14.5px] font-semibold font-body truncate">{t.name}</span>
                    <span className={`text-[12px] font-body shrink-0 ${busy ? "text-amber" : tc.length ? "text-rail-green" : "text-slate2"}`}>
                      {busy ? `en tournée, ${Math.round(t.progress ?? 0)} %` : tc.length ? "au dépôt" : "sans wagon"}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-slate2 font-body mt-0.5 min-h-[18px]">
                    {groups.length ? groups.map((g) => `${g.w.short}${g.n > 1 ? ` ×${g.n}` : ""}`).join(", ") : `${modelLabel(t.model)}, jusqu'à ${freightModel(t.model)?.maxWagons ?? 0} wagons`}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompoId(t.id);
                    }}
                    className="mt-2 text-[12.5px] font-body text-amber hover:underline underline-offset-[3px]"
                  >
                    {tc.length ? "Changer les wagons" : "Atteler des wagons"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="font-display text-[20px]">Contrats proposés</h2>
          {loco && (
            <span className="text-[13px] font-body text-slate2">
              Pour <span className="text-offwhite">{loco.name}</span>
              {locoIdle ? `, ${locoCars.length} wagon${locoCars.length > 1 ? "s" : ""}` : ", en tournée"}
            </span>
          )}
        </div>
        {market.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-slate2 py-8 border-y border-line">
            <CargoMark size={18} className="opacity-40" />
            <span className="text-sm font-body">Le marché se réapprovisionne…</span>
          </div>
        ) : (
          <ul className="border-t border-line">
            {market.map((c) => {
              const w = wagonForCargo(c.cargoType);
              const st = status(c);
              const on = picked.includes(c.id);
              const load = loadFor(locoCars, c.cargoType);
              return (
                <li key={c.id} className={`py-3.5 border-b border-line grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,1fr)_150px_100px_180px] items-center ${on ? "bg-cobalt/[0.05]" : ""}`}>
                  <div className="min-w-0">
                    <div className="text-[15.5px] font-semibold font-body flex items-center gap-1.5">
                      {c.risky && <FragileMark size={13} className="text-rail-red shrink-0" />}
                      {c.cargoType}
                    </div>
                    <div className="text-[12.5px] text-slate2 font-body mt-0.5">
                      {c.originStation} → {c.destinationStation}, {c.durationMinutes} min
                      {c.risky && <span className="text-[#fca5a5]">, fragile</span>}
                      {viaYard(c) && <span className="text-rail-green">, par votre gare de triage (+12 %, plus court)</span>}
                    </div>
                    {w && (
                      <span className={`inline-block mt-1 text-[11.5px] font-body px-1.5 py-0.5 border ${locoCars.includes(w.id) ? "border-amber/50 text-amber" : "border-line text-slate2"}`}>
                        {w.label}
                      </span>
                    )}
                    {c.forOrder && <OrderTag o={c.forOrder} />}
                  </div>
                  <div>
                    <div className={`font-mono2 text-[17px] tabular-nums ${c.risky ? "text-rail-red" : "text-amber"}`}>+{st.ok ? estimate(c) : c.reward} pi.</div>
                    {st.ok && (load > 1 || (fm?.bonus ?? 1) > 1) && (
                      <div className="text-[11.5px] text-slate2 font-body">
                        {c.reward} pi.{load > 1 ? `, charge ${fmtLoad(load)}` : ""}
                        {(fm?.bonus ?? 1) > 1 ? `, +${Math.round(((fm?.bonus ?? 1) - 1) * 100)} %` : ""}
                      </div>
                    )}
                  </div>
                  <div className="text-[12.5px] text-slate2 font-body">
                    expire dans <span className="font-mono2 text-offwhite"><ExpiryCountdown expiresAt={c.expiresAt} /></span>
                  </div>
                  <div className="sm:justify-self-end flex flex-col gap-1.5 items-start sm:items-end">
                    {st.ok ? (
                      <>
                        {c.risky && (
                          <label className="flex items-center gap-1.5 text-[12px] font-body text-slate2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!insuredSelections[c.id]}
                              onChange={(e) => setInsuredSelections((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                              className="accent-cobalt"
                            />
                            Assurer (+{Math.round(c.reward * 0.15)} pi.)
                          </label>
                        )}
                        <button
                          onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                          aria-pressed={on}
                          className={`text-[13px] font-body px-3 py-1.5 border ${on ? "bg-cobalt text-onaccent border-cobalt" : "text-cobalt border-cobalt/40 hover:bg-cobalt/10"}`}
                        >
                          {on ? "Dans la tournée" : "Charger"}
                        </button>
                      </>
                    ) : (
                      <span className="text-[12.5px] font-body text-slate2 text-right max-w-[180px]">{st.text}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-slate2 font-body mt-2 flex items-center gap-1.5">
          <FragileMark size={11} className="text-rail-red" /> Marchandise fragile : récompense plus élevée mais risque de dommage à la livraison (usure accrue, gain réduit).
        </p>
      </div>

      {/* la tournée en préparation */}
      {loco && pickedContracts.length > 0 && (
        <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-4 z-20 border border-cobalt bg-navy-900/95 backdrop-blur p-4 flex flex-wrap items-center gap-4 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
          <div className="w-[180px] shrink-0 hidden sm:block">
            <TrainPicture model={loco.model} cars={loco.cars ?? []} livery={company.liveryColor} height={36} track={false} label={loco.name} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-display text-[17px]">
              {pickedContracts.length > 1 ? `Tournée de ${loco.name}` : `${loco.name} part livrer`}
            </div>
            <div className="text-[13px] text-slate2 font-body">
              {pickedContracts.map((c) => c.cargoType).join(", ")}, environ {tour} min
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono2 text-amber text-[19px] tabular-nums">≈ +{pickedContracts.reduce((n, c) => n + estimate(c), 0).toLocaleString("fr-FR")} pi.</div>
            <div className="text-[11.5px] text-slate2 font-body">avant cours du jour et fidélité</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPicked([])} className="text-[13px] font-body text-slate2 hover:text-offwhite px-2">
              Vider
            </button>
            <button onClick={send} disabled={sending} className="bg-cobalt text-onaccent px-4 py-2 text-[14px] font-semibold font-body disabled:opacity-50">
              {sending ? "Départ…" : "Faire partir"}
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-[20px] mb-3">Livraisons en cours</h2>
        {tours.size === 0 ? (
          <p className="py-6 text-center text-slate2 font-body text-sm border border-line">Aucune livraison en cours.</p>
        ) : (
          <div className="space-y-2">
            {[...tours.values()].map((list) => {
              const c0 = list[0];
              const t = trains.find((x) => x.id === c0.train?.id);
              const progress = c0.train?.progress ?? 0;
              return (
                <div key={c0.id} className="border border-line p-3.5">
                  <div className="flex items-start justify-between gap-3 mb-2.5 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold font-body">
                        {c0.train?.name}
                        {list.length > 1 && <span className="ml-2 text-[12px] font-normal text-cobalt">tournée de {list.length} cargaisons</span>}
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {list.map((c) => (
                          <li key={c.id} className="text-[13px] font-body text-slate2">
                            <span className="text-offwhite">{c.cargoType}</span> <span className="font-mono2 text-xs">{c.originStation} → {c.destinationStation}</span>
                            {c.insured && <span className="ml-1.5 text-[11px] text-cobalt border border-cobalt/40 px-1.5 py-0.5">assuré</span>}
                            {c.forOrder && <OrderTag o={c.forOrder} />}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {t && (
                      <div className="w-[150px] h-[28px] shrink-0">
                        <TrainPicture model={t.model} cars={t.cars ?? []} livery={company.liveryColor} height={28} track={false} label={t.name} />
                      </div>
                    )}
                  </div>
                  <div className="relative h-3 flex items-center">
                    <div className="w-full h-1 bg-navy-900 border border-line">
                      <div className="h-full bg-rail-green transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                    </div>
                    <CargoMark size={11} className="absolute -translate-x-1/2 text-rail-green transition-all duration-700 ease-out" style={{ left: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deliveredContracts.length > 0 && (
        <div>
          <h2 className="font-display text-[20px] mb-3">Dernières livraisons</h2>
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

      {compoTrain && <FreightComposition train={compoTrain} balance={company.balance} livery={company.liveryColor} onClose={() => setCompoId(null)} onChange={onChange} />}
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
  waitsFor?: string | null; // 2.0 : un ordre plus ancien de la même marchandise passe avant
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
          {m.waitsFor && (
            <p className="text-[12.5px] font-body text-slate2 px-4 pt-1 max-w-[60ch]">
              En attente : vos livraisons de cette marchandise comptent d'abord pour l'ordre nº {m.waitsFor}, puis pour celui-ci.
            </p>
          )}

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

function ThemePanel({
  current,
  owned,
  onChange,
  onOpenShop,
}: {
  current: ThemeId;
  owned: string[];
  onChange: () => void;
  onOpenShop: () => void;
}) {
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
        Plusieurs habillages de la même interface. Le choix est enregistré sur votre compte et vous suit d'un
        appareil à l'autre.
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        {THEMES.map((t) => {
          const on = theme === t.id;
          /* Un habillage de boutique est montré même à ceux qui ne l'ont pas :
             c'est la vitrine. Il reste simplement inactivable, avec un lien
             vers la boutique au lieu d'une erreur. */
          const locked = Boolean(t.shop) && !owned.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => (locked ? onOpenShop() : pick(t.id))}
              className={`text-left border p-4 transition-colors ${
                on ? "border-cobalt bg-cobalt/10" : "border-line hover:border-slate2"
              } ${locked ? "opacity-70" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {/* pastilles : les couleurs réelles du thème, pas une étiquette */}
                <span className="flex shrink-0">
                  {t.swatch.map((col) => (
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
                {locked && (
                  <span className="ml-auto text-[10px] font-mono2 uppercase text-amber border border-amber/40 px-1.5">
                    Boutique
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
    if (data.unit === "km") return `${v.toLocaleString("fr-FR")} km`; // 2.2 : grande vitesse
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
          <Plate plate={c.plate}>
            {c.emblem && <Emblem id={c.emblem} size={13} className={c.plate ? "" : "text-slate2"} />}
            {c.name}
          </Plate>
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
    <div data-modal className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
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

            {(company.unlocked?.liveries?.length ?? 0) > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-mono2 uppercase tracking-[0.16em] text-slate2 mb-2">
                  Livrées de la boutique
                </div>
                <div className="flex gap-2 flex-wrap">
                  {company.unlocked!.liveries.map((c) => (
                    <button
                      key={c}
                      onClick={() => setLiveryColor(c)}
                      className={`w-8 h-8 border-2 transition-transform active:scale-95 ${
                        liveryColor.toLowerCase() === c ? "border-offwhite" : "border-transparent"
                      }`}
                      style={{ background: c }}
                      aria-label={`Couleur ${c}`}
                    />
                  ))}
                </div>
              </div>
            )}

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
    spec: "Matériel polyvalent pour vos lignes voyageurs",
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
    id: "COUCHETTES",
    name: "Rame Couchettes",
    spec: "Train de nuit : recette ×3 de 22 h à 6 h, ×0,8 le jour. Grandes lignes seulement (10 min et plus)",
    speedLevel: 2,
    capacityLevel: 2,
    price: 900,
    minGradeId: 2,
  },
  // 2.1.1
  {
    id: "NUIT_EUROPE",
    name: "Train de nuit international",
    spec: "Voitures-lits et voiture-restaurant vers l'étranger : recette ×3,9 de 22 h à 6 h et péage de nuit à moitié prix, ×0,6 le jour. Lignes qui passent une frontière, 10 min et plus",
    speedLevel: 2,
    capacityLevel: 2,
    price: 2400,
    minGradeId: 3,
    needsLicence: true,
  },
  // 2.2
  {
    id: "TGV",
    name: "Rame TGV",
    spec: "500 places, trajets presque deux fois plus courts et billet +15 % sur une ligne à grande vitesse, et seulement là. S'use 25 % plus vite. Rame indéformable",
    speedLevel: 3,
    capacityLevel: 3,
    price: 6000,
    minGradeId: 3,
  },
] as { id: string; name: string; spec: string; speedLevel: number; capacityLevel: number; price: number; minGradeId: number; needsLicence?: boolean }[];

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

const GRADE_NAMES = [
  "Apprenti exploitant", "Gestionnaire confirmé", "Chef de réseau", "Baron du rail", "Magnat",
  "Directeur régional", "Directeur national", "Administrateur des chemins de fer", "Président de compagnie", "Légende du rail",
  "Bâtisseur de gares", "Maître des caténaires", "Magnat européen", "Empereur du rail",
];

interface DlcInfo {
  id: string;
  name: string;
  tagline: string;
  priceCents: number;
  premium: boolean;
  owned: boolean;
  models: { id: string; label: string; cost: number; minGradeId: number; seats: number; blurb: string }[];
  stations: string[];
  features: string[];
}

function TrainCatalogModal({
  buying,
  gradeId,
  hasLicence = false,
  onBuy,
  onClose,
  onOpenShop,
  livery,
}: {
  buying: boolean;
  gradeId: number;
  hasLicence?: boolean; // 2.1.1 : licence internationale (train de nuit international)
  onBuy: (model: string) => void;
  onClose: () => void;
  onOpenShop?: (dlcId: string) => void;
  livery?: string;
}) {
  const liveryForCatalog = livery ?? "#4f7fa3";
  // 2.0 : le matériel des extensions
  const [dlcs, setDlcs] = useState<DlcInfo[]>([]);
  useEffect(() => {
    api.get("/dlc").then(({ data }) => setDlcs(data?.dlcs ?? [])).catch(() => setDlcs([]));
  }, []);
  return (
    <div data-modal className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-6">
      <div className="w-full max-w-6xl bg-navy-900 border border-line border-t-[3px] border-t-cobalt tutorial-step-enter max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-line">
          <h2 className="font-display text-2xl">Catalogue du matériel roulant</h2>
          <p className="text-sm text-slate2 font-body mt-1">
            Les modèles se débloquent en montant en grade — plus d'abonnement requis.
          </p>
        </div>

        <div className="px-6 pt-5 pb-1">
          <h3 className="font-display text-xl">Voyageurs</h3>
          <p className="text-sm text-slate2 font-body mt-0.5">Pour vos lignes. Les voitures s'ajoutent ensuite, rame par rame.</p>
        </div>
        {/* 2.2 : cinq modèles voyageurs, sur une seule rangée en grand écran */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-line">
          {CATALOG.map((model) => {
            const noLicence = !!model.needsLicence && !hasLicence;
            const locked = (model.minGradeId ?? 0) > gradeId || noLicence;
            return (
              <div key={model.id} className={`relative p-5 flex flex-col ${locked ? "opacity-45" : ""}`}>
                {locked && (
                  <span className="absolute top-4 right-4 text-[10px] font-mono2 uppercase text-slate2 border border-line px-1.5 py-0.5">
                    {(model.minGradeId ?? 0) > gradeId ? GRADE_NAMES[model.minGradeId ?? 0] : "Licence internationale"}
                  </span>
                )}

                <div className={`-mx-2 mb-3 ${locked ? "opacity-60 grayscale" : ""}`}>
                  <TrainPicture model={model.id} livery={liveryForCatalog} height={50} label={model.name} />
                </div>

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
                    {(model.minGradeId ?? 0) > gradeId ? "Grade insuffisant" : "Licence requise"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 2.1 : le fret a son matériel */}
        <div className="border-t border-line">
          <div className="px-6 pt-5 pb-1">
            <h3 className="font-display text-xl">Fret</h3>
            <p className="text-sm text-slate2 font-body mt-0.5 max-w-[70ch]">
              Une locomotive et ses wagons. Plusieurs wagons du même type portent plus et le contrat paie plus ; des wagons de types différents prennent plusieurs contrats en une tournée.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line">
            {FREIGHT_CATALOG.map((m) => {
              const locked = m.minGradeId > gradeId;
              return (
                <div key={m.id} className={`relative p-5 flex flex-col ${locked ? "opacity-45" : ""}`}>
                  {locked && (
                    <span className="absolute top-4 right-4 text-[10px] font-mono2 uppercase text-slate2 border border-line px-1.5 py-0.5">{GRADE_NAMES[m.minGradeId]}</span>
                  )}
                  <div className={`-mx-2 mb-3 ${locked ? "opacity-60 grayscale" : ""}`}>
                    <TrainPicture model={m.id} livery={liveryForCatalog} cars={m.sample} height={50} label={m.name} />
                  </div>
                  <div className="font-display text-lg leading-snug mb-1 pr-16">{m.name}</div>
                  <p className="text-xs text-slate2 font-body mb-4 flex-1">{m.spec}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate2 font-mono2 uppercase tracking-wide">Vitesse</span>
                      <StatBars level={m.speedLevel} active={!locked} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate2 font-mono2 uppercase tracking-wide">Wagons</span>
                      <StatBars level={m.maxWagons} max={5} active={!locked} />
                    </div>
                  </div>
                  {!locked ? (
                    <>
                      <div className="inline-flex self-start items-center gap-1 bg-amber/15 border border-amber/40 text-amber text-xs font-mono2 px-2 py-1 mb-3">{m.price} pi.</div>
                      <button onClick={() => onBuy(m.id)} disabled={buying} className="w-full bg-cobalt text-onaccent text-xs font-semibold uppercase tracking-wide py-2.5 hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-60">
                        {buying ? "Achat…" : "Commander"}
                      </button>
                    </>
                  ) : (
                    <button disabled className="w-full border border-line text-slate2 text-xs font-mono2 uppercase py-2.5 cursor-not-allowed">Grade insuffisant</button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="px-6 pb-4 pt-1 text-[12.5px] text-slate2 font-body">
            Les wagons s'achètent ensuite, depuis la fiche de la locomotive : {WAGON_TYPES.map((w) => w.short.toLowerCase()).join(", ")}.
          </p>
        </div>

        {dlcs.some((d) => d.models.length > 0) && (
          <div className="border-t border-line">
            <div className="px-6 pt-5 pb-1">
              <h3 className="font-display text-xl">Matériel des extensions</h3>
              <p className="text-sm text-slate2 font-body mt-0.5">Des rames qui se jouent autrement. Elles ne sont pas plus fortes : elles gagnent d'un côté ce qu'elles perdent de l'autre.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
              {dlcs.flatMap((d) =>
                d.models.map((m) => {
                  const gradeLocked = m.minGradeId > gradeId;
                  return (
                    <div key={m.id} className={`p-5 flex flex-col ${!d.owned || gradeLocked ? "opacity-80" : ""}`}>
                      <div className="-mx-2 mb-3">
                        <TrainPicture model={m.id} livery={liveryForCatalog} height={50} label={`Rame ${m.label}`} />
                      </div>
                      <div className="text-[12.5px] font-body text-amber mb-2">
                        Extension « {d.name} »{d.premium ? ", incluse dans le Premium" : ""}
                      </div>
                      <div className="font-display text-lg leading-snug mb-1">Rame {m.label}</div>
                      <p className="text-[13px] text-slate2 font-body mb-4 flex-1">{m.blurb}</p>
                      <div className="text-[13px] font-mono2 text-amber mb-3">{m.cost} pi. · {m.seats} places</div>
                      {!d.owned ? (
                        <button onClick={() => onOpenShop?.(d.id)} className="w-full border border-amber/50 text-amber text-[13.5px] font-body py-2.5 hover:bg-amber/10">
                          Voir l'extension, {(d.priceCents / 100).toFixed(2).replace(".", ",")} €
                        </button>
                      ) : gradeLocked ? (
                        <button disabled className="w-full border border-line text-slate2 text-[13.5px] font-body py-2.5 cursor-not-allowed">
                          Grade « {GRADE_NAMES[m.minGradeId]} » requis
                        </button>
                      ) : (
                        <button onClick={() => onBuy(m.id)} disabled={buying} className="w-full bg-cobalt text-onaccent text-[13.5px] font-semibold font-body py-2.5 hover:bg-cobalt/90 disabled:opacity-60">
                          {buying ? "Achat…" : "Commander"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

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
  SUBVENTION: "Appel d'offres",
  PRIME: "Prime de stage",
  BOUTIQUE: "Boutique",
  PEAGE: "Péage de sillon",
  LICENCE: "Licence internationale",
  EVENEMENT: "Décision",
  COMPENSATION: "Geste commercial",
  // 1.7
  COMPOSITION: "Composition des rames",
  ELECTRIFICATION: "Électrification",
  GARE: "Achat de gare",
  REDEVANCE_QUAI: "Redevances de quai",
  COMMERCES: "Commerces en gare",
  ATELIER: "Atelier régional",
  EMPRUNT: "Emprunt bancaire",
  REMBOURSEMENT: "Remboursement d'emprunt",
  BOURSE: "Bourse",
  DIVIDENDE: "Dividendes",
  // 2.0
  VENTE_TRAIN: "Revente de matériel",
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

function CareerSection({ career, onOpenShop }: { career: CareerStatus; onOpenShop: () => void }) {
  const total = career.ranks.length;
  const next = career.nextRank;
  // progression vers le grade suivant : la moyenne des conditions, chacune plafonnée à 100 %
  const nextPct = next
    ? Math.round(
        (next.requirements.reduce((sum, r) => sum + (r.target ? Math.min(1, (r.current ?? 0) / r.target) : r.met ? 1 : 0), 0) /
          Math.max(1, next.requirements.length)) *
          100
      )
    : 100;

  return (
    <div>
      {/* grade actuel, en évidence, avec l'échelle complète */}
      <div className="border border-line border-t-2 border-t-amber p-6 mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <RankMark size={24} className="text-amber shrink-0" />
          <span className="font-display text-2xl">{career.currentRank.name}</span>
          <span className="font-mono2 text-[11px] text-slate2 ml-auto">
            Grade {career.currentRank.id + 1} sur {total}
          </span>
        </div>
        {/* échelle des grades : une case par grade, remplie jusqu'au grade actuel */}
        <div className="flex gap-1 mt-4" aria-hidden>
          {career.ranks.map((r) => (
            <div
              key={r.id}
              className={`h-1.5 flex-1 ${r.id <= career.currentRank.id ? "bg-amber" : r.id === career.currentRank.id + 1 ? "bg-amber/30" : "bg-line"}`}
            />
          ))}
        </div>
        <p className="text-xs text-slate2 font-body mt-3">
          {next ? `Prochain grade : ${next.name} — ${nextPct} % du chemin` : "Vous avez atteint le grade le plus élevé — félicitations."}
        </p>
      </div>

      {/* chemin complet, avec le grade actuel mis en avant */}
      <div className="space-y-3">
        {career.ranks.map((rank) => {
          const isCurrent = rank.id === career.currentRank.id;
          const isNext = rank.id === career.currentRank.id + 1;
          const isFuture = rank.id > career.currentRank.id;
          return (
            <div
              key={rank.id}
              className={`border p-4 ${isCurrent ? "border-amber/50 bg-amber/5" : isNext ? "border-line" : isFuture ? "border-line opacity-70" : "border-line"}`}
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
                {isNext && !rank.achieved && (
                  <span className="text-[10px] font-mono2 uppercase text-cobalt ml-auto shrink-0">Prochain</span>
                )}
              </div>
              {rank.requirements.length === 0 ? (
                <p className="text-xs text-slate2 font-body pl-[26px]">Grade de départ, aucune condition requise.</p>
              ) : (
                <ul className="space-y-2 pl-[26px]">
                  {rank.requirements.map((req, i) => {
                    const pct = req.target ? Math.min(100, ((req.current ?? 0) / req.target) * 100) : req.met ? 100 : 0;
                    return (
                      <li key={i} className={`text-xs font-body ${req.met ? "text-slate2" : "text-offwhite"}`}>
                        <div className="flex items-center gap-2">
                          <span className={req.met ? "text-rail-green" : "text-line"}>{req.met ? "✓" : "—"}</span>
                          <span className="flex-1">{req.label}</span>
                          {req.target !== undefined && !req.met && (isNext || isCurrent) && (
                            <span className="font-mono2 text-[11px] text-slate2 tabular-nums">
                              {(req.current ?? 0).toLocaleString("fr-FR")} / {req.target.toLocaleString("fr-FR")}
                            </span>
                          )}
                        </div>
                        {/* barre seulement pour le grade à viser : ailleurs, elle ne ferait que du bruit */}
                        {isNext && !req.met && (
                          <div className="h-1 bg-line mt-1 ml-[18px]">
                            <div className="h-full bg-cobalt" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {rank.reward && (
                <p className="text-[11.5px] font-body mt-2.5 pl-[26px] text-amber">
                  {rank.reward}
                  {rank.achieved && rank.reward.startsWith("Titre") && (
                    <>
                      {" "}·{" "}
                      <button onClick={onOpenShop} className="underline hover:no-underline">
                        l'afficher
                      </button>
                    </>
                  )}
                </p>
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

// contour de la France, même source que ses voisins : les frontières se raccordent
const FRANCE_D = COUNTRIES.find((c) => c.id === "France")?.d ?? "";

/* Quelques gares se touchent (Le Havre / Rouen, Metz / Nancy) : leur étiquette
   part à gauche pour ne pas se chevaucher. */
const LABEL_LEFT = new Set([
  "Lille", "Le Havre", "Rennes", "Nantes", "Bordeaux", "Chartres", "Le Mans", "Toulouse",
  "Angers", "La Rochelle", "Limoges", "Saint-Étienne", "Dijon", "Bayonne",
]);
/* Au centre du pays, les gares sont trop serrées pour une étiquette de côté :
   celles-ci se lisent au-dessus ou au-dessous de leur pastille. */
const LABEL_ABOVE = new Set(["Clermont-Ferrand"]);
const LABEL_BELOW = new Set(["Montpellier"]);

// Positions approximatives des gares sur une carte stylisée de France (viewBox 0 0 340 380)
/* Trois premières lignes sûres : de grandes gares, un trajet court pour voir
   la rame revenir vite. Un clic ouvre le formulaire déjà rempli. */
const FIRST_LINE_IDEAS: [string, string][] = [["Paris", "Lille"], ["Paris", "Lyon"], ["Lyon", "Marseille"]];

function FirstLineIdeas({ network, onPick }: { network: NetworkData | null; onPick: (a: string, b: string) => void }) {
  return (
    <section className="border border-line mb-6" data-tutorial="first-line-ideas">
      <div className="px-5 pt-4 pb-3 border-b border-line">
        <div className="text-[10px] font-mono2 uppercase tracking-[0.2em] text-amber mb-1">Pour commencer</div>
        <h2 className="font-display text-xl leading-tight">Votre première ligne</h2>
        <p className="text-[13px] font-body text-slate2 mt-1 max-w-[62ch]">
          Une ligne relie deux gares ; vos rames y feront l'aller-retour. Les grandes villes attirent plus de voyageurs.
          Prenez une idée ci-dessous, ou choisissez vos gares avec « + Ligne ».
        </p>
      </div>
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line">
        {FIRST_LINE_IDEAS.map(([a, b]) => {
          const pa = STATION_COORDS[a];
          const pb = STATION_COORDS[b];
          const minutes = pa && pb ? durationFromKm(distanceKm(pa, pb)) : 0;
          const demand = ((stationOf(network, a)?.demand ?? 1) + (stationOf(network, b)?.demand ?? 1)) / 2;
          const hourly = Math.round(hourlyRevenue(minutes) * demand);
          const pair = pairOf(network, a, b);
          return (
            <button
              key={a + b}
              onClick={() => onPick(a, b)}
              className="group text-left px-5 py-4 hover:bg-cobalt/[0.06] transition-colors"
            >
              <div className="font-body text-[15px] text-offwhite">
                {a} <span className="text-slate2">→</span> {b}
              </div>
              <div className="font-mono2 text-[11.5px] text-slate2 mt-1">
                {minutes} min · <span className="text-rail-green">≈ {hourly} pi./h</span>
              </div>
              <div className="font-body text-[11.5px] mt-1 text-slate2/80">
                {pair && pair.companies > 0 ? `Déjà ${pair.companies} compagnie${pair.companies > 1 ? "s" : ""} dessus` : "Personne dessus pour l'instant"}
              </div>
              <div className="font-mono2 text-[10.5px] uppercase tracking-wide text-cobalt mt-2.5 group-hover:underline">Tracer cette ligne</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* 1.7 : durée réelle d'un trajet, comme la simulation la calcule : Express
   plus rapide, chaque voiture ajoutée ralentit, l'électrification fait gagner 10 %. */
function tripDurationMs(t: { model: string; cars?: string[]; line?: { durationMinutes?: number; electrified?: boolean; doubleTrack?: boolean } | null }) {
  return (t.line?.durationMinutes ?? 0) * 60_000 * modelSpeed(t.model) * (1 + 0.03 * (t.cars?.length ?? 0)) * (t.line?.electrified ? 0.9 : 1) * (t.line?.doubleTrack ? 0.93 : 1);
}

/* Recette horaire théorique d'une rame sur la ligne, réputation parfaite.
   C'est le seul chiffre qui permet de comparer deux tracés. */
function hourlyRevenue(durationMinutes: number) {
  const perTrip = durationMinutes * 8 * (1 + lengthYieldPct(durationMinutes) / 100);
  return Math.round((60 / durationMinutes) * perTrip);
}

/* ============================================================
   La carte du réseau (1.6, refonte).

   « On dirait une image mal posée sur un document » : la carte était un
   SVG figé dans un cadre, légende à côté. Elle occupe maintenant tout
   l'espace et se manipule comme la carte d'un jeu de conduite : on la
   fait glisser, on zoome vers ce qu'on regarde, et plus on s'approche,
   plus elle montre de détails (toutes les gares, leurs noms, les
   fleuves). Les pastilles et les étiquettes gardent leur taille à
   l'écran quel que soit le zoom. Un clic sur une gare ou une rame ouvre
   sa fiche ; la légende et la liste des lignes sont des panneaux
   repliables posés sur la carte.
   ============================================================ */
const MAP_WORLD = { x: -93, y: -72, w: 560, h: 512 };
const MAP_HOME = { cx: 172, cy: 200, zoom: 1.15 };
const KM_PER_UNIT = 2.59; // 111,32 × cos 46,5° / 29,58

function niceScale(kmPerPx: number) {
  for (const km of [10, 20, 25, 50, 100, 200, 250, 500]) {
    const px = km / kmPerPx;
    if (px >= 70) return { km, px };
  }
  return { km: 500, px: 500 / kmPerPx };
}

type MapSelection = { kind: "gare"; name: string } | { kind: "rame"; id: string } | null;

function NetworkMap({
  lines,
  trains,
  contracts,
  onChange,
  network,
  livery,
  onOpenWrecks,
}: {
  lines: Line[];
  trains: Train[];
  contracts: Contract[];
  onChange: () => void;
  network: NetworkData | null;
  livery?: string;
  onOpenWrecks?: () => void;
}) {
  const { showToast } = useToast();
  // 2.0 : les épaves à l'abandon, posées près de leur gare
  const [wrecks, setWrecks] = useState<WreckInfo[]>([]);
  /* 2.0.3 : les liaisons des autres compagnies, masquées par défaut (elles
     couvraient la carte de traits gris). Le choix est gardé sur l'appareil. */
  const [showRivals, setShowRivals] = useState(() => {
    try {
      return localStorage.getItem("reseau.carte.concurrents") === "1";
    } catch {
      return false;
    }
  });
  function toggleRivals() {
    setShowRivals((v) => {
      try {
        localStorage.setItem("reseau.carte.concurrents", v ? "0" : "1");
      } catch {
        /* stockage refusé : le choix vaut pour la session */
      }
      return !v;
    });
  }
  useEffect(() => {
    const load = () => void loadWrecks().then((d) => setWrecks(d?.open ?? []));
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  // 1.7 — Premium : vos gares à vos couleurs sur la carte
  const myOwned = new Map(
    network?.isPremium ? (network.ownedStations ?? []).filter((o) => o.mine).map((o) => [o.station, o.level] as [string, number]) : []
  );
  // horloge de la carte : fait avancer les trains en continu entre deux rafraîchissements
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const camera = useMapCamera(MAP_WORLD, MAP_HOME);
  const { k, cam } = camera;
  const [drawing, setDrawing] = useState(false);
  /* 1.7 : le tracé est une suite de gares : départ, arrêts, terminus */
  const [picks, setPicks] = useState<string[]>([]);
  const from = picks[0] ?? null;
  const to = picks.length >= 2 ? picks[picks.length - 1] : null;
  const [lineName, setLineName] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<MapSelection>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [linesOpen, setLinesOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  function resetDraw() {
    setPicks([]);
    setLineName("");
  }

  function pickStation(name: string) {
    if (camera.wasDrag()) return;
    if (!drawing) {
      setSelected({ kind: "gare", name });
      setFollow(null);
      return;
    }
    // retoucher la dernière gare l'enlève ; une gare déjà prise ne revient pas ; au plus 4 arrêts
    if (picks[picks.length - 1] === name) return setPicks((p) => p.slice(0, -1));
    if (picks.includes(name)) return;
    if (picks.length >= MAX_STOPS + 2) return showToast(`Une ligne s'arrête dans ${MAX_STOPS} gares au plus`, "error");
    const next = [...picks, name];
    setPicks(next);
    if (next.length >= 2) setLineName(`${next[0]} — ${name}`);
  }

  const draft =
    picks.length >= 2 ? { km: routeKm(picks), minutes: routeMinutes(picks), stops: picks.length - 2 } : null;

  async function createFromMap() {
    if (!from || !to || !draft) return;
    setSaving(true);
    try {
      await api.post("/lines", {
        name: lineName.trim() || `${from} — ${to}`,
        departureStation: from,
        arrivalStation: to,
        stops: picks.slice(1, -1),
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
    ...trains.filter((t) => t.status === "EN_ROUTE" && t.line).flatMap((t) => [t.line!.departureStation, t.line!.arrivalStation]),
    ...activeFreight.flatMap((c) => [c.originStation, c.destinationStation]),
  ]);
  const enRouteCount = trains.filter((t) => t.status === "EN_ROUTE").length;
  const night = !!network?.night?.active;

  /* Position courante de chaque rame en ligne : sert au dessin, à la fiche et au suivi. */
  /* 1.7 : la rame suit son itinéraire (arrêts compris) dans son sens de marche */
  type TrainPos = { x: number; y: number; angle: number; ratio: number; color: string; lineIndex: number; route: string[]; direction: number; stoppedAt: string | null; next: string };
  const trainPos = new Map<string, TrainPos>();
  for (const t of trains) {
    if (!t.line || t.status !== "EN_ROUTE") continue;
    const lineIndex = Math.max(0, lines.findIndex((l) => l.id === t.line!.id));
    const route = routeStations(t.line);
    const duration = tripDurationMs(t);
    const ratio = t.departedAt && duration > 0 ? Math.min(1, Math.max(0, (clock - new Date(t.departedAt).getTime()) / duration)) : t.progress / 100;
    const direction = t.direction ?? 0;
    const p = positionOnRoute(route, lineIndex, direction, ratio);
    if (!p) continue;
    trainPos.set(t.id, { x: p.x, y: p.y, angle: p.angle, ratio, color: LINE_PALETTE[lineIndex % LINE_PALETTE.length], lineIndex, route, direction, stoppedAt: p.stoppedAt, next: p.to });
  }

  // suivi d'une rame : la caméra reste sur elle
  const followed = follow ? trainPos.get(follow) : undefined;
  useEffect(() => {
    if (followed) camera.flyTo(followed.x, followed.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followed?.x, followed?.y]);

  // niveau de détail : de loin, seules les grandes gares et les vôtres ont un nom
  const showAllLabels = cam.zoom >= 1.9;
  const showMinor = cam.zoom >= 1.3;
  const scaleBar = niceScale(KM_PER_UNIT / camera.scale);

  const selStation = selected?.kind === "gare" ? selected.name : null;
  const selTrain = selected?.kind === "rame" ? trains.find((t) => t.id === selected.id) ?? null : null;
  const cardAnchor = (() => {
    if (selStation && STATION_COORDS[selStation]) return camera.toScreen(STATION_COORDS[selStation].x, STATION_COORDS[selStation].y);
    if (selTrain && trainPos.get(selTrain.id)) {
      const p = trainPos.get(selTrain.id)!;
      return camera.toScreen(p.x, p.y);
    }
    return null;
  })();

  async function toggleFullscreen() {
    const el = frameRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      // plein écran refusé (certains navigateurs mobiles) : la carte reste utilisable
    }
  }

  const ctrl = "w-9 h-9 flex items-center justify-center bg-navy-900/90 border border-line text-slate2 hover:text-offwhite hover:border-slate2 backdrop-blur-sm transition-colors";

  return (
    <div ref={frameRef} className="relative -mx-4 md:mx-0 border-y md:border border-line bg-navy-950 overflow-hidden h-[72vh] md:h-[calc(100vh-230px)] min-h-[460px] select-none">
      <div ref={camera.ref} className="absolute inset-0 touch-none" style={{ cursor: drawing ? "crosshair" : "grab" }}>
        <svg viewBox={camera.viewBox} width={camera.size.w} height={camera.size.h} className="block" onClick={() => { if (!camera.wasDrag()) setSelected(null); }}>
          <defs>
            <filter id="map-relief" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter id="map-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation={2.4 * k} />
            </filter>
            <radialGradient id="map-city-light">
              <stop offset="0" stopColor="rgb(var(--c-amber))" stopOpacity="0.55" />
              <stop offset="1" stopColor="rgb(var(--c-amber))" stopOpacity="0" />
            </radialGradient>
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

          {/* la mer, jusqu'aux bords du monde */}
          <rect x={-200} y={-200} width={800} height={800} fill="rgb(var(--c-cobalt))" opacity="0.05" />
          <g stroke="rgb(var(--c-slate2))" strokeWidth={0.35 * k} opacity="0.12">
            {GRATICULE.meridians.map((x) => <line key={`m${x}`} x1={x} y1={-200} x2={x} y2={600} />)}
            {GRATICULE.parallels.map((p) => <line key={`p${p.lat}`} x1={-200} y1={p.y} x2={600} y2={p.y} />)}
          </g>

          {/* l'Europe autour, la France par-dessus */}
          <g>
            {COUNTRIES.filter((c) => c.id !== "France").map((c) => (
              <path key={c.id} d={c.d} fill="rgb(var(--c-navy-900))" fillOpacity="0.75" stroke="rgb(var(--c-slate2))" strokeOpacity="0.4" strokeWidth={0.6 * k} strokeLinejoin="round" />
            ))}
          </g>
          <g>
            <g filter="url(#map-halo)" opacity="0.45">
              <path d={FRANCE_D} fill="rgb(var(--c-slate2))" />
            </g>
            <path d={FRANCE_D} fill="rgb(var(--c-navy-900))" stroke="rgb(var(--c-slate2))" strokeWidth={0.9 * k} opacity="0.97" strokeLinejoin="round" />
          </g>

          {/* massifs et fleuves : discrets, ils situent sans concurrencer les lignes */}
          <g filter="url(#map-relief)" pointerEvents="none">
            {RELIEF.map((r, i) => (
              <ellipse key={i} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} transform={`rotate(${r.rot} ${r.cx} ${r.cy})`} fill="rgb(var(--c-slate2))" opacity={0.11 * r.strength} />
            ))}
          </g>
          <g fill="none" stroke="rgb(var(--c-cobalt))" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
            {RIVERS.filter((r) => r.major || showMinor).map((r) => (
              <path key={r.name} d={r.d} strokeWidth={(r.major ? 1.1 : 0.75) * k} opacity={r.major ? 0.45 : 0.32} />
            ))}
          </g>

          {/* noms des pays, des mers et des massifs : ils s'effacent quand on s'approche */}
          <g pointerEvents="none" fontFamily="var(--font-mono2)">
            {cam.zoom < 3.2 &&
              COUNTRY_LABELS.map((l) => (
                <text key={l.name} x={l.x} y={l.y} textAnchor="middle" fontSize={8 * k} fill="rgb(var(--c-slate2))" opacity="0.5" letterSpacing={2 * k}>
                  {l.name.toUpperCase()}
                </text>
              ))}
            {SEA_LABELS.map((l) => (
              <text key={l.name} x={l.x} y={l.y} textAnchor="middle" fontSize={8.5 * k} fontStyle="italic" fontFamily="var(--font-display)" fill="rgb(var(--c-cobalt))" opacity="0.55" letterSpacing={0.8 * k}>
                {l.name}
              </text>
            ))}
            {showMinor &&
              RELIEF_LABELS.map((l) => (
                <text key={l.name} x={l.x} y={l.y} textAnchor="middle" fontSize={7 * k} fontStyle="italic" fontFamily="var(--font-display)" fill="rgb(var(--c-slate2))" opacity="0.55" letterSpacing={0.8 * k}>
                  {l.name}
                </text>
              ))}
          </g>

          {night && <rect x={-200} y={-200} width={800} height={800} fill="rgb(var(--c-navy-950))" opacity="0.28" pointerEvents="none" />}

          {/* liaisons exploitées par d'autres compagnies */}
          {showRivals && network?.pairs
            .filter((p) => !p.mine || p.companies > 1)
            .map((p) => {
              const a = STATION_COORDS[p.a];
              const b = STATION_COORDS[p.b];
              if (!a || !b) return null;
              return (
                <line key={`rival-${p.a}-${p.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgb(var(--c-slate2))" strokeWidth={Math.min(2.2, 0.7 + 0.3 * p.companies) * k} strokeDasharray={`${2 * k} ${3 * k}`} opacity="0.45">
                  <title>{`${p.a} — ${p.b} : ${p.companies} compagnie${p.companies > 1 ? "s" : ""}, ${p.trains} rame${p.trains > 1 ? "s" : ""}`}</title>
                </line>
              );
            })}

          {/* vos lignes : trait plein bordé de la couleur du fond, pointillé sans rame */}
          {lines.map((l, i) => {
            const a = STATION_COORDS[l.departureStation];
            const b = STATION_COORDS[l.arrivalStation];
            if (!a || !b) return null;
            const running = trains.some((t) => t.line?.id === l.id && t.status === "EN_ROUTE");
            const color = LINE_PALETTE[i % LINE_PALETTE.length];
            // 1.7 : un arc par tronçon, arrêts compris
            const path = routePath(routeStations(l), i);
            return (
              <g key={l.id}>
                {running && <path d={path} fill="none" stroke="rgb(var(--c-navy-950))" strokeWidth={5 * k} strokeLinecap="round" opacity="0.9" />}
                <path d={path} fill="none" stroke={color} strokeWidth={(running ? 2.8 : 1.4) * k} strokeLinecap="round" strokeDasharray={running ? undefined : `${3 * k} ${4 * k}`} opacity={running ? 1 : 0.5}>
                  <title>{`${l.name}${running ? "" : " · sans rame"}${hslOpen(l) ? " · grande vitesse" : hslBuilding(l) ? " · LGV en chantier" : ""}`}</title>
                </path>
                {/* 2.2 : la LGV, un filet clair au cœur du trait ; en chantier, des tirets ambre */}
                {hslOpen(l) && <path d={path} fill="none" stroke="rgb(var(--c-offwhite))" strokeWidth={0.7 * k} strokeLinecap="round" opacity="0.9" pointerEvents="none" />}
                {hslBuilding(l) && <path d={path} fill="none" stroke="rgb(var(--c-amber))" strokeWidth={1 * k} strokeDasharray={`${1.5 * k} ${2.5 * k}`} opacity="0.95" pointerEvents="none" />}
              </g>
            );
          })}

          {/* fret en cours */}
          {activeFreight.map((c) => {
            const a = STATION_COORDS[c.originStation];
            const b = STATION_COORDS[c.destinationStation];
            if (!a || !b) return null;
            return <path key={c.id} d={`M ${a.x},${a.y} L ${b.x},${b.y}`} fill="none" stroke="rgb(var(--c-amber))" strokeWidth={1.6 * k} strokeDasharray={`${2 * k} ${5 * k}`} strokeLinecap="round" opacity="0.8" />;
          })}

          {/* tracé en cours */}
          {picks.length >= 2 && (
            <polyline
              points={picks.filter((n) => STATION_COORDS[n]).map((n) => `${STATION_COORDS[n].x},${STATION_COORDS[n].y}`).join(" ")}
              fill="none"
              stroke="rgb(var(--c-cobalt))"
              strokeWidth={2.4 * k}
              strokeDasharray={`${5 * k} ${4 * k}`}
              strokeLinejoin="round"
              opacity="0.95"
            />
          )}

          {/* les gares */}
          {Object.entries(STATION_COORDS).filter(([name]) => stationVisible(name)).map(([name, pos]) => {
            const active = usedStations.has(name);
            const pulsing = activeStations.has(name);
            const size = stationOf(network, name)?.size ?? 2;
            const picked = picks.includes(name) || selStation === name;
            const big = size >= 4;
            const showLabel = active || picked || big || showAllLabels || drawing;
            const left = LABEL_LEFT.has(name);
            const above = LABEL_ABOVE.has(name);
            const below = LABEL_BELOW.has(name);
            const ev = stationOf(network, name)?.events ?? [];
            const hub = network?.hubs?.find((h) => h.station === name);
            const r = ((active || drawing ? 3.6 : 2.2) + 0.4 * (size - 2)) * k;
            return (
              <g key={name} onClick={(e) => { e.stopPropagation(); pickStation(name); }} style={{ cursor: "pointer" }}>
                <circle cx={pos.x} cy={pos.y} r={12 * k} fill="transparent" />
                {night && <circle cx={pos.x} cy={pos.y} r={(6 + 2.4 * size) * k} fill="url(#map-city-light)" opacity={active ? 0.9 : 0.45} pointerEvents="none" />}
                {picked && <circle cx={pos.x} cy={pos.y} r={8.5 * k} fill="none" stroke="rgb(var(--c-cobalt))" strokeWidth={1.8 * k} />}
                {pulsing && <circle cx={pos.x} cy={pos.y} r={7 * k} fill="none" stroke="rgb(var(--c-rail-green))" strokeWidth={0.9 * k} opacity="0.5" className="blink-dot" />}
                {ev.length > 0 && (() => {
                  const e0 = ev[0];
                  const up = e0.multiplier > 1;
                  const pct = `${up ? "+" : "−"}${Math.abs(Math.round((e0.multiplier - 1) * 100))} %`;
                  const color = up ? "rgb(var(--c-amber))" : "rgb(var(--c-rail-red))";
                  const w = (4 + pct.length * 4.1) * k;
                  return (
                    <g pointerEvents="none">
                      <circle cx={pos.x} cy={pos.y} r={8.5 * k} fill="none" stroke={color} strokeWidth={1 * k} opacity="0.8" />
                      <g transform={`translate(${pos.x} ${pos.y - 17 * k})`}>
                        <rect x={-w / 2} y={-6 * k} width={w} height={10.5 * k} rx={1.5 * k} fill="rgb(var(--c-navy-950))" stroke={color} strokeWidth={0.8 * k} />
                        <text x="0" y={1.9 * k} textAnchor="middle" fontSize={6.4 * k} fontFamily="var(--font-mono2)" fill={color}>{pct}</text>
                      </g>
                    </g>
                  );
                })()}
                {myOwned.has(name) && livery && (
                  <g pointerEvents="none">
                    {/* la plaque de gare : un carré à votre livrée, un cran par niveau de commerces */}
                    <rect x={pos.x - 7.5 * k} y={pos.y - 7.5 * k} width={15 * k} height={15 * k} fill={livery} opacity="0.22" stroke={livery} strokeWidth={1.4 * k} />
                    {Array.from({ length: myOwned.get(name) ?? 1 }).map((_, n) => (
                      <rect key={n} x={pos.x - 7.5 * k + n * 3.2 * k} y={pos.y + 9 * k} width={2.4 * k} height={2.4 * k} fill={livery} />
                    ))}
                  </g>
                )}
                {hub && (
                  <g pointerEvents="none">
                    <rect x={pos.x - 6.5 * k} y={pos.y - 6.5 * k} width={13 * k} height={13 * k} transform={`rotate(45 ${pos.x} ${pos.y})`} fill="none" stroke="rgb(var(--c-cobalt))" strokeWidth={1.2 * k} />
                  </g>
                )}
                <circle cx={pos.x} cy={pos.y} r={r} fill={active ? "rgb(var(--c-offwhite))" : "rgb(var(--c-slate2))"} stroke={active ? "rgb(var(--c-cobalt))" : "rgb(var(--c-navy-950))"} strokeWidth={1.5 * k} opacity={active ? 1 : drawing ? 0.9 : 0.65} />
                {isIntl(name) && (
                  <rect x={pos.x - 6 * k} y={pos.y - 6 * k} width={12 * k} height={12 * k} rx={2 * k} fill="none" stroke="rgb(var(--c-slate2))" strokeWidth={0.9 * k} strokeDasharray={`${2 * k} ${1.6 * k}`} opacity={network?.international?.licence.owned || active ? 1 : 0.55} pointerEvents="none" />
                )}
                {showLabel && (
                  <text
                    x={above || below ? pos.x : pos.x + (left ? -7 : 7) * k}
                    y={above ? pos.y - 7 * k : below ? pos.y + 12 * k : pos.y + 3 * k}
                    textAnchor={above || below ? "middle" : left ? "end" : "start"}
                    fontSize={(big || active ? 9.5 : 8.5) * k}
                    fontWeight={size >= 5 ? 700 : 400}
                    fontFamily="var(--font-mono2)"
                    fill={myOwned.has(name) && livery ? livery : active ? "rgb(var(--c-offwhite))" : "rgb(var(--c-slate2))"}
                    opacity={active ? 1 : 0.8}
                    stroke="rgb(var(--c-navy-950))"
                    strokeWidth={2.6 * k}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    pointerEvents="none"
                  >
                    {name}
                    {hub ? ` ×${hub.lines}` : ""}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2.0 : les épaves, un wagon rouillé à côté de la gare */}
          {wrecks.map((w) => {
            const at = STATION_COORDS[w.station];
            if (!at) return null;
            const c = RARITY_COLOR[w.rarity] ?? "#9aa7b8";
            return (
              <g
                key={w.id}
                transform={`translate(${at.x + 10 * k},${at.y - 10 * k}) scale(${1.25 * k})`}
                onClick={(e) => { e.stopPropagation(); if (!camera.wasDrag()) { setSelected({ kind: "gare", name: w.station }); setFollow(null); } }}
                style={{ cursor: "pointer" }}
                aria-label={`Épave près de ${w.station}`}
              >
                <circle r="10" fill="transparent" />
                {w.rarity === "LEGENDAIRE" && <circle r="8" fill="none" stroke={c} strokeWidth="1" className="map-wreck-ping" />}
                <rect x="-6" y="-3.5" width="12" height="6" rx="1" fill="#6b3a1c" stroke={c} strokeWidth="1" transform="rotate(-8)" />
                <rect x="-4" y="-2" width="2.4" height="2" fill="#2a1a10" transform="rotate(-8)" />
                <rect x="0" y="-2" width="2.4" height="2" fill="#2a1a10" transform="rotate(-8)" />
                <circle cx="-3.5" cy="3.4" r="1.4" fill="#2a1a10" />
                <circle cx="3.8" cy="2.4" r="1.4" fill="#2a1a10" />
              </g>
            );
          })}

          {/* 2.1.2 : le Train des 200, en direct */}
          <Train200MapLayer k={k} />
          <HalloweenMapLayer k={k} />

          {/* les rames : couleur de leur ligne, une traînée derrière elles */}
          {trains.map((t) => {
            const p = trainPos.get(t.id);
            if (!p) return null;
            const trail = [1, 2, 3, 4, 5, 6]
              .map((n) => positionOnRoute(p.route, p.lineIndex, p.direction, Math.max(0, p.ratio - n * 0.018)))
              .filter((q): q is NonNullable<typeof q> => !!q);
            const pts = [{ x: p.x, y: p.y }, ...trail];
            const couchettes = t.model === "COUCHETTES";
            const isSel = selTrain?.id === t.id;
            return (
              <g key={t.id} onClick={(e) => { e.stopPropagation(); if (!camera.wasDrag()) { setSelected({ kind: "rame", id: t.id }); } }} style={{ cursor: "pointer" }}>
                {pts.slice(0, -1).map((q, n) => (
                  <line key={n} x1={q.x} y1={q.y} x2={pts[n + 1].x} y2={pts[n + 1].y} stroke={p.color} strokeWidth={(2.8 - n * 0.32) * k} strokeLinecap="round" opacity={0.75 - n * 0.12} />
                ))}
                <circle cx={p.x} cy={p.y} r={11 * k} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={6 * k} fill={p.color} opacity="0.35" filter="url(#map-glow)" />
                {isSel && <circle cx={p.x} cy={p.y} r={9 * k} fill="none" stroke="rgb(var(--c-offwhite))" strokeWidth={1.2 * k} />}
                <g transform={`translate(${p.x},${p.y}) rotate(${p.angle}) scale(${k})`}>
                  <rect x="-6" y="-2.5" width="12" height="5" rx="2.5" fill={couchettes ? "rgb(var(--c-navy-900))" : p.color} stroke="rgb(var(--c-offwhite))" strokeWidth="0.8" />
                  <rect x="2.4" y="-1.4" width="2.4" height="2.8" rx="0.7" fill="rgb(var(--c-offwhite))" />
                  {couchettes && <circle cx="-2" cy="0" r="1" fill="rgb(var(--c-amber))" />}
                </g>
              </g>
            );
          })}

          {/* cargaisons en transit */}
          {activeFreight.map((c) => {
            const a = STATION_COORDS[c.originStation];
            const b = STATION_COORDS[c.destinationStation];
            if (!a || !b) return null;
            const ratio = c.acceptedAt ? Math.min(1, Math.max(0, (clock - new Date(c.acceptedAt).getTime()) / (c.durationMinutes * 60_000))) : (c.train?.progress ?? 0) / 100;
            const x = a.x + (b.x - a.x) * ratio;
            const y = a.y + (b.y - a.y) * ratio;
            return (
              <g key={c.id} transform={`translate(${x},${y}) scale(${k})`} pointerEvents="none">
                <rect x="-5" y="-5" width="10" height="10" fill="rgb(var(--c-navy-950))" stroke="rgb(var(--c-amber))" strokeWidth="1.5" />
                <rect x="-2.5" y="-2.5" width="5" height="5" fill="rgb(var(--c-amber))" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* ---- panneaux posés sur la carte ---- */}

      {/* en haut à gauche : l'état du réseau, et le tracé */}
      <div className="absolute top-3 left-3 right-3 md:right-auto flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-1 bg-navy-900/90 border border-line backdrop-blur-sm px-3 py-2 font-mono2 text-[10.5px] uppercase tracking-wide text-slate2">
          <span className="text-cobalt whitespace-nowrap">{lines.length} ligne{lines.length !== 1 ? "s" : ""}</span>
          <span className="text-rail-green whitespace-nowrap">{enRouteCount} en circulation</span>
          {activeFreight.length > 0 && <span className="text-amber whitespace-nowrap">{activeFreight.length} fret{activeFreight.length !== 1 ? "s" : ""}</span>}
          {night && <span className="text-cobalt whitespace-nowrap">Service de nuit</span>}
          <button
            onClick={() => {
              resetDraw();
              setSelected(null);
              setDrawing((d) => !d);
            }}
            className={`font-mono2 text-[10.5px] uppercase tracking-[0.12em] px-2.5 py-1 border transition-colors ${drawing ? "border-cobalt text-cobalt bg-cobalt/10" : "border-line text-offwhite hover:border-slate2"}`}
          >
            {drawing ? "Annuler le tracé" : "Tracer une ligne"}
          </button>
        </div>
        {drawing && (
          <div className="pointer-events-auto bg-navy-900/95 border border-cobalt/50 backdrop-blur-sm px-3 py-2.5 max-w-[440px]">
            {!from && <p className="text-xs font-body text-slate2">Touchez la gare de départ.</p>}
            {from && !to && (
              <p className="text-xs font-body text-slate2">
                Départ : <span className="text-offwhite">{from}</span>. Touchez la gare suivante.
              </p>
            )}
            {from && to && draft && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-body text-slate2 leading-relaxed">
                  {picks.map((n, i) => (
                    <span key={n}>
                      {i > 0 && <span className="text-slate2/60"> → </span>}
                      <span className={i === 0 || i === picks.length - 1 ? "text-offwhite" : "text-cobalt"}>{n}</span>
                    </span>
                  ))}
                  <div className="font-mono2 text-[11px] mt-0.5">
                    {draft.km} km · <span className="text-amber">{draft.minutes} min</span>
                    {draft.stops > 0 && <> · {draft.stops} arrêt{draft.stops > 1 ? "s" : ""} <span className="text-rail-green">(+{draft.stops * 20} % de voyageurs)</span></>}
                  </div>
                  <div className="text-[11px] text-slate2/80 mt-0.5">Touchez une autre gare pour prolonger ; retouchez la dernière pour l'enlever.</div>
                </div>
                <div className="flex gap-2">
                  <input value={lineName} onChange={(e) => setLineName(e.target.value)} className="flex-1 min-w-0 bg-navy-950 border border-line px-2.5 py-1.5 text-sm font-body text-offwhite focus:border-cobalt outline-none" placeholder="Nom de la ligne (facultatif)" />
                  <button onClick={createFromMap} disabled={saving} className="bg-cobalt text-onaccent font-mono2 text-[11px] uppercase tracking-[0.12em] px-3 py-1.5 hover:bg-cobalt/90 disabled:opacity-50">
                    Ouvrir
                  </button>
                  <button onClick={resetDraw} className="font-mono2 text-[11px] uppercase px-2.5 py-1.5 border border-line text-slate2 hover:text-offwhite">
                    ↺
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* à droite : vos lignes, repliable */}
      <div className="absolute top-3 right-3 hidden md:flex flex-col items-end gap-2 max-h-[calc(100%-110px)]">
        <button onClick={() => setLinesOpen((o) => !o)} className="bg-navy-900/90 border border-line backdrop-blur-sm px-3 py-1.5 font-mono2 text-[10.5px] uppercase tracking-[0.14em] text-slate2 hover:text-offwhite">
          Vos lignes ({lines.length}) {linesOpen ? "▴" : "▾"}
        </button>
        {linesOpen && lines.length > 0 && (
          <ul className="w-[230px] overflow-y-auto bg-navy-900/90 border border-line backdrop-blur-sm py-1.5">
            {lines.map((l, i) => {
              const running = trains.filter((t) => t.line?.id === l.id && t.status === "EN_ROUTE");
              const a = STATION_COORDS[l.departureStation];
              const b = STATION_COORDS[l.arrivalStation];
              return (
                <li key={l.id}>
                  <button
                    onClick={() => a && b && camera.flyTo((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(cam.zoom, 2.2))}
                    className="w-full text-left flex items-start gap-2 px-3 py-1.5 hover:bg-navy-950/60"
                  >
                    <span className="w-3 h-[3px] mt-[7px] rounded-full shrink-0" style={{ background: LINE_PALETTE[i % LINE_PALETTE.length] }} />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-body text-offwhite">{l.name}</span>
                      <span className={`text-[10.5px] font-mono2 ${running.length ? "text-rail-green" : "text-slate2"}`}>
                        {running.length ? `${running.length} rame${running.length > 1 ? "s" : ""} en route` : "sans rame"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* en bas à gauche : échelle et légende */}
      <div className="absolute bottom-3 left-3 flex flex-col items-start gap-2">
        {legendOpen && (
          <div className="bg-navy-900/95 border border-line backdrop-blur-sm px-3 py-2.5 flex flex-col gap-1.5 text-[10.5px] font-mono2 text-slate2 uppercase tracking-wide">
            <span className="flex items-center gap-2"><span className="w-4 h-[3px] rounded-full bg-cobalt shrink-0" /> Ligne en service</span>
            <span className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed border-slate2 shrink-0" /> Ligne sans rame</span>
            <span className="flex items-center gap-2"><span className="w-3 h-1.5 rounded-full bg-cobalt border border-offwhite shrink-0" /> Rame en circulation</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-offwhite border border-cobalt shrink-0" /> Gare desservie</span>
            <span className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dashed border-amber shrink-0" /> Trajet de fret</span>
            <span className="flex items-center gap-2"><span className="w-4 h-0.5 border-t border-dotted border-slate2 shrink-0" /> Liaison d'un concurrent</span>
            <span className="flex items-center gap-2"><span className="px-1 text-[9px] leading-[13px] border border-amber text-amber shrink-0">+35 %</span> Affluence en gare</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rotate-45 border border-cobalt shrink-0 mx-0.5" /> Correspondance</span>
          </div>
        )}
        <div className="flex items-end gap-3">
          <button onClick={() => setLegendOpen((o) => !o)} className="bg-navy-900/90 border border-line backdrop-blur-sm px-2.5 py-1.5 font-mono2 text-[10.5px] uppercase tracking-[0.14em] text-slate2 hover:text-offwhite">
            Légende
          </button>
          <button
            onClick={toggleRivals}
            aria-pressed={showRivals}
            title={showRivals ? "Masquer les liaisons des autres compagnies" : "Afficher les liaisons des autres compagnies"}
            className={`bg-navy-900/90 border backdrop-blur-sm px-2.5 py-1.5 font-mono2 text-[10.5px] uppercase tracking-[0.14em] flex items-center gap-2 ${showRivals ? "border-slate2 text-offwhite" : "border-line text-slate2 hover:text-offwhite"}`}
          >
            <span className={`w-4 h-0.5 border-t border-dotted shrink-0 ${showRivals ? "border-offwhite" : "border-slate2"}`} />
            Concurrents {showRivals ? "affichés" : "masqués"}
          </button>
          <div className="pointer-events-none flex flex-col items-start" aria-label={`Échelle : ${scaleBar.km} km`}>
            <span className="font-mono2 text-[10px] text-slate2 mb-0.5">{scaleBar.km} km</span>
            <span className="block h-1.5 border-x border-b border-slate2" style={{ width: scaleBar.px }} />
          </div>
        </div>
      </div>

      {/* en bas à droite : zoom, recentrer, plein écran */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button onClick={() => camera.zoomAt(1.5)} className={ctrl} aria-label="Zoomer" title="Zoomer">+</button>
        <button onClick={() => camera.zoomAt(1 / 1.5)} className={ctrl} aria-label="Dézoomer" title="Dézoomer">−</button>
        <button onClick={() => { setFollow(null); camera.reset(); }} className={ctrl} aria-label="Recentrer sur la France" title="Recentrer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
        </button>
        <button onClick={toggleFullscreen} className={`${ctrl} hidden md:flex`} aria-label="Plein écran" title="Plein écran">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        </button>
      </div>

      {/* fiche de gare ou de rame, accrochée à son point sur la carte */}
      {cardAnchor && (selStation || selTrain) && !drawing && (
        <MapCard
          anchor={cardAnchor}
          frame={camera.size}
          onClose={() => { setSelected(null); setFollow(null); }}
        >
          {selStation && (() => {
            const st = stationOf(network, selStation);
            const mine = lines.filter((l) => l.departureStation === selStation || l.arrivalStation === selStation);
            const hub = network?.hubs?.find((h) => h.station === selStation);
            const rivals = (network?.pairs ?? []).filter((p) => (p.a === selStation || p.b === selStation) && !p.mine).length;
            return (
              <>
                <div className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-slate2">{st?.sizeLabel ?? "Gare"}{isIntl(selStation) ? " · à l'étranger" : ""}</div>
                <div className="font-display text-xl leading-tight">{selStation}</div>
                <div className="font-mono2 text-[11.5px] text-slate2 mt-1">
                  Demande <span className={st && st.demand > 1 ? "text-rail-green" : st && st.demand < 1 ? "text-rail-red" : "text-offwhite"}>×{(st?.demand ?? 1).toFixed(2).replace(".", ",")}</span>
                  {hub && <> · correspondance <span className="text-cobalt">+{hub.bonus} %</span></>}
                </div>
                {(st?.events ?? []).map((e) => (
                  <div key={e.label} className={`text-[12px] font-body mt-1 ${e.multiplier > 1 ? "text-amber" : "text-rail-red"}`}>
                    {e.label} : {e.multiplier > 1 ? "+" : "−"}{Math.abs(Math.round((e.multiplier - 1) * 100))} % jusqu'à {new Date(e.endsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                ))}
                <div className="text-[12px] font-body text-slate2 mt-1.5">
                  {mine.length ? `${mine.length} de vos lignes y passent` : "Aucune de vos lignes ne la dessert"}
                  {rivals > 0 && ` · ${rivals} liaison${rivals > 1 ? "s" : ""} concurrente${rivals > 1 ? "s" : ""}`}
                </div>
                {wrecks.filter((w) => w.station === selStation).map((w) => (
                  <div key={w.id} className="mt-2 border-t border-line pt-2">
                    <div className="text-[12px] font-body" style={{ color: RARITY_COLOR[w.rarity] }}>Épave {w.rarityLabel.toLowerCase()} à l'abandon</div>
                    <div className="text-[13px] font-body text-offwhite">{w.label} {w.serial}</div>
                    {onOpenWrecks && (
                      <button onClick={() => { setSelected(null); onOpenWrecks(); }} className="mt-1.5 w-full border border-amber/60 text-amber text-[12.5px] font-body py-1 hover:bg-amber/10">
                        Voir l'épave, {w.price} pi.
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => { setSelected(null); resetDraw(); setDrawing(true); setPicks([selStation]); }}
                  className="mt-2.5 w-full bg-cobalt text-onaccent font-mono2 text-[10.5px] uppercase tracking-[0.12em] py-1.5 hover:bg-cobalt/90"
                >
                  Tracer une ligne d'ici
                </button>
              </>
            );
          })()}
          {selTrain && (() => {
            const p = trainPos.get(selTrain.id);
            return (
              <>
                <div className="font-mono2 text-[10px] uppercase tracking-[0.18em] text-slate2">{selTrain.model.replace("_", " ").toLowerCase()}</div>
                <div className="font-display text-xl leading-tight">{selTrain.name}</div>
                {selTrain.line && p && (
                  <div className="text-[12.5px] font-body text-offwhite mt-1">
                    {p.stoppedAt ? <>À quai à <b>{p.stoppedAt}</b></> : <>Vers <b>{p.next}</b></>}
                    <span className="text-slate2"> · terminus {p.direction === 1 ? selTrain.line.departureStation : selTrain.line.arrivalStation}</span>
                  </div>
                )}
                {selTrain.lastSeats ? (
                  <div className="text-[11.5px] font-mono2 text-slate2 mt-1">
                    Dernier trajet : {selTrain.lastPassengers ?? 0}/{selTrain.lastSeats} voyageurs
                  </div>
                ) : null}
                <div className="h-1 bg-line mt-2">
                  <div className="h-full bg-rail-green" style={{ width: `${Math.round((p?.ratio ?? 0) * 100)}%` }} />
                </div>
                <div className="flex justify-between font-mono2 text-[11px] text-slate2 mt-1">
                  <span>{Math.round((p?.ratio ?? 0) * 100)} % du trajet</span>
                  <span className={selTrain.wear >= 70 ? "text-rail-red" : ""}>usure {selTrain.wear} %</span>
                </div>
                <button
                  onClick={() => setFollow((f) => (f === selTrain.id ? null : selTrain.id))}
                  className={`mt-2.5 w-full font-mono2 text-[10.5px] uppercase tracking-[0.12em] py-1.5 border ${follow === selTrain.id ? "border-rail-green text-rail-green bg-rail-green/10" : "border-line text-offwhite hover:border-slate2"}`}
                >
                  {follow === selTrain.id ? "Suivi en cours" : "Suivre la rame"}
                </button>
              </>
            );
          })()}
        </MapCard>
      )}

      {lines.length === 0 && !drawing && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-16 bg-navy-900/95 border border-line px-4 py-2.5 text-[12.5px] font-body text-slate2 text-center max-w-[90%]">
          Aucune ligne pour l'instant : touchez une gare, puis « Tracer une ligne d'ici ».
        </div>
      )}
    </div>
  );
}

/* Une fiche flottante accrochée à un point de la carte, qui ne sort jamais du cadre. */
function MapCard({ anchor, frame, onClose, children }: { anchor: { x: number; y: number }; frame: { w: number; h: number }; onClose: () => void; children: React.ReactNode }) {
  const W = 240;
  const left = Math.min(Math.max(anchor.x + 16, 8), frame.w - W - 8);
  const top = Math.min(Math.max(anchor.y - 40, 60), frame.h - 230);
  return (
    <div className="absolute z-10 bg-navy-900 border border-line border-t-2 border-t-cobalt shadow-2xl px-3.5 py-3 tutorial-step-enter" style={{ left, top, width: W }} onPointerDown={(e) => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-1.5 right-2 text-slate2 hover:text-offwhite text-lg leading-none" aria-label="Fermer">×</button>
      {children}
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

interface StaffMember {
  id: string;
  role: string;
  roleLabel: string;
  name: string;
  level: number;
  xp: number;
  xpForNext: number | null;
  hoursToNext: number | null;
  raiseRequested: boolean;
  salaryPerHour: number;
  raiseSalaryPerHour: number | null;
  effect: string;
  nextEffect: string | null;
  covered?: number | null;
  savingsPerHour?: number;
  // 2.0 : équipage
  crew?: boolean;
  trainId?: string | null;
  trainName?: string | null;
}

interface StaffOverview {
  members: StaffMember[];
  trainCount: number;
  coverage: { MECANICIEN: number; CHEF_DEPOT: number };
  effects: { wearReduction: number; repairReduction: number; revenueBonus: number };
  payrollPerHour: number;
  roles: { id: string; label: string; unique: boolean; minGradeId: number; salaryPerHour: number; effect: string }[];
}

// seuils d'expérience (en cycles), recopiés du serveur pour la barre de progression
const STAFF_LEVEL_XP = [0, 720, 2880, 8640, 20160];

function formatHoursShort(h: number) {
  if (h < 1) return "moins d'1 h";
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} j`;
}

/* ============================================================
   Personnel.

   La page répond à deux questions, dans cet ordre :
   1. Qui attend une réponse de ma part ? (les demandes d'augmentation, en haut)
   2. Mon équipe suit-elle ma flotte ? (la couverture, poste par poste)
   Le reste — la fiche de chaque employé — se consulte ensuite.
   ============================================================ */
function StaffSection({ staff, gradeId, onChange, trains = [], uniform = null, livery }: { staff: Staff[]; gradeId: number; onChange: () => void; trains?: { id: string; name: string; model: string }[]; uniform?: string | null; livery?: string }) {
  const [overview, setOverview] = useState<StaffOverview | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmFire, setConfirmFire] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    try {
      const { data } = await api.get("/staff/overview");
      setOverview(data);
      setUnavailable(false);
    } catch {
      // serveur pas encore à jour : on garde l'ancienne présentation
      setUnavailable(true);
    }
  }

  // se recharge quand le tableau de bord voit bouger l'équipe (départ, demande, niveau)
  const staffKey = staff.map((s) => `${s.id}:${s.level ?? 1}:${s.raiseRequested ? 1 : 0}`).join("|");
  useEffect(() => {
    load();
  }, [staffKey]);

  async function hire(role: string, label: string) {
    setBusy(`hire:${role}`);
    try {
      const { data } = await api.post("/staff/hire", { role });
      showToast(data?.name ? `${data.name} rejoint la compagnie · ${label}` : `${label} embauché`);
      await load();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  async function fire(m: { id: string; name: string }) {
    setBusy(`fire:${m.id}`);
    try {
      await api.post("/staff/fire", { staffId: m.id });
      showToast(`${m.name} a quitté la compagnie`);
      setConfirmFire(null);
      await load();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  // 2.0 : faire monter un équipier à bord d'une rame (ou l'en faire descendre)
  async function assignTo(m: StaffMember, trainId: string | null) {
    setBusy(`assign:${m.id}`);
    try {
      await api.post("/staff/assign", { staffId: m.id, trainId });
      const tn = trains.find((t) => t.id === trainId)?.name;
      showToast(trainId ? `${m.name} monte à bord de ${tn ?? "la rame"}` : `${m.name} redescend au dépôt`);
      await load();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  async function answer(m: StaffMember, accept: boolean) {
    setBusy(`raise:${m.id}`);
    try {
      await api.post("/staff/raise", { staffId: m.id, accept });
      showToast(accept ? `${m.name} passe au niveau ${m.level + 1}` : `${m.name} reste au niveau ${m.level}`);
      await load();
      onChange();
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Erreur", "error");
    } finally {
      setBusy(null);
    }
  }

  if (unavailable) return <LegacyStaffSection staff={staff} gradeId={gradeId} onChange={onChange} />;
  if (!overview) return <p className="text-sm text-slate2 font-body">Chargement du personnel…</p>;

  const { members, trainCount, coverage, effects, payrollPerHour, roles } = overview;
  const requests = members.filter((m) => m.raiseRequested);

  return (
    <div>
      {/* ---- demandes en attente ---- */}
      {requests.length > 0 && (
        <section className="mb-8 border border-amber/40 bg-amber/5">
          <h2 className="px-4 pt-3 pb-2 font-mono2 text-[11px] uppercase tracking-[0.14em] text-amber">
            {requests.length === 1 ? "Une demande d'augmentation" : `${requests.length} demandes d'augmentation`}
          </h2>
          <ul className="divide-y divide-amber/20">
            {requests.map((m) => (
              <li key={m.id} className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex-1 min-w-[220px]">
                  <div className="font-body text-sm text-offwhite">
                    {m.name} <span className="text-slate2">· {m.roleLabel}, niveau {m.level}</span>
                  </div>
                  <p className="text-xs text-slate2 font-body mt-0.5">
                    Niveau {m.level + 1} : {m.nextEffect} — salaire {m.salaryPerHour} → {m.raiseSalaryPerHour} pi./h
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => answer(m, true)}
                    disabled={busy !== null}
                    className="text-[11px] font-mono2 uppercase text-onaccent bg-cobalt px-3 py-1.5 disabled:opacity-50"
                  >
                    Accorder · +{(m.raiseSalaryPerHour ?? m.salaryPerHour) - m.salaryPerHour} pi./h
                  </button>
                  <button
                    onClick={() => answer(m, false)}
                    disabled={busy !== null}
                    className="text-[11px] font-mono2 uppercase text-slate2 border border-line px-3 py-1.5 hover:text-offwhite disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-4 pb-3 pt-1 text-[11.5px] text-slate2 font-body">
            Refuser ne fait partir personne : l'employé reste à son niveau et redemandera plus tard.
          </p>
        </section>
      )}

      {/* ---- synthèse ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line mb-8">
        {[
          { label: "Usure réduite de", value: `${effects.wearReduction} %` },
          { label: "Réparations moins chères de", value: `${effects.repairReduction} %` },
          { label: "Recettes augmentées de", value: `${effects.revenueBonus} %` },
          { label: "Masse salariale", value: `${payrollPerHour} pi./h` },
        ].map((c) => (
          <div key={c.label} className="px-4 py-3 bg-navy-950">
            <div className="font-mono2 text-lg text-offwhite">{c.value}</div>
            <div className="text-[10.5px] text-slate2 font-body uppercase tracking-[0.1em] mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ---- un bloc par poste ---- */}
      <div className="space-y-8">
        {roles.map((role) => {
          const team = members.filter((m) => m.role === role.id);
          const locked = role.minGradeId > gradeId;
          const covered = role.id === "MECANICIEN" ? coverage.MECANICIEN : role.id === "CHEF_DEPOT" ? coverage.CHEF_DEPOT : null;
          const canHire = !locked && !(role.unique && team.length > 0) && team.length < 8;
          const uncovered = covered !== null && trainCount > 0 && covered < trainCount;

          return (
            <section key={role.id}>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                <div>
                  <h2 className="font-display text-xl leading-tight flex items-center gap-2">
                    <StaffMark size={16} className={team.length ? "text-cobalt" : "text-slate2"} />
                    {role.label}
                    {role.minGradeId > 0 && (
                      <span className="text-[10px] font-mono2 uppercase text-amber border border-amber/40 px-1.5 py-0.5">
                        {GRADE_NAMES[role.minGradeId]}
                      </span>
                    )}
                  </h2>
                  {role.id === "CONTROLEUR" || role.id === "CONDUCTEUR" ? (
                    <p className="text-xs text-slate2 font-body mt-1">
                      Monte à bord d'une rame :{" "}
                      {team.filter((m) => m.trainId).length} affecté{team.filter((m) => m.trainId).length > 1 ? "s" : ""} sur {trainCount} rame{trainCount > 1 ? "s" : ""}
                      {team.some((m) => !m.trainId) ? " — un équipier au dépôt est payé sans rien apporter" : ""}
                    </p>
                  ) : covered !== null ? (
                    <p className={`text-xs font-body mt-1 ${uncovered ? "text-amber" : "text-slate2"}`}>
                      {trainCount === 0
                        ? "Aucune rame à couvrir pour l'instant"
                        : `${covered} rame${covered > 1 ? "s" : ""} couverte${covered > 1 ? "s" : ""} sur ${trainCount}`}
                      {uncovered && (role.id === "CHEF_DEPOT" ? " — les autres se réparent au tarif normal" : " — les autres s'usent au tarif normal")}
                    </p>
                  ) : (
                    <p className="text-xs text-slate2 font-body mt-1">Un seul par compagnie · agit sur toute la flotte</p>
                  )}
                </div>
                {canHire ? (
                  <button
                    onClick={() => hire(role.id, role.label)}
                    disabled={busy !== null}
                    className="text-[11px] font-mono2 uppercase text-cobalt border border-cobalt/40 px-3 py-1.5 hover:bg-cobalt/10 transition-colors disabled:opacity-50"
                  >
                    {busy === `hire:${role.id}` ? "…" : `Embaucher · ${role.salaryPerHour} pi./h`}
                  </button>
                ) : locked ? (
                  <span className="text-[11px] font-mono2 uppercase text-slate2 border border-line px-3 py-1.5">Grade insuffisant</span>
                ) : null}
              </div>

              {covered !== null && trainCount > 0 && (
                <div className="h-1 bg-line mb-3" aria-hidden>
                  <div
                    className={`h-full ${uncovered ? "bg-amber" : "bg-rail-green"}`}
                    style={{ width: `${Math.min(100, (covered / trainCount) * 100)}%` }}
                  />
                </div>
              )}

              {team.length === 0 ? (
                <p className="text-[12.5px] text-slate2 font-body border border-dashed border-line px-4 py-3">
                  Personne à ce poste. Au niveau 1 : {role.effect.charAt(0).toLowerCase() + role.effect.slice(1)}.
                </p>
              ) : (
                <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {team.map((m) => {
                    const from = STAFF_LEVEL_XP[m.level - 1] ?? 0;
                    const pct = m.xpForNext ? Math.min(100, ((m.xp - from) / (m.xpForNext - from)) * 100) : 100;
                    return (
                      <li key={m.id} className={`p-4 border ${m.raiseRequested ? "border-amber/50" : "border-line"} bg-navy-900/40`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* 2.1 : le portrait, dans la tenue choisie en boutique */}
                            <StaffFigure uniform={uniform} seed={m.name} size={34} accent={livery} className="shrink-0 -mb-1" />
                            <div className="font-body text-sm text-offwhite truncate">{m.name}</div>
                          </div>
                          <span className="font-mono2 text-[11px] text-slate2 shrink-0">Niv. {m.level}</span>
                        </div>
                        <p className="text-xs text-slate2 font-body mt-1">{m.effect}</p>
                        {m.crew && (
                          <label className="flex items-center gap-2 mt-2 text-[13px] font-body">
                            <span className={m.trainId ? "text-rail-green" : "text-amber"}>{m.trainId ? "À bord de" : "Au dépôt"}</span>
                            <select
                              value={m.trainId ?? ""}
                              onChange={(e) => assignTo(m, e.target.value || null)}
                              disabled={busy !== null}
                              className="bg-navy-950 border border-line px-2 py-1 text-[13px] min-w-0 flex-1"
                              aria-label={`Rame de ${m.name}`}
                            >
                              <option value="">Aucune rame</option>
                              {trains
                                .filter((t) => m.role !== "CONTROLEUR" || t.model !== "FRET_LOURD")
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}

                        <div className="mt-3">
                          <div className="h-1 bg-line" aria-hidden>
                            <div className="h-full bg-cobalt" style={{ width: `${Math.max(0, pct)}%` }} />
                          </div>
                          <div className="text-[10.5px] font-mono2 text-slate2 mt-1">
                            {m.level >= 5
                              ? "Niveau maximal"
                              : m.raiseRequested
                              ? "Attend votre réponse"
                              : m.hoursToNext === 0
                              ? "Redemandera une augmentation bientôt"
                              : `Niveau ${m.level + 1} dans ${formatHoursShort(m.hoursToNext ?? 0)} de service`}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[11px] font-mono2 leading-snug">
                            <span className="text-amber">coûte {m.salaryPerHour} pi./h</span>
                            {m.savingsPerHour !== undefined && (
                              <span
                                className={m.savingsPerHour > m.salaryPerHour ? "text-rail-green block" : "text-slate2 block"}
                                title="Estimation, rames en service en continu"
                              >
                                {m.role === "DIRECTEUR_COMMERCIAL" ? "rapporte" : "fait économiser"} ~{m.savingsPerHour} pi./h
                              </span>
                            )}
                          </span>
                          {confirmFire === m.id ? (
                            <span className="flex gap-2">
                              <button
                                onClick={() => fire(m)}
                                disabled={busy !== null}
                                className="text-[11px] font-mono2 uppercase text-rail-red border border-rail-red/50 px-2 py-1 disabled:opacity-50"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setConfirmFire(null)}
                                className="text-[11px] font-mono2 uppercase text-slate2 border border-line px-2 py-1"
                              >
                                Annuler
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmFire(m.id)}
                              className="text-[11px] font-mono2 uppercase text-slate2 hover:text-rail-red border border-line px-2 py-1 transition-colors"
                            >
                              Licencier
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-[11.5px] text-slate2 font-body mt-8 max-w-[70ch]">
        Chaque employé gagne de l'expérience en service : niveau 2 après 6 h, puis 1 jour, 3 jours et une semaine.
        Licencier un vétéran fait perdre son expérience — son remplaçant repart du niveau 1. Mécaniciens et chefs
        de dépôt ne sont pas payés quand aucune de vos rames ne roule.
      </p>
    </div>
  );
}

/* Ancienne présentation, gardée pour la fenêtre où le site est à jour mais pas
   encore le serveur. */
function LegacyStaffSection({ staff, gradeId, onChange }: { staff: Staff[]; gradeId: number; onChange: () => void }) {
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
  onOpenShop,
}: {
  company: Company;
  referral: ReferralInfo | null;
  onChange: () => void;
  onOpenShop: () => void;
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

      <SoundsPanel />

      <ThemePanel
        current={company.theme ?? readLocalTheme()}
        owned={company.unlocked?.themes ?? ["sombre", "papier"]}
        onChange={onChange}
        onOpenShop={onOpenShop}
      />

      <NotificationsPanel />

      <DiscordPanel />

      <InstallPanel />

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
            ["Vue cabine", "Suivez chacune de vos rames en direct, de profil, avec la météo du réseau et votre livrée"],
            ["Veille concurrentielle", "Le détail de chaque concurrent sur vos lignes, et une notification quand l'un d'eux arrive ou vous passe devant"],
            ["Licence internationale en avance", "Achetez la licence et ouvrez vos lignes vers Londres, Bruxelles ou Milan une semaine avant tout le monde"],
            ["Appels d'offres en avance", "Les marchés de la semaine suivante dès le dimanche, le nombre d'offres déjà déposées, et une notification du résultat"],
            ["Événements de gare annoncés", "Salons, festivals, grèves : vous les voyez une heure avant qu'ils commencent"],
            ["Rentabilité détaillée", "Recettes, pannes et bénéfice à l'heure de chaque ligne et de chaque rame"],
            ["Bilan de retour", "Ce qui s'est passé pendant votre absence, et un résumé de la nuit chaque matin"],
            ["File de chantiers", "Le chantier suivant démarre seul, même la nuit — sans aller plus vite"],
            ["Deux ordres par donneur d'ordre", "Plus de choix à la table, pas une meilleure prime"],
            ["Marché de fret élargi", "Six contrats visibles au lieu de trois"],
            ["Alertes personnalisées", "Trésorerie, usure, contrat de fret, reprise d'une rame : vous fixez le seuil, le jeu vous prévient"],
            ["Horaires par rame", "Une rame qui ne roule que la nuit ou aux heures de pointe, et se gare au terminus le reste du temps"],
            ["Cote de revente", "La reprise de chaque rame sur 14 jours et le meilleur jour de la semaine pour la vendre"],
            ["Alertes et ordres permanents", "Le marché vous prévient, ou achète et vend au seuil choisi — au même cours qu'un joueur présent"],
            ["Cinq marchandises en stock", "De la variété dans l'entrepôt, pas une unité de capacité en plus"],
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
            {company.premiumTrialUntil
              ? `Premium d'essai · jusqu'au ${trialEnd(company.premiumTrialUntil)}`
              : company.isPremium
                ? "Premium actif"
                : "Compte gratuit"}
          </span>

          {(!company.isPremium || Boolean(company.premiumTrialUntil)) &&
            (billingOpen ? (
              <PremiumCTA company={company} onChange={onChange} />
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

/* 2.0 : sons et vibrations, réglés par appareil */
function SoundsPanel() {
  const [on, setOn] = useState(soundsOn());
  return (
    <section className="border border-line p-5 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg">Sons et vibrations</h2>
          <p className="text-[13px] text-slate2 font-body mt-0.5">Le choc de l'attelage, le carillon de quai et une alerte quand une rame casse. Réglé sur cet appareil.</p>
        </div>
        <button
          role="switch"
          aria-checked={on}
          onClick={() => {
            setSoundsOn(!on);
            setOn(!on);
            if (!on) playChime();
          }}
          className={`shrink-0 w-12 h-7 border relative transition-colors ${on ? "bg-cobalt/30 border-cobalt" : "bg-navy-950 border-line"}`}
        >
          <span className={`absolute top-[3px] w-5 h-5 transition-all ${on ? "left-[24px] bg-cobalt" : "left-[3px] bg-slate2"}`} />
          <span className="sr-only">{on ? "Désactiver" : "Activer"} les sons</span>
        </button>
      </div>
    </section>
  );
}
