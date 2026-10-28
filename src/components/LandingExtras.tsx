import { useEffect, useMemo, useState } from "react";
import { STATION_COORDS, lineCurve, LINE_PALETTE } from "../geo";
import { COUNTRIES } from "./europeMap";
import { TrainPicture } from "./TrainPicture";
import { DESKTOP_DOWNLOAD_URL } from "../desktop";
import { DISCORD } from "../social";

/* ============================================================
   2.4.1 : ce qui manquait à la page d'accueil.
   - le compte à rebours de la saison (une raison de venir maintenant) ;
   - « comment ça marche », en trois gestes ;
   - le jeu tel qu'il est : la carte, la flotte, la saison ;
   - où jouer : navigateur, Windows, téléphone, Discord ;
   - les questions qu'on se pose avant de s'inscrire.
   ============================================================ */

/* ---------------- compte à rebours de saison ---------------- */

export type SeasonInfo = { number: number; name: string; endsAt: string } | null | undefined;

export function SeasonCountdown({ season }: { season: SeasonInfo }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  if (!season) return null;
  const left = Date.parse(season.endsAt) - now;
  if (!(left > 0)) return null;
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const when = days > 0 ? `${days} j ${hours} h` : `${hours} h`;
  return (
    <p className="lp-season">
      <i aria-hidden="true" />
      <span>
        <b>Saison {season.number}{season.name ? `, ${season.name}` : ""}</b> : encore {when}. Arrivez maintenant, vous rejoignez une
        division de compagnies de votre taille.
      </span>
    </p>
  );
}

/* ---------------- comment ça marche ---------------- */

const STEPS = [
  { t: "Tracez une ligne", b: "Choisissez deux gares parmi les grandes villes de France et d'Europe. Plus elles sont grandes, plus il y a de voyageurs." },
  { t: "Mettez une rame en service", b: "Achetez-la, affectez-la à la ligne : elle part tout de suite, et chaque arrivée remplit la caisse." },
  { t: "Encaissez, même absent", b: "Le réseau tourne jour et nuit sur le serveur. Revenez entretenir vos rames, agrandir le dépôt, ouvrir d'autres lignes." },
];

export function LandingSteps({ onStart }: { onStart: () => void }) {
  return (
    <section id="commencer" className="lp-steps-sec">
      <div className="lp-wrap">
        <h2 className="lp-h2">Trois gestes pour démarrer</h2>
        <p className="lp-sub">Pas de tutoriel interminable : votre premier trajet rapporte en quelques minutes, et le jeu vous guide gare après gare.</p>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={s.t} className="lp-step">
              <span className="lp-step-n" aria-hidden="true">{i + 1}</span>
              <h3>{s.t}</h3>
              <p>{s.b}</p>
            </li>
          ))}
        </ol>
        <div className="lp-cta">
          <button className="lp-btn" onClick={onStart}>
            Fonder ma compagnie
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- le jeu en vrai ---------------- */

/* La carte de l'aperçu reprend le langage de la vraie carte du jeu : les pays
   voisins, les mers, des lignes courbes à la couleur de la compagnie et des
   rames en forme de capsule, plutôt que des points lumineux. */
const DEMO_LINES: { route: string[]; dur: number; trains: number }[] = [
  { route: ["Paris", "Dijon", "Lyon", "Avignon", "Marseille"], dur: 26, trains: 2 },
  { route: ["Paris", "Tours", "Poitiers", "Bordeaux"], dur: 20, trains: 2 },
  { route: ["Lille", "Paris"], dur: 10, trains: 1 },
  { route: ["Paris", "Reims", "Metz", "Strasbourg"], dur: 18, trains: 1 },
  { route: ["Nantes", "Angers", "Le Mans", "Paris"], dur: 16, trains: 1 },
  { route: ["Bordeaux", "Toulouse", "Montpellier", "Marseille", "Nice"], dur: 30, trains: 2 },
  { route: ["Lyon", "Genève"], dur: 9, trains: 1 },
  { route: ["Lille", "Londres"], dur: 12, trains: 1 },
];
const MAIN_CITIES = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Strasbourg", "Nantes", "Toulouse", "Nice", "Genève", "Londres"];
const SEAS = [
  { t: "Manche", x: 40, y: 48 },
  { t: "Océan Atlantique", x: -66, y: 236 },
  { t: "Mer Méditerranée", x: 200, y: 392 },
];
const COUNTRY_LABELS = [
  { t: "ROYAUME-UNI", x: 118, y: -40 },
  { t: "BELGIQUE", x: 212, y: 36 },
  { t: "ALLEMAGNE", x: 350, y: 96 },
  { t: "SUISSE", x: 318, y: 196 },
  { t: "ITALIE", x: 392, y: 300 },
  { t: "ESPAGNE", x: 60, y: 408 },
];
const BOX = { x: -78, y: -52, w: 512, h: 482 };

function MapScreen() {
  const paths = useMemo(
    () =>
      DEMO_LINES.map((l, li) => {
        let d = "";
        l.route.forEach((st, i) => {
          const p = STATION_COORDS[st];
          if (i === 0) d = `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          else {
            const a = STATION_COORDS[l.route[i - 1]];
            const c = lineCurve(li + i, a, p);
            d += ` Q${c.cx.toFixed(1)},${c.cy.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }
        });
        return { ...l, d, color: LINE_PALETTE[li % LINE_PALETTE.length] };
      }),
    []
  );
  const stations = [...new Set(DEMO_LINES.flatMap((l) => l.route))];
  const terminals = new Set(DEMO_LINES.flatMap((l) => [l.route[0], l.route[l.route.length - 1]]));
  const running = DEMO_LINES.reduce((a, l) => a + l.trains, 0);
  return (
    <div className="lp-scr-mapwrap">
      <svg viewBox={`${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`} className="lp-scr-map" role="img" aria-label="Aperçu de la carte du réseau, avec les rames qui roulent">
        <defs>
          <pattern id="lp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 H0 V40" fill="none" stroke="#1a2334" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill="url(#lp-grid)" />
        {COUNTRIES.map((c) => (
          <path key={c.id} d={c.d} className={c.id === "France" ? "fr" : "land"} />
        ))}
        {SEAS.map((m) => (
          <text key={m.t} x={m.x} y={m.y} className="sea">
            {m.t}
          </text>
        ))}
        {COUNTRY_LABELS.map((m) => (
          <text key={m.t} x={m.x} y={m.y} className="country">
            {m.t}
          </text>
        ))}
        {paths.map((l, i) => (
          <path key={`c${i}`} d={l.d} fill="none" stroke="#0b0f19" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {paths.map((l, i) => (
          <path key={`l${i}`} id={`lp-demo-${i}`} d={l.d} fill="none" stroke={l.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {stations.map((st) => {
          const p = STATION_COORDS[st];
          const big = terminals.has(st);
          return (
            <g key={st}>
              <circle cx={p.x} cy={p.y} r={big ? 3.6 : 2.2} className={big ? "st big" : "st"} />
              {MAIN_CITIES.includes(st) && (
                <text x={p.x + 6} y={p.y + 3.5} className="lbl">
                  {st}
                </text>
              )}
            </g>
          );
        })}
        {paths.flatMap((l, i) =>
          Array.from({ length: l.trains }, (_, n) => (
            <rect key={`t${i}-${n}`} x="-4.5" y="-1.9" width="9" height="3.8" rx="1.9" fill="#f3f4f6" stroke={l.color} strokeWidth="1.2">
              <animateMotion
                dur={`${l.dur}s`}
                begin={`-${((n / l.trains) * l.dur + i * 1.7).toFixed(1)}s`}
                repeatCount="indefinite"
                rotate="auto"
                keyPoints={n % 2 ? "1;0" : "0;1"}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#lp-demo-${i}`} />
              </animateMotion>
            </rect>
          ))
        )}
      </svg>
      <span className="lp-map-chip">
        <b>{DEMO_LINES.length} lignes</b> · <em>{running} en circulation</em>
      </span>
      <span className="lp-map-scale">100 km</span>
    </div>
  );
}

const DEMO_FLEET = [
  { name: "Rame 1", model: "STANDARD", livery: "#d4a017", to: "Marseille", from: "Paris", pct: 64, wear: 22 },
  { name: "Rame 2", model: "EXPRESS", livery: "#4f7fa3", to: "Bordeaux", from: "Paris", pct: 31, wear: 47 },
  { name: "Rame 3", model: "COUCHETTES", livery: "#8a6ba3", to: "Nice", from: "Bordeaux", pct: 88, wear: 71 },
];

function FleetScreen() {
  return (
    <div className="lp-scr-fleet" role="img" aria-label="Aperçu de la flotte : trois rames en route">
      {DEMO_FLEET.map((t, i) => (
        <div key={t.name} className="row">
          <div className="pic">
            <TrainPicture model={t.model} livery={t.livery} height={30} track={false} label={t.name} />
          </div>
          <div className="info">
            <b>{t.name}</b>
            <span>
              Roule vers <em>{t.to}</em> depuis {t.from}
            </span>
            <div className="bar">
              <span style={{ ["--p" as string]: `${t.pct}%`, animationDelay: `${i * 0.6}s` }} />
            </div>
          </div>
          <div className={`wear${t.wear >= 70 ? " hi" : ""}`}>{t.wear} %</div>
        </div>
      ))}
    </div>
  );
}

const DEMO_SEASON = [
  { n: "Compagnie du Léman", p: 1840 },
  { n: "Rail Atlantique", p: 1715 },
  { n: "Votre compagnie", p: 1622, me: true },
  { n: "Les Express du Nord", p: 1490 },
  { n: "Ligne Bleue", p: 1306 },
];

function SeasonScreen() {
  return (
    <div className="lp-scr-season" role="img" aria-label="Aperçu du classement de saison d'un groupe de la division Or">
      <div className="hd">
        <span className="div">Division Or</span>
        <span>groupe de 12</span>
      </div>
      <ol>
        {DEMO_SEASON.map((r, i) => (
          <li key={r.n} className={r.me ? "me" : ""}>
            <span className="rk">{i + 1}</span>
            <span className="nm">{r.n}</span>
            <span className="pt">{r.p.toLocaleString("fr-FR")} pts</span>
          </li>
        ))}
      </ol>
      <p className="ft">Les 3 premiers montent en Platine à la fin de la saison.</p>
    </div>
  );
}

export function LandingShowcase() {
  return (
    <section id="apercu" className="lp-show-sec">
      <div className="lp-wrap">
        <h2 className="lp-h2">Le jeu, tel qu'il est</h2>
        <p className="lp-sub">Une console de régulateur, pas une vitrine : vos lignes sur la carte, vos rames qui avancent en direct, et votre place dans la saison.</p>
        <div className="lp-show">
          <figure className="lp-scr wide">
            <div className="lp-scr-bar" aria-hidden="true"><i /><i /><i /><span>Carte du réseau</span></div>
            <MapScreen />
            <figcaption>La carte : chaque capsule blanche est une rame qui roule en ce moment.</figcaption>
          </figure>
          <figure className="lp-scr">
            <div className="lp-scr-bar" aria-hidden="true"><i /><i /><i /><span>Votre flotte</span></div>
            <FleetScreen />
            <figcaption>La flotte : où va chaque rame, et ce qu'il lui reste avant l'atelier.</figcaption>
          </figure>
          <figure className="lp-scr">
            <div className="lp-scr-bar" aria-hidden="true"><i /><i /><i /><span>Saison</span></div>
            <SeasonScreen />
            <figcaption>La saison : quatre semaines, un groupe de votre taille.</figcaption>
          </figure>
        </div>
        <p className="lp-show-note">Aperçus illustrés de l'interface du jeu.</p>
      </div>
    </section>
  );
}

/* ---------------- jouer partout ---------------- */

export function LandingEverywhere({ onStart }: { onStart: () => void }) {
  return (
    <section id="partout" className="lp-ev-sec">
      <div className="lp-wrap">
        <h2 className="lp-h2">Jouez où vous voulez</h2>
        <p className="lp-sub">Une seule compagnie, partout : votre partie vous suit du bureau au téléphone.</p>
        <div className="lp-ev">
          <article className="lp-ev-card">
            <span className="lp-ev-k">Navigateur</span>
            <h3>Sur ordinateur</h3>
            <p>Chrome, Edge, Firefox ou Safari, sans rien installer.</p>
            <button className="lp-btn sm" onClick={onStart}>
              Jouer maintenant
            </button>
          </article>
          <article className="lp-ev-card vert">
            <span className="lp-ev-k">Nouveau</span>
            <h3>Application Windows</h3>
            <p>Sa propre fenêtre, son icône, et votre partie affichée sur votre profil Discord.</p>
            <a className="lp-btn sm vert" href={DESKTOP_DOWNLOAD_URL}>
              Télécharger
            </a>
          </article>
          <article className="lp-ev-card">
            <span className="lp-ev-k">iPhone et Android</span>
            <h3>Sur téléphone</h3>
            <p>Installez Réseau sur l'écran d'accueil depuis le navigateur, avec les notifications. Sur les stores : bientôt.</p>
            <button className="lp-btn sm ghost" onClick={onStart}>
              Ouvrir sur mobile
            </button>
          </article>
          <article className="lp-ev-card">
            <span className="lp-ev-k">Communauté</span>
            <h3>Le serveur Discord</h3>
            <p>Alliances à former, entraide, annonces des nouveautés et giveaways.</p>
            <a className="lp-btn sm ghost" href={DISCORD.url} target="_blank" rel="noopener noreferrer">
              Rejoindre
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------------- questions ---------------- */

const FAQ = [
  { q: "C'est vraiment gratuit ?", a: "Oui. Tout le jeu est accessible sans payer, classements et saisons compris. Le Premium est facultatif, se paie une seule fois, sans abonnement." },
  { q: "Peut-on gagner sans payer ?", a: "Oui. Le Premium n'augmente ni vos recettes ni le nombre de vos rames : il apporte des outils de gestion, des alertes et le confort. Une compagnie gratuite bien menée peut finir première de sa division." },
  { q: "Combien de temps faut-il y consacrer ?", a: "Ce que vous voulez. Quelques minutes, plusieurs fois par jour, suffisent : vos trains roulent seuls entre deux visites, même la nuit." },
  { q: "Je débute : vais-je affronter des joueurs installés depuis des mois ?", a: "Non. Chaque saison range les compagnies en divisions, de Bronze à Platine, par groupes de taille comparable. Vous commencez contre des compagnies qui commencent." },
  { q: "Ça marche sur téléphone ?", a: "Oui, dans le navigateur, et vous pouvez installer Réseau sur l'écran d'accueil. Sur PC, une application Windows existe aussi." },
  { q: "Faut-il créer un compte ?", a: "Oui, pour retrouver votre compagnie partout : une adresse e-mail suffit, ou votre compte Discord ou Google. Ça prend trente secondes." },
];

export function LandingFaq() {
  return (
    <section id="questions" className="lp-faq-sec">
      <div className="lp-wrap lp-faq-grid">
        <div>
          <h2 className="lp-h2">Avant de monter à bord</h2>
          <p className="lp-sub">Les questions qu'on nous pose le plus. Une autre ? Posez-la sur le Discord.</p>
        </div>
        <div className="lp-faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
