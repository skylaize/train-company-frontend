import type { CSSProperties } from "react";

export function LedgerMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3h9l4 4v14H6V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="8.5" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.4" />
      <line x1="8.5" y1="15.5" x2="16" y2="15.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="8.5" y1="19" x2="13" y2="19" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function MedalMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3l1.5 6M15 3l-1.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11.5l1.1 2.2 2.4.35-1.75 1.7.4 2.4-2.15-1.13-2.15 1.13.4-2.4-1.75-1.7 2.4-.35 1.1-2.2Z" fill="currentColor" />
    </svg>
  );
}

export function TrophyMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="14" x2="12" y2="18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 20h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 18v2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function StampMark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: "rotate(-8deg)" }}
    >
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 2" opacity="0.9" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      <text x="50" y="42" textAnchor="middle" fontSize="11" fontFamily="'Space Mono', monospace" fontWeight="700" fill="currentColor" letterSpacing="1">
        COMPOSTÉ
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="8" fontFamily="'Space Mono', monospace" fill="currentColor" opacity="0.85">
        RÉSEAU · V1
      </text>
    </svg>
  );
}

export function CargoMark({
  size = 20,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="16" height="10" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <line x1="4" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.4" />
      <line x1="10" y1="6" x2="10" y2="16" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="7.5" cy="19" r="1.3" fill="currentColor" />
      <circle cx="16.5" cy="19" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function AnnounceMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10v4a1 1 0 0 0 1 1h2l7 4V5L6 9H4a1 1 0 0 0-1 1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17 9.5a3 3 0 0 1 0 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19.5 7.5a6.5 6.5 0 0 1 0 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function FragileMark({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="12" y2="14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </svg>
  );
}

export function LockMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function FogMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9h13M4 13h16M4 17h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SunMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SnowMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function GearMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.1 5.9l-1.55 1.55M7.45 16.55 5.9 18.1M18.1 18.1l-1.55-1.55M7.45 7.45 5.9 5.9"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      />
    </svg>
  );
}

export function StaffMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MapMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="1.4" />
      <line x1="15" y1="6" x2="15" y2="20" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function SwapMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8h11M17 8l-3.5-3.5M17 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 16H7M7 16l3.5-3.5M7 16l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrackMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18 L20 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="7" y1="17" x2="10.5" y2="14.4" stroke="currentColor" strokeWidth="1.4" />
      <line x1="10" y1="14.6" x2="13.5" y2="12" stroke="currentColor" strokeWidth="1.4" />
      <line x1="13" y1="12.2" x2="16.5" y2="9.6" stroke="currentColor" strokeWidth="1.4" />
      <line x1="16" y1="9.8" x2="19" y2="7.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function TrainMark({
  size = 20,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="5" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <line x1="5" y1="9" x2="19" y2="9" stroke="currentColor" strokeWidth="1.6" />
      <line x1="9" y1="3" x2="9" y2="16" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="19" r="1.4" fill="currentColor" />
      <circle cx="15.5" cy="19" r="1.4" fill="currentColor" />
      <line x1="7" y1="16" x2="5" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="17" y1="16" x2="19" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
