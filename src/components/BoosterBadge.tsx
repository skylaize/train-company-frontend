/* 2.3 : le badge des compagnies dont le joueur booste le serveur Discord.
   Un petit cristal aux couleurs de Nitro, avec ou sans le mot. */
export const NITRO = "#c04fd6";

export function BoosterGem({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M4.2 2.2h7.6L15 6.2 8 14.4 1 6.2z" fill="#f47fff" />
      <path d="M1 6.2h14L8 14.4z" fill={NITRO} />
      <path d="M4.2 2.2 6 6.2 8 2.2l2 4 1.8-4" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth=".9" strokeLinejoin="round" />
    </svg>
  );
}

export function BoosterBadge({ label = false, className = "" }: { label?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 font-body ${label ? "rounded-full px-1.5 py-px text-[11px] font-medium text-[#d98ce8] bg-[#c04fd6]/[0.14]" : ""} ${className}`}
      title="Booste le serveur Discord de Réseau"
    >
      <BoosterGem size={label ? 11 : 12} />
      {label && "Booster"}
      {!label && <span className="sr-only">Booster du serveur Discord</span>}
    </span>
  );
}
