/* ============================================================
   Le logo de Réseau : le « R-ligne ».

   Le R est tracé comme une ligne de chemin de fer, d'une seule épaisseur,
   coupée net sur la ligne de base. Le losange blanc, là où la jambe quitte
   la boucle, est le symbole des correspondances sur la carte du jeu : deux
   lignes qui se rejoignent. Pas de géographie dedans : il reste valable le
   jour où le réseau passe les frontières.

   Mêmes tracés que public/favicon.svg et les icônes de l'application.
   ============================================================ */

type Tone = "nuit" | "ambre" | "encre";

const TONES: Record<Tone, { bg: string | null; line: string; node: string }> = {
  nuit: { bg: "#0b0f19", line: "#f59e0b", node: "#f8fafc" },
  ambre: { bg: "#f59e0b", line: "#0b0f19", node: "#f8fafc" },
  // sans fond : le tracé prend la couleur du texte, le losange celle qu'on lui donne
  encre: { bg: null, line: "currentColor", node: "currentColor" },
};

function Mark({ line, node }: { line: string; node: string }) {
  return (
    <g transform="translate(-4.5 1.5)">
      <path
        d="M31 81 V20.5 H54 A15.5 15.5 0 0 1 54 51.5 H31"
        fill="none"
        stroke={line}
        strokeWidth="10"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
      <path d="M54.944 48.427 L80.32 81 L67.65 81 L47.056 54.573 Z" fill={line} />
      <rect x="45" y="45.5" width="12" height="12" rx="1.2" transform="rotate(45 51 51.5)" fill={node} />
    </g>
  );
}

/* L'icône : une tuile aux coins arrondis (ou juste le tracé, en « encre »). */
export function LogoMark({
  size = 28,
  tone = "nuit",
  node,
  className,
}: {
  size?: number;
  tone?: Tone;
  node?: string; // couleur du losange en version « encre »
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {t.bg && <rect width="100" height="100" rx="22" fill={t.bg} />}
      <Mark line={t.line} node={node ?? t.node} />
    </svg>
  );
}

/* Le tracé seul, à poser dans un autre dessin (le tampon de la page d'accueil). */
export function LogoPaths({ line, node }: { line: string; node: string }) {
  return <Mark line={line} node={node} />;
}
