/* Pictogramme Discord, au trait comme celui d'Instagram, pour les liens vers le serveur du jeu. */
export function DiscordMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8.5 6.2c-1.5.3-2.8.8-3.9 1.5C2.9 10.5 2.4 13.3 2.6 16c1.3 1 2.7 1.7 4.2 2.1l.9-1.6" />
      <path d="M15.5 6.2c1.5.3 2.8.8 3.9 1.5 1.7 2.8 2.2 5.6 2 8.3-1.3 1-2.7 1.7-4.2 2.1l-.9-1.6" />
      <path d="M7 16.2c3.2 1.3 6.8 1.3 10 0" />
      <path d="M8.3 6.2 9 7.4c2-.4 4-.4 6 0l.7-1.2" />
      <circle cx="9.2" cy="12.4" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="12.4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
