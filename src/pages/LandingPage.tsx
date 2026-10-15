import { RELEASE_171 } from "../release";
import { useEffect, useRef, useState } from "react";
import { LogoMark, LogoPaths } from "../components/Logo";
import { InstagramMark } from "../components/InstagramMark";
import { INSTAGRAM, DISCORD } from "../social";
import { DiscordMark } from "../components/DiscordMark";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "./landing.css";
import { LandingCab } from "../components/LandingCab";

/* ============================================================
   Page d'accueil (2.0, refaite) — le papier imprimé reste, mais la page
   prend les formes du chemin de fer au lieu de boîtes à angles droits :
   la vue cabine vue par une fenêtre de voiture, les nouveautés sous des
   arcades de gare, les systèmes sur des étiquettes à bagages, une horloge
   de quai, et deux vrais billets.
   ============================================================ */

interface NetworkStats {
  activeCompanies: number;
  trainsInService: number;
  punctuality: number;
  activeIncidents: number;
}

/* Jeu de caractères du panneau : les palettes défilent dans cet ordre,
   exactement comme un vrai Solari. */
const CH = " ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÉÈÊÎÔÛÜÇ0123456789-.%";

function Flaps({ text, length, small }: { text: string; length: number; small?: boolean }) {
  const [cells, setCells] = useState(() => Array.from({ length }, () => ({ c: " ", t: 0 })));
  const curRef = useRef<string[]>(Array.from({ length }, () => " "));
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const target = (text || "").toUpperCase().slice(0, length).padEnd(length, " ");
    timersRef.current.forEach((id) => window.clearInterval(id));
    timersRef.current = [];

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      curRef.current = target.split("");
      setCells(target.split("").map((c) => ({ c, t: 0 })));
      return;
    }

    target.split("").forEach((tc, i) => {
      if (curRef.current[i] === tc) return;
      let idx = CH.indexOf(curRef.current[i]);
      if (idx < 0) idx = 0;
      let steps = 0;
      const minSteps = 5 + i * 2; // le panneau se fige de gauche à droite
      const id = window.setInterval(() => {
        idx = (idx + 1) % CH.length;
        steps += 1;
        const ch = CH[idx];
        curRef.current[i] = ch;
        setCells((prev) => {
          const next = [...prev];
          next[i] = { c: ch, t: next[i].t + 1 };
          return next;
        });
        if (steps >= minSteps && ch === tc) {
          window.clearInterval(id);
        } else if (steps > minSteps + CH.length + 4) {
          curRef.current[i] = tc;
          setCells((prev) => {
            const next = [...prev];
            next[i] = { c: tc, t: next[i].t + 1 };
            return next;
          });
          window.clearInterval(id);
        }
      }, 42);
      timersRef.current.push(id);
    });

    return () => {
      timersRef.current.forEach((id) => window.clearInterval(id));
      timersRef.current = [];
    };
  }, [text, length]);

  return (
    <div className="lp-flaps">
      {cells.map((cell, i) => (
        <div className={"lp-flap" + (small ? " sm" : "")} key={i}>
          <span key={cell.t}>{cell.c === " " ? " " : cell.c}</span>
        </div>
      ))}
    </div>
  );
}

const VILLES = ["GRENOBLE", "STRASBOURG", "MULHOUSE", "BORDEAUX", "LE HAVRE", "TOULOUSE", "LE MANS", "CHARTRES"];

/* ---------- petits dessins des arcades, à l'encre ---------- */
function Motif({ id }: { id: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "saisons": // un podium et la livrée de saison
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true">
          <rect {...p} x="8" y="30" width="20" height="20" rx="3" />
          <rect {...p} x="30" y="18" width="20" height="32" rx="3" />
          <rect {...p} x="52" y="36" width="20" height="14" rx="3" />
          <path {...p} d="M40 4 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1z" />
        </svg>
      );
    case "alliances": // deux voies qui se rejoignent
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true">
          <path {...p} d="M6 10 C30 10 34 28 46 28 H76" />
          <path {...p} d="M6 46 C30 46 34 28 46 28" />
          <circle cx="46" cy="28" r="5" fill="currentColor" />
          <circle cx="6" cy="10" r="3.2" fill="currentColor" />
          <circle cx="6" cy="46" r="3.2" fill="currentColor" />
        </svg>
      );
    case "chantier": // la montagne et l'entrée du tunnel
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true">
          <path {...p} d="M2 50 L28 12 L40 26 L50 16 L78 50" />
          <path {...p} d="M30 50 V40 a10 10 0 0 1 20 0 V50" />
          <path {...p} d="M2 50 H78" />
        </svg>
      );
    case "atelier": // une clé à molette
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true">
          <path {...p} d="M22 44 L46 20" />
          <path {...p} d="M44 22 a10 10 0 1 1 10 10 l-4 -4 2 -6 -6 2 z" />
          <circle {...p} cx="20" cy="46" r="4" />
        </svg>
      );
    case "equipages": // la casquette du contrôleur
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true">
          <path {...p} d="M16 34 C16 16 64 16 64 34 Z" />
          <path {...p} d="M12 34 H68 C68 40 58 42 40 42 C22 42 12 40 12 34" />
          <rect {...p} x="34" y="24" width="12" height="6" rx="1.5" />
        </svg>
      );
    default: // la vapeur des extensions
      return (
        <svg viewBox="0 0 80 56" aria-hidden="true">
          <path {...p} d="M10 44 H66 V30 H50 V22 H30 V30 H10 Z" />
          <rect {...p} x="18" y="16" width="6" height="14" rx="1" />
          <circle {...p} cx="22" cy="48" r="4" />
          <circle {...p} cx="40" cy="48" r="4" />
          <circle {...p} cx="58" cy="48" r="4" />
          <circle {...p} cx="21" cy="9" r="3" />
          <circle {...p} cx="30" cy="5" r="2.2" />
        </svg>
      );
  }
}

const NOUVEAUTES = [
  { id: "saisons", t: "Les saisons", b: "Quatre semaines, un classement qui repart à zéro, et des divisions par taille : une compagnie fondée hier affronte des compagnies fondées hier. La livrée de saison ne se vend nulle part." },
  { id: "alliances", t: "Les alliances", b: "Jusqu'à cinq compagnies. Vos lignes se répondent dans les mêmes gares et rapportent plus, et aucun allié ne vous paie de redevance." },
  { id: "chantier", t: "Le Grand Chantier", b: "Tout le réseau creuse le tunnel du Mont-Blanc. Chaque trajet de chaque joueur le fait avancer ; à son ouverture, Turin et Zurich rejoignent la carte." },
  { id: "atelier", t: "L'atelier", b: "Freins, bogies, moteur, caisse : chaque organe s'use à son rythme. Une rame négligée casse, et il faut commander la pièce. Et les vieilles épaves se restaurent." },
  { id: "equipages", t: "Les équipages", b: "Un contrôleur à bord fait payer les fraudeurs ; un conducteur chevronné évite les incidents sur la voie. À vous de choisir quelles rames en profitent." },
  { id: "extensions", t: "Deux extensions", b: "La vapeur du week-end et le grand luxe des longues lignes, puis Chamonix, Briançon, la crémaillère et la saison de ski." },
];

const SYSTEMES = [
  { t: "Le dépôt", b: "Deux places pour commencer, aucun plafond. Chaque agrandissement est un chantier, plus long et plus cher que le précédent." },
  { t: "Les lignes", b: "Trente-huit gares en France et six à l'étranger. Les grandes gares attirent plus de voyageurs, et sur une ligne partagée, la meilleure compagnie les prend aux autres." },
  { t: "Le fret", b: "Des contrats qui expirent. Les cargaisons fragiles paient double, mais arrivent parfois en morceaux." },
  { t: "L'usure", b: "Chaque trajet fatigue quatre organes. Celui qui lâche demande sa pièce : au magasin, livrée dans l'heure, ou en express." },
  { t: "Le personnel", b: "Des employés nommés qui prennent de l'expérience et réclament leur augmentation." },
  { t: "La vraie météo", b: "Le temps qu'il fait vraiment dans chaque ville, relevé toutes les vingt minutes. Un orage à Lyon ralentit Paris–Marseille." },
  { t: "La réputation", b: "Le rapport entre trajets réussis et incidents. Elle multiplie vos recettes voyageurs, de moitié à plein tarif." },
  { t: "La carrière", b: "Quatorze grades, d'apprenti exploitant à empereur du rail. Les plus hauts se portent comme un titre." },
  { t: "Les appels d'offres", b: "Chaque semaine, trois régions mettent une liaison en concurrence. La plus petite subvention l'emporte." },
  { t: "Les correspondances", b: "Dix lignes éparpillées valent moins que dix lignes qui se rejoignent." },
  { t: "L'international", b: "Londres, Bruxelles, Francfort, Genève, Milan, Barcelone : recettes plus fortes, péage au réseau étranger." },
  { t: "Les trains de nuit", b: "De 22 h à 6 h, une rame couchettes rapporte trois fois plus. Le réseau travaille pendant que vous dormez." },
  { t: "Les voyageurs", b: "Des places, des arrêts, un prix de billet ligne par ligne. Trop cher, les quais se vident ; trop court, les voyageurs restent à quai." },
  { t: "Les infrastructures", b: "Achetez des gares et encaissez leurs commerces, ouvrez des ateliers, électrifiez vos lignes." },
  { t: "La finance", b: "Empruntez pour grandir, et achetez les actions des autres compagnies pour toucher leurs dividendes." },
];

const CONTINU = [
  { t: "Le temps est vrai", b: "Un trajet de dix minutes prend dix minutes. Pas de bouton « accélérer »." },
  { t: "La caisse tourne", b: "Chaque arrivée crédite la trésorerie et s'inscrit au grand livre, avec l'heure exacte." },
  { t: "Les incidents aussi", b: "Un retard peut survenir à n'importe quel moment, et il entame la réputation." },
  { t: "Les autres jouent", b: "Sur une ligne partagée, les voyageurs vont à la compagnie la plus attractive, même pendant votre absence." },
];

function pad(v: string | number, w: number) {
  return String(v).padStart(w, " ");
}

/* Horloge de quai : cadran rond, aiguille des secondes qui saute d'un cran. */
function StationClock({ now }: { now: Date }) {
  const s = now.getSeconds();
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;
  return (
    <svg className="lp-clock" viewBox="0 0 220 220" role="img" aria-label={`Il est ${now.getHours()} h ${String(now.getMinutes()).padStart(2, "0")}`}>
      <circle cx="110" cy="110" r="104" className="rim" />
      <circle cx="110" cy="110" r="94" className="face" />
      {Array.from({ length: 60 }, (_, i) => (
        <line
          key={i}
          x1="110"
          y1={i % 5 === 0 ? 24 : 22}
          x2="110"
          y2={i % 5 === 0 ? 42 : 28}
          className={i % 5 === 0 ? "tick big" : "tick"}
          transform={`rotate(${i * 6} 110 110)`}
        />
      ))}
      <line x1="110" y1="124" x2="110" y2="62" className="hand h" transform={`rotate(${h * 30} 110 110)`} />
      <line x1="110" y1="128" x2="110" y2="38" className="hand m" transform={`rotate(${m * 6} 110 110)`} />
      <g transform={`rotate(${s * 6} 110 110)`} className="hand s">
        <line x1="110" y1="136" x2="110" y2="48" />
        <circle cx="110" cy="48" r="8" />
      </g>
      <circle cx="110" cy="110" r="4" className="pin" />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [ville, setVille] = useState(VILLES[0]);
  const stampRef = useRef<SVGSVGElement | null>(null);

  /* fond papier tant que la vitrine est affichée, sans toucher au thème de la console */
  useEffect(() => {
    document.body.classList.add("lp-body");
    return () => document.body.classList.remove("lp-body");
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/network/stats");
        if (data && typeof data.activeCompanies === "number") setStats(data);
      } catch {
        // vitrine publique : si le backend dort, le panneau reste en attente
      }
    }
    load();
    const id = window.setInterval(load, 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVille(VILLES[i % VILLES.length]);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  /* le tampon du pied de page tombe quand on l'atteint */
  useEffect(() => {
    const stamp = stampRef.current;
    if (!stamp) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("hit");
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.6 }
    );
    io.observe(stamp);
    return () => io.disconnect();
  }, []);

  const two = (n: number) => String(n).padStart(2, "0");
  const register = () => navigate("/auth?mode=register");

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-hd">
          <a className="lp-mark" href="#haut" aria-label="Réseau, haut de page">
            <LogoMark size={30} />
            <b>Réseau</b>
          </a>
          <nav className="lp-nav" aria-label="Sections">
            <a href="#nouveautes">La 2.0</a>
            <a href="#exploiter">Le jeu</a>
            <a href="#direct">En continu</a>
            <a href="#billets">Billets</a>
          </nav>
          <a className="lp-social" href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer" aria-label={`Réseau sur Instagram (@${INSTAGRAM.handle})`}>
            <InstagramMark size={18} />
          </a>
          <a className="lp-social" href={DISCORD.url} target="_blank" rel="noopener noreferrer" aria-label="Le serveur Discord de Réseau">
            <DiscordMark size={18} />
          </a>
          <button className="lp-btn sm" onClick={register}>
            Fonder ma compagnie
          </button>
        </div>
      </header>

      {/* ---------- héros : le jeu vu par la fenêtre ---------- */}
      <section className="lp-hero" id="haut">
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-text">
            <p className="lp-kicker">Réseau 2.0, jeu de gestion ferroviaire dans le navigateur</p>
            <h1>Vos trains roulent même quand vous dormez.</h1>
            <p className="lp-lede">
              Tracez vos lignes, achetez vos rames, négociez le fret. Chaque mois, une nouvelle saison vous oppose à des
              compagnies de votre taille, même si vous arrivez ce soir.
            </p>
            <div className="lp-cta">
              <button className="lp-btn" onClick={register}>
                Fonder ma compagnie, c'est gratuit
              </button>
              <button className="lp-btn ghost" onClick={() => navigate("/auth")}>
                J'ai déjà une compagnie
              </button>
            </div>
          </div>
          <div className="lp-hero-window">
            <LandingCab />
          </div>
        </div>

        {/* le panneau des départs, comme sur le quai */}
        <div className="lp-wrap">
          <div className="lp-board" aria-label="Le réseau en ce moment">
            <span className="screw a" />
            <span className="screw b" />
            <div className="lp-board-row main">
              <span className="lp-lab">Prochain départ pour</span>
              <Flaps text={ville} length={11} />
              <span className="lp-board-clock">{two(now.getHours())}:{two(now.getMinutes())}</span>
            </div>
            <div className="lp-board-row">
              <span className="lp-stat">
                <Flaps text={stats ? pad(stats.activeCompanies, 4) : "   -"} length={4} small />
                <span className="lp-lab">compagnies</span>
              </span>
              <span className="lp-stat">
                <Flaps text={stats ? pad(stats.trainsInService, 4) : "   -"} length={4} small />
                <span className="lp-lab">rames en ligne</span>
              </span>
              <span className="lp-stat">
                <Flaps text={stats ? pad(`${stats.punctuality}%`, 4) : "   -"} length={4} small />
                <span className="lp-lab">à l'heure</span>
              </span>
              <span className="lp-stat">
                <Flaps text={stats ? pad(stats.activeIncidents, 3) : "  -"} length={3} small />
                <span className="lp-lab">incidents</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- la 2.0, sous les arcades ---------- */}
      <section id="nouveautes" className="lp-arcade-sec">
        <div className="lp-wrap">
          <h2 className="lp-h2">Ce qui change avec la 2.0</h2>
          <p className="lp-sub">Une console refaite, et surtout des façons de jouer avec les autres compagnies du réseau.</p>
          <div className="lp-arcades">
            {NOUVEAUTES.map((n, i) => (
              <article className={`lp-arch t${i % 3}`} key={n.id}>
                <div className="lp-arch-motif">
                  <Motif id={n.id} />
                </div>
                <h3>{n.t}</h3>
                <p>{n.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- les systèmes, sur des étiquettes à bagages ---------- */}
      <section id="exploiter" className="lp-tags-sec">
        <div className="lp-wrap">
          <h2 className="lp-h2">Quinze systèmes, tous reliés</h2>
          <p className="lp-sub">
            Rien de décoratif : une rame mal entretenue casse votre ponctualité, qui fait chuter vos recettes voyageurs,
            qui retarde votre prochain agrandissement.
          </p>
          <div className="lp-tags">
            {SYSTEMES.map((s, i) => (
              <article className="lp-tag" key={s.t} style={{ ["--tilt" as string]: `${[-0.8, 0.5, -0.3, 0.9, -0.6][i % 5]}deg` }}>
                <span className="lp-tag-hole" aria-hidden="true" />
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- en continu : l'horloge de quai ---------- */}
      <section id="direct" className="lp-clock-sec">
        <div className="lp-wrap lp-clock-grid">
          <StationClock now={now} />
          <div>
            <h2 className="lp-h2">Le réseau ne s'arrête pas</h2>
            <p className="lp-sub">
              La simulation tourne sur le serveur, toutes les trente secondes, jour et nuit. Vous fermez l'onglet, vos trains
              continuent leur trajet, encaissent, s'usent et tombent parfois en panne.
            </p>
            <ul className="lp-continu">
              {CONTINU.map((c) => (
                <li key={c.t}>
                  <b>{c.t}.</b> {c.b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- deux billets ---------- */}
      <section id="billets" className="lp-billets-sec">
        <div className="lp-wrap">
          <h2 className="lp-h2">Deux billets, le même réseau</h2>
          <p className="lp-sub">
            Tout le jeu est accessible sans payer, classements compris. Le Premium n'augmente ni vos recettes ni vos rames : il
            donne du choix et supprime la corvée. Une compagnie gratuite bien menée peut finir première.
          </p>

          <div className="lp-tickets">
            <div className="lp-tk">
              <div className="lp-tk-hd">
                <div>
                  <span className="cls">Seconde classe</span>
                  <h3>Exploitant</h3>
                </div>
                <div className="px">
                  0 €<small>pour toujours</small>
                </div>
              </div>
              <ul>
                <li>Dépôt sans plafond, chaque place un peu plus chère que la précédente</li>
                <li>Toutes les rames et tout le personnel, débloqués au grade</li>
                <li>Saisons, alliances, 112 succès, défi quotidien</li>
                <li>L'atelier, les pièces détachées, les épaves à restaurer</li>
                <li>La vraie météo des villes, sur chaque ligne</li>
                <li>Appels d'offres, correspondances, lignes internationales, trains de nuit</li>
                <li>Gares à acheter, ateliers, électrification, banque et bourse entre joueurs</li>
                <li>Application installable sur téléphone et ordinateur, sans store</li>
                <li>Un aperçu de la vue cabine sur chaque rame</li>
                <li>Publicité discrète : une bannière en bas de quelques pages, et des vidéos facultatives contre des pièces</li>
              </ul>
              <div className="lp-tk-ft">
                <button className="lp-btn ghost wide" onClick={register}>
                  Commencer
                </button>
              </div>
            </div>

            <div className="lp-tk prem">
              <div className="lp-tk-hd">
                <div>
                  <span className="cls">Première classe</span>
                  <h3>Premium</h3>
                </div>
                <div className="px">
                  dès 5,99 €<small>prix libre, 7,99 € conseillés</small>
                </div>
              </div>
              <ul className="cols">
                {RELEASE_171 && <li>Aucune publicité, nulle part</li>}
                <li>L'extension « Trains de légende » incluse</li>
                <li>Revente de vos rames, cote du jour et meilleur jour pour vendre</li>
                <li>Horaires par rame et alertes personnalisées</li>
                <li>À offrir à une autre compagnie</li>
                <li>Vue cabine en direct sur chaque rame</li>
                <li>Veille concurrentielle et événements de gare annoncés une heure avant</li>
                <li>Appels d'offres de la semaine suivante dès le dimanche</li>
                <li>Licence internationale une semaine avant tout le monde</li>
                <li>Rentabilité de chaque ligne et de chaque rame</li>
                <li>Prix du billet automatique, recalé en continu</li>
                <li>Remplissage heure par heure et heure de pointe</li>
                <li>Rapport de la semaine exportable en tableur</li>
                <li>Ordres de bourse automatiques et alertes de cours</li>
                <li>Alertes de rachat de gare et d'échéance</li>
                <li>Bilan de votre absence et résumé de la nuit</li>
                <li>File de chantiers qui démarre seule</li>
                <li>Six contrats de fret au lieu de quatre</li>
                <li>−20 % sur chaque place de dépôt</li>
                <li>Cargaisons fragiles deux fois moins exposées</li>
                <li>Huit livrées réservées, vos gares à vos couleurs</li>
              </ul>
              <div className="lp-tk-ft">
                <button className="lp-btn vert wide" onClick={register}>
                  Prendre ce billet
                </button>
                <p className="lp-tk-note">
                  Vous fixez le montant au moment de payer, à partir de 5,99 €. Au-delà, c'est un soutien au réseau : les
                  avantages sont les mêmes.
                  {RELEASE_171 && " Vous avez déjà retiré les pubs ? Le Premium vous coûte alors à partir de 4 €."} Paiement
                  unique par carte via Stripe, depuis votre compagnie : aucun abonnement, rien à résilier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <svg className="lp-quai" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 V30 C240 4 480 4 720 22 C960 40 1200 44 1440 18 V60 Z" />
        </svg>
        <div className="lp-foot">
          <div className="lp-wrap lp-ft">
            <div className="left">
              <h2>Le quai vous attend.</h2>
              <p>Création de compagnie en trente secondes. Aucune installation, rien à télécharger.</p>
              <button className="lp-btn light" onClick={register}>
                Fonder ma compagnie
              </button>
            </div>

            <svg ref={stampRef} className="lp-stamp" width="126" height="126" viewBox="0 0 126 126" aria-hidden="true">
              <circle cx="63" cy="63" r="53" fill="none" stroke="#e7a08f" strokeWidth="2.6" opacity=".9" />
              <circle cx="63" cy="63" r="43" fill="none" stroke="#e7a08f" strokeWidth="1" opacity=".7" />
              <path id="lp-s1" d="M 18 63 A 45 45 0 0 1 108 63" fill="none" />
              <text fontFamily="'Barlow Condensed',sans-serif" fontSize="11" fontWeight="600" fill="#e7a08f" letterSpacing="1.5">
                <textPath href="#lp-s1" startOffset="50%" textAnchor="middle">RÉSEAU NATIONAL</textPath>
              </text>
              <path id="lp-s2" d="M 19 67 A 44 44 0 0 0 107 67" fill="none" />
              <text fontFamily="'Barlow Condensed',sans-serif" fontSize="11" fontWeight="600" fill="#e7a08f" letterSpacing="1.5">
                <textPath href="#lp-s2" startOffset="50%" textAnchor="middle">SERVICE ASSURÉ</textPath>
              </text>
              <g transform="translate(43.5 43.1) scale(0.4)">
                <LogoPaths line="#e7a08f" node="#1f5c4d" />
              </g>
            </svg>
          </div>

          <div className="lp-wrap">
            <div className="lp-credit">
              <span>
                Développé par <b>Skylaize</b>
              </span>
              <a className="lp-credit-link" href={INSTAGRAM.url} target="_blank" rel="noopener noreferrer">
                <InstagramMark size={14} /> @{INSTAGRAM.handle}
              </a>
              <a className="lp-credit-link" href={DISCORD.url} target="_blank" rel="noopener noreferrer">
                <DiscordMark size={14} /> Discord
              </a>
              <span>React, Node et PostgreSQL, codé à la main</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
