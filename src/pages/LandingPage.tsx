import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "./landing.css";
import { LandingCab } from "../components/LandingCab";

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
      if (curRef.current[i] === tc) return; // palette déjà en place, inutile de la faire tourner

      let idx = CH.indexOf(curRef.current[i]);
      if (idx < 0) idx = 0;
      let steps = 0;
      const minSteps = 5 + i * 2; // décalage par colonne : le panneau se fige de gauche à droite

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
          // filet de sécurité : on se cale sur la cible plutôt que de tourner sans fin
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
          {/* la clé change à chaque bascule : le span est remonté, l'animation rejoue */}
          <span key={cell.t}>{cell.c === " " ? " " : cell.c}</span>
        </div>
      ))}
    </div>
  );
}

const VILLES = [
  "GRENOBLE", "STRASBOURG", "MULHOUSE", "BORDEAUX",
  "LE HAVRE", "TOULOUSE", "LE MANS", "CHARTRES",
];

const SYSTEMES = [
  { n: "01", t: "Le dépôt", s: "Matériel",
    b: "Deux places pour commencer, aucun plafond. Chaque agrandissement est un chantier, plus long et plus cher que le précédent." },
  { n: "02", t: "Les lignes", s: "Exploitation",
    b: "Trente-huit gares, de Paris la capitale à La Rochelle. Les grandes gares attirent plus de voyageurs, et sur une ligne partagée, la meilleure compagnie les prend aux autres." },
  { n: "03", t: "Le fret", s: "Commerce",
    b: "Des contrats qui expirent. Les cargaisons fragiles paient double, mais arrivent parfois en morceaux." },
  { n: "04", t: "L'usure", s: "Entretien",
    b: "Chaque trajet fatigue le matériel. À cent pour cent, la rame est réparée d'office si la trésorerie suit — sinon elle reste au dépôt." },
  { n: "05", t: "Le personnel", s: "Effectif",
    b: "Des employés nommés qui prennent de l'expérience et réclament leur augmentation. L'équipe doit grandir avec la flotte." },
  { n: "06", t: "La météo", s: "Aléas",
    b: "Brouillard, verglas, canicule l'été et neige l'hiver : la météo suit les saisons. Chacune ralentit, use ou provoque des incidents sur tout le réseau." },
  { n: "07", t: "La réputation", s: "Image",
    b: "Le rapport entre trajets réussis et incidents. Elle multiplie vos recettes voyageurs, de moitié à plein tarif." },
  { n: "08", t: "La carrière", s: "Progression",
    b: "Dix grades, d'apprenti exploitant à légende du rail. Chacun exige une série d'objectifs, et les plus hauts se portent comme un titre." },
];

const CONTINU = [
  { t: "Progression réelle", s: "Temps réel",
    b: "Un trajet de dix minutes prend dix minutes. Pas de raccourci, pas de bouton « accélérer »." },
  { t: "Recettes automatiques", s: "Comptabilité",
    b: "Chaque arrivée crédite la trésorerie et s'inscrit au grand livre, avec l'heure exacte." },
  { t: "Incidents", s: "Exploitation",
    b: "Un retard peut survenir à n'importe quel cycle. Il entame la réputation, durablement." },
  { t: "Concurrence", s: "Marché",
    b: "Sur une ligne partagée, les voyageurs vont à la compagnie la plus attractive. La partie se joue aussi pendant votre absence." },
];

function pad(v: string | number, w: number) {
  return String(v).padStart(w, " ");
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [clock, setClock] = useState("--:--:--");
  const [ville, setVille] = useState(VILLES[0]);

  const traceRef = useRef<SVGPathElement | null>(null);
  const locoRef = useRef<SVGGElement | null>(null);
  const stampRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  /* fond papier tant que la vitrine est affichée, sans toucher au thème de la console */
  useEffect(() => {
    document.body.classList.add("lp-body");
    return () => document.body.classList.remove("lp-body");
  }, []);

  /* stats réseau publiques */
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

  /* horloge */
  useEffect(() => {
    const two = (n: number) => (n < 10 ? "0" + n : String(n));
    const tick = () => {
      const d = new Date();
      setClock(`${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  /* rotation des destinations */
  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVille(VILLES[i % VILLES.length]);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  /* tracé à l'encre, puis locomotive qui parcourt la voie */
  useEffect(() => {
    const trace = traceRef.current;
    const loco = locoRef.current;
    if (!trace || !loco) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const len = trace.getTotalLength();
    trace.style.strokeDasharray = String(len);
    trace.style.strokeDashoffset = reduce ? "0" : String(len);
    if (reduce) return;

    let raf = 0;
    let start: number | null = null;
    const DRAW = 1700;

    // vitesse constante, comme une plume de traceur : surtout pas d'accélération
    const draw = (ts: number) => {
      if (start === null) start = ts;
      const k = Math.min(1, (ts - start) / DRAW);
      trace.style.strokeDashoffset = String(len * (1 - k));
      if (k < 1) raf = requestAnimationFrame(draw);
      else runLoco();
    };

    let locoStart: number | null = null;
    const RUN = 9000;
    const runLoco = () => {
      loco.style.opacity = "1";
      const move = (ts: number) => {
        if (locoStart === null) locoStart = ts;
        const k = ((ts - locoStart) % RUN) / RUN;
        const p = trace.getPointAtLength(len * k);
        const p2 = trace.getPointAtLength(Math.min(len, len * k + 1));
        const a = (Math.atan2(p2.y - p.y, p2.x - p.x) * 180) / Math.PI;
        loco.setAttribute("transform", `translate(${p.x},${p.y}) rotate(${a})`);
        raf = requestAnimationFrame(move);
      };
      raf = requestAnimationFrame(move);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* filets qui se tirent au défilement + cachet qui tombe */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    root.querySelectorAll<HTMLElement>(".lp-item").forEach((el, i) => {
      el.style.transitionDelay = `${(i % 8) * 45}ms`;
      io.observe(el);
    });

    const stamp = stampRef.current;
    let io2: IntersectionObserver | null = null;
    if (stamp) {
      io2 = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("hit");
              io2?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      io2.observe(stamp);
    }

    return () => {
      io.disconnect();
      io2?.disconnect();
    };
  }, []);

  return (
    <div className="lp" ref={rootRef}>
      <header className="lp-header">
        <div className="lp-wrap lp-hd">
          <span className="lp-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f5c4d" strokeWidth="1.7">
              <rect x="5" y="3" width="14" height="13" rx="2" />
              <line x1="5" y1="9" x2="19" y2="9" />
              <line x1="9" y1="3" x2="9" y2="16" />
              <circle cx="8.5" cy="19" r="1.4" fill="#1f5c4d" stroke="none" />
              <circle cx="15.5" cy="19" r="1.4" fill="#1f5c4d" stroke="none" />
              <line x1="7" y1="16" x2="5" y2="19" strokeLinecap="round" />
              <line x1="17" y1="16" x2="19" y2="19" strokeLinecap="round" />
            </svg>
            <b>Réseau</b>
          </span>
          <nav className="lp-nav">
            <a className="lp-navlink" href="#bord">À bord</a>
            <a className="lp-navlink" href="#exploiter">Exploiter</a>
            <a className="lp-navlink" href="#direct">En direct</a>
            <a className="lp-navlink" href="#billets">Billets</a>
            <span className="lp-clk">{clock}</span>
            <button className="lp-btn" onClick={() => navigate("/auth?mode=register")}>
              Fonder ma compagnie
            </button>
          </nav>
        </div>
      </header>

      <div className="lp-hero">
        <svg className="lp-route" viewBox="0 0 700 430" preserveAspectRatio="none" aria-hidden="true">
          <path className="ln" d="M -20 360 L 150 360 L 260 240 L 430 240 L 540 132 L 720 132" />
          <path className="ln" d="M -20 412 L 90 412 L 200 300 L 720 300" opacity=".5" />
          <path ref={traceRef} className="ink" d="M -20 360 L 150 360 L 260 240 L 430 240 L 540 132 L 720 132" />
          <circle className="halte" cx="150" cy="360" r="5" />
          <circle className="halte" cx="430" cy="240" r="5" />
          <circle className="halte" cx="540" cy="132" r="5" />
          <g ref={locoRef} className="lp-loco">
            <rect x="-9" y="-6" width="18" height="12" rx="2" fill="#e9e4d7" stroke="#1f5c4d" strokeWidth="1.8" />
            <line x1="-9" y1="0" x2="9" y2="0" stroke="#1f5c4d" strokeWidth="1.5" />
            <circle cx="-4" cy="8" r="2" fill="#1f5c4d" />
            <circle cx="4" cy="8" r="2" fill="#1f5c4d" />
          </g>
        </svg>

        <div className="lp-wrap">
          <span className="lp-ov">Compagnie ferroviaire — jeu de gestion</span>
          <h1>
            Vos trains roulent <em>même quand vous dormez.</em>
          </h1>
          <p className="lp-lede">
            Tracez vos lignes, achetez vos rames, négociez le fret. La météo, l'usure du matériel
            et votre réputation font le reste — en continu, que vous soyez connecté ou non.
          </p>
          <div className="lp-cta">
            <button className="lp-btn" onClick={() => navigate("/auth?mode=register")}>
              Fonder ma compagnie — gratuit
            </button>
            <button className="lp-btn ghost" onClick={() => navigate("/auth")}>
              J'ai déjà une compagnie
            </button>
          </div>

          <div className="lp-board">
            <div className="lp-board-hd">
              <span>Réseau national — tableau des départs</span>
              <span className="lp-live"><i />Direct</span>
            </div>

            <div className="lp-brow">
              <span className="lp-lab w">Destination</span>
              <Flaps text={ville} length={11} />
            </div>

            <div className="lp-brow">
              <span className="lp-lab w">Compagnies</span>
              <Flaps text={stats ? pad(stats.activeCompanies, 4) : "   -"} length={4} small />
              <span className="lp-lab">Rames en ligne</span>
              <Flaps text={stats ? pad(stats.trainsInService, 4) : "   -"} length={4} small />
            </div>

            <div className="lp-brow">
              <span className="lp-lab w">Ponctualité</span>
              <Flaps text={stats ? pad(`${stats.punctuality}%`, 4) : "   -"} length={4} small />
              <span className="lp-lab">Incidents</span>
              <Flaps text={stats ? pad(stats.activeIncidents, 3) : "  -"} length={3} small />
            </div>
          </div>
        </div>
      </div>

      <section id="bord" className="lp-bord">
        <div className="lp-wrap">
          <div className="lp-sec-hd">
            <h2 className="lp-serif">Montez à bord</h2>
            <span className="n">— vue cabine, en direct</span>
          </div>
          <p className="lp-sub">
            Chaque rame roule pour de vrai. Sa position vient de la simulation, la météo est celle
            du réseau et la livrée est la vôtre. Elle s'arrête sous le panneau de la gare à la
            seconde où le trajet se termine.
          </p>
          <LandingCab />
          <p className="lp-cab-note">
            Quelques secondes offertes à chaque compagnie, le voyage entier en Premium.
          </p>
        </div>
      </section>

      <section id="exploiter">
        <div className="lp-wrap">
          <div className="lp-sec-hd">
            <h2 className="lp-serif">Ce que vous exploitez</h2>
            <span className="n">— huit systèmes liés</span>
          </div>
          <p className="lp-sub">
            Rien de décoratif : chaque mécanique pèse sur les autres. Une rame mal entretenue
            casse votre ponctualité, qui fait chuter vos recettes voyageurs.
          </p>
          <div className="lp-cat two">
            {SYSTEMES.map((s) => (
              <div className="lp-item" key={s.n}>
                <span className="num">{s.n}</span>
                <div className="bd">
                  <h3>{s.t}</h3>
                  <p>{s.b}</p>
                </div>
                <span className="side">{s.s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="direct" className="lp-alt">
        <div className="lp-wrap">
          <div className="lp-sec-hd">
            <h2 className="lp-serif">Le réseau ne s'arrête pas</h2>
            <span className="n">— cycle de 30 secondes</span>
          </div>
          <p className="lp-sub">
            La simulation tourne côté serveur, en permanence. Vous fermez l'onglet, vos trains
            continuent leur trajet, encaissent, s'usent et tombent parfois en panne.
          </p>
          <div className="lp-cat two">
            {CONTINU.map((c, i) => (
              <div className="lp-item" key={c.t}>
                <span className="num">{String.fromCharCode(65 + i)}</span>
                <div className="bd">
                  <h3>{c.t}</h3>
                  <p>{c.b}</p>
                </div>
                <span className="side">{c.s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="billets">
        <div className="lp-wrap">
          <div className="lp-sec-hd">
            <h2 className="lp-serif">Deux billets</h2>
            <span className="n">— le réseau reste gratuit</span>
          </div>
          <p className="lp-sub">
            Tout le jeu est accessible sans payer, classements compris. Le Premium n'augmente ni vos
            recettes ni vos rames : il donne du choix et supprime la corvée. Une compagnie gratuite
            bien menée peut finir première.
          </p>

          <div className="lp-tickets">
            <div className="lp-tk">
              <div className="lp-tk-hd">
                <div>
                  <span className="cls">Seconde classe</span>
                  <h3>Exploitant</h3>
                </div>
                <div className="px">0 €<small>pour toujours</small></div>
              </div>
              <ul>
                <li><b>·</b>Dépôt sans plafond — chaque place coûte plus cher que la précédente</li>
                <li><b>·</b>Toutes les rames et tout le personnel, débloqués au grade</li>
                <li><b>·</b>Les quatre donneurs d'ordre et leur fidélité</li>
                <li><b>·</b>Classements, 66 succès, défi quotidien</li>
                <li><b>·</b>Carte du réseau, tracé à la souris, deux habillages</li>
                <li><b>·</b>Gares vivantes, concurrence sur les lignes partagées</li>
                <li><b>·</b>Un aperçu de la vue cabine sur chaque rame</li>
              </ul>
              <div className="lp-tk-ft">
                <button className="lp-btn ghost" onClick={() => navigate("/auth?mode=register")}>
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
                <div className="px">dès 5,99 €<small>prix libre</small></div>
              </div>
              <ul>
                <li><b>·</b>Vue cabine : suivez chaque rame en direct, de gare en gare</li>
                <li><b>·</b>Veille concurrentielle et événements de gare annoncés une heure avant</li>
                <li><b>·</b>Rentabilité de chaque ligne et de chaque rame, sur sept jours</li>
                <li><b>·</b>Bilan de votre absence au retour, et résumé de la nuit chaque matin</li>
                <li><b>·</b>File de chantiers : le suivant démarre seul, même la nuit</li>
                <li><b>·</b>Deux ordres par donneur d'ordre et six contrats de fret au lieu de quatre</li>
                <li><b>·</b>Alertes de cours et ordres permanents, même jeu fermé</li>
                <li><b>·</b>−20 % sur chaque place de dépôt</li>
                <li><b>·</b>Cargaisons fragiles deux fois moins exposées</li>
                <li><b>·</b>Huit livrées réservées pour votre compagnie</li>
              </ul>
              <div className="lp-tk-ft">
                <button className="lp-btn vert" onClick={() => navigate("/auth?mode=register")}>
                  Prendre ce billet
                </button>
                <p className="lp-tk-note">
                  Vous fixez le montant au moment de payer, à partir de 5,99 € — au-delà, c'est un
                  soutien au réseau, les avantages sont les mêmes. Paiement unique par carte via
                  Stripe, depuis votre compagnie une fois créée : aucun abonnement, rien à résilier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-ft">
          <div className="left">
            <h2 className="lp-serif">Le quai vous attend</h2>
            <p>Création de compagnie en trente secondes. Aucune installation, rien à télécharger.</p>
            <button className="lp-btn" onClick={() => navigate("/auth?mode=register")}>
              Fonder ma compagnie
            </button>
          </div>

          <svg ref={stampRef} className="lp-stamp" width="126" height="126" viewBox="0 0 126 126" aria-hidden="true">
            <circle cx="63" cy="63" r="53" fill="none" stroke="#a33b2c" strokeWidth="2.6" opacity=".9" />
            <circle cx="63" cy="63" r="43" fill="none" stroke="#a33b2c" strokeWidth="1" opacity=".7" />
            <path id="lp-s1" d="M 18 63 A 45 45 0 0 1 108 63" fill="none" />
            <text fontFamily="'Barlow Condensed',sans-serif" fontSize="11" fontWeight="600" fill="#a33b2c" letterSpacing="1.5">
              <textPath href="#lp-s1" startOffset="50%" textAnchor="middle">RÉSEAU NATIONAL</textPath>
            </text>
            <path id="lp-s2" d="M 19 67 A 44 44 0 0 0 107 67" fill="none" />
            <text fontFamily="'Barlow Condensed',sans-serif" fontSize="11" fontWeight="600" fill="#a33b2c" letterSpacing="1.5">
              <textPath href="#lp-s2" startOffset="50%" textAnchor="middle">SERVICE ASSURÉ</textPath>
            </text>
            <g stroke="#a33b2c" strokeWidth="2.2" fill="none">
              <rect x="50" y="51" width="26" height="19" rx="2" />
              <line x1="50" y1="60.5" x2="76" y2="60.5" />
              <line x1="58.5" y1="51" x2="58.5" y2="70" />
              <line x1="67.5" y1="51" x2="67.5" y2="70" />
            </g>
            <circle cx="55" cy="75" r="2.2" fill="#a33b2c" />
            <circle cx="71" cy="75" r="2.2" fill="#a33b2c" />
          </svg>
        </div>

        <div className="lp-wrap">
          <div className="lp-credit">
            <span>Développé par <b>Skylaize</b></span>
            <span>·</span>
            <span>React · Node · PostgreSQL</span>
            <span>·</span>
            <span>Aucun template, tout codé à la main</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
