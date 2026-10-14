/* ============================================================
   2.1 : le portrait d'un membre du personnel, en buste, dans sa tenue.

   Quatre tenues : la tenue de base, et les trois de la boutique — la
   casquette et la veste croisée à boutons dorés des années 1930, le gilet
   orange à bandes réfléchissantes des années 1970, la veste moderne au
   liseré de couleur. Le visage varie avec la graine (le nom de la
   personne) : teint, cheveux, moustache ou non. Dessin vectoriel, il reste
   net à toutes les tailles.
   ============================================================ */

const SKIN = ["#f1c9a5", "#e0ac84", "#c68a62", "#9a6545", "#6f4a33", "#f6d8bf"];
const HAIR = ["#2b1d14", "#4a3020", "#7a5534", "#b0874f", "#1c1c1c", "#8f8f8f", "#c9b38a"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const UNIFORM_LABELS: Record<string, string> = {
  "1930": "Années 1930",
  "1970": "Années 1970",
  moderne: "Moderne",
};

export function StaffFigure({ uniform, seed = "agent", size = 64, accent = "#38bdf8", className = "" }: { uniform?: string | null; seed?: string; size?: number; accent?: string; className?: string }) {
  const h = hash(seed);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const longHair = (h >> 6) % 3 === 0;
  const moustache = !longHair && (h >> 8) % 3 === 0;
  const u = uniform ?? "base";
  const jacket = u === "1930" ? "#1b2a4a" : u === "1970" ? "#5b6470" : u === "moderne" ? "#2b2f36" : "#24324a";
  const w = size, ht = Math.round(size * 1.15);
  return (
    <svg width={w} height={ht} viewBox="0 0 64 74" className={className} role="img" aria-label={`Portrait, tenue ${UNIFORM_LABELS[u] ?? "de base"}`}>
      {/* épaules et veste */}
      <path d="M6 74c0-14 9-22 26-22s26 8 26 22Z" fill={jacket} />
      {/* col de chemise et cravate */}
      <path d="M25 52l7 9 7-9Z" fill={u === "1970" ? "#d9dde2" : "#f1f2f4"} />
      <path d="M31 55h2l1.6 10-2.6 3-2.6-3Z" fill={u === "moderne" ? accent : u === "1930" ? "#7a1f2b" : "#2b3a5a"} />
      {u === "1930" && (
        <>
          {/* veste croisée : revers et deux rangées de boutons dorés */}
          <path d="M22 54l10 14 10-14 4 2-14 18-14-18Z" fill="#14203a" />
          {[60, 66, 72].map((y) => (
            <g key={y}>
              <circle cx="26" cy={y} r="1.3" fill="#e6c25a" />
              <circle cx="38" cy={y} r="1.3" fill="#e6c25a" />
            </g>
          ))}
          <path d="M10 64h6M48 64h6" stroke="#e6c25a" strokeWidth="1.2" />
        </>
      )}
      {u === "1970" && (
        <>
          {/* gilet orange à bandes réfléchissantes */}
          <path d="M12 74c0-9 4-16 11-19l9 13 9-13c7 3 11 10 11 19Z" fill="#f07b1d" />
          <path d="M14 66h12M38 66h12M13 71h13M38 71h13" stroke="#e8edf2" strokeWidth="2" />
        </>
      )}
      {u === "moderne" && (
        <>
          {/* liseré de couleur et cordon de badge */}
          <path d="M20 55c-6 3-10 9-11 19M44 55c6 3 10 9 11 19" stroke={accent} strokeWidth="2.4" fill="none" />
          <path d="M28 55l4 10 4-10" stroke="#9aa3ad" strokeWidth="1" fill="none" />
          <rect x="30" y="64" width="5" height="6" rx="1" fill="#e8edf2" />
        </>
      )}
      {/* cou et visage */}
      <rect x="27" y="40" width="10" height="13" rx="4" fill={skin} />
      <ellipse cx="32" cy="31" rx="12" ry="14" fill={skin} />
      {/* cheveux */}
      {longHair ? (
        <path d="M19 30c0-11 6-16 13-16s13 5 13 16c0 6-1 12-3 16l-2-14c-3-4-7-6-8-9-1 3-5 5-8 9l-2 14c-2-4-3-10-3-16Z" fill={hair} />
      ) : (
        <path d="M20 28c0-9 5-13 12-13s12 4 12 13c-2-4-6-6-12-6s-10 2-12 6Z" fill={hair} />
      )}
      {/* yeux, sourcils, bouche */}
      <circle cx="27.5" cy="32" r="1.2" fill="#1c1b17" />
      <circle cx="36.5" cy="32" r="1.2" fill="#1c1b17" />
      <path d="M25.5 28.6h4M34.5 28.6h4" stroke={hair} strokeWidth="1.2" strokeLinecap="round" />
      {moustache ? <path d="M27.5 38.5c2-1.5 7-1.5 9 0" stroke={hair} strokeWidth="2" strokeLinecap="round" fill="none" /> : <path d="M29 39c1.6 1 4.4 1 6 0" stroke="#8a4a3a" strokeWidth="1.2" strokeLinecap="round" fill="none" />}
      {/* coiffe */}
      {u === "1930" && (
        <>
          <path d="M18 22c0-6 6-10 14-10s14 4 14 10Z" fill="#14203a" />
          <path d="M18 22h28v3H18Z" fill="#e6c25a" />
          <path d="M17 25c4 2 26 2 30 0l-3 3c-5 1-19 1-24 0Z" fill="#0b1324" />
          <circle cx="32" cy="17" r="1.6" fill="#e6c25a" />
        </>
      )}
      {u === "moderne" && <path d="M44 30c2 0 3 2 3 4s-1 4-3 4M44 38c-2 2-6 3-9 3" stroke="#3a4250" strokeWidth="1.4" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
