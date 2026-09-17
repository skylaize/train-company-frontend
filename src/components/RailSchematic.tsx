export function RailSchematic({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="#c99a3e" strokeWidth="1.5" fill="none" opacity="0.5">
        {/* lignes principales */}
        <path d="M -50 120 H 400 L 500 220 H 1250" />
        <path d="M -50 260 H 260 L 360 360 H 700 L 800 260 H 1250" />
        <path d="M -50 420 H 900 L 1000 520 H 1250" />
        <path d="M 150 -50 V 220" />
        <path d="M 620 -50 V 260" />
        <path d="M 950 260 V 850" />
        <path d="M -50 620 H 500 L 600 720 H 1250" />
        <path d="M 300 420 V 850" />

        {/* aiguillages (petits losanges) */}
        <rect x="394" y="114" width="12" height="12" transform="rotate(45 400 120)" fill="#c99a3e" stroke="none" />
        <rect x="254" y="254" width="12" height="12" transform="rotate(45 260 260)" fill="#c99a3e" stroke="none" />
        <rect x="694" y="254" width="12" height="12" transform="rotate(45 700 260)" fill="#c99a3e" stroke="none" />
        <rect x="894" y="414" width="12" height="12" transform="rotate(45 900 420)" fill="#c99a3e" stroke="none" />
        <rect x="494" y="614" width="12" height="12" transform="rotate(45 500 620)" fill="#c99a3e" stroke="none" />

        {/* gares (cercles) */}
        <circle cx="150" cy="120" r="6" fill="#18140f" stroke="#c99a3e" strokeWidth="2" />
        <circle cx="620" cy="220" r="6" fill="#18140f" stroke="#c99a3e" strokeWidth="2" />
        <circle cx="950" cy="260" r="6" fill="#18140f" stroke="#c99a3e" strokeWidth="2" />
        <circle cx="300" cy="360" r="6" fill="#18140f" stroke="#c99a3e" strokeWidth="2" />
        <circle cx="1000" cy="520" r="6" fill="#18140f" stroke="#c99a3e" strokeWidth="2" />
        <circle cx="600" cy="720" r="6" fill="#18140f" stroke="#c99a3e" strokeWidth="2" />
      </g>
    </svg>
  );
}
