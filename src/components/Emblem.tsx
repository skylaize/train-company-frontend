/* Emblèmes de compagnie (boutique).

   Dessinés au trait sur une grille de 16, en currentColor : ils prennent la
   couleur du texte qui les entoure, donc la livrée dans la console et la
   couleur neutre au classement, dans les trois habillages sans exception.
   Pas de remplissage — à 14 px, un aplat devient une tache. */

export const EMBLEM_LABELS: Record<string, string> = {
  roue: "Roue motrice",
  etoile: "Étoile du Nord",
  aile: "Aile de vitesse",
  couronne: "Couronne",
  ancre: "Ancre du port",
  eclair: "Éclair",
};

export function Emblem({ id, size = 14, className = "" }: { id: string; size?: number; className?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `shrink-0 ${className}`,
    "aria-label": EMBLEM_LABELS[id] ?? id,
    role: "img" as const,
  };

  switch (id) {
    case "roue":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="1.4" />
          <path d="M8 2v4.6M8 9.4V14M2 8h4.6M9.4 8H14M3.8 3.8l3.2 3.2M9 9l3.2 3.2M12.2 3.8L9 7M7 9l-3.2 3.2" />
        </svg>
      );
    case "etoile":
      return (
        <svg {...common}>
          <path d="M8 1.8l1.8 4.1 4.4.4-3.3 2.9 1 4.3L8 11.2 4.1 13.5l1-4.3-3.3-2.9 4.4-.4z" />
        </svg>
      );
    case "aile":
      return (
        <svg {...common}>
          <path d="M1.8 10.5c3-.2 5.4-1.6 7.2-4.2 1.2-1.7 2.9-2.8 5.2-3" />
          <path d="M3.5 12.6c2.8-.3 5-1.4 6.8-3.4" />
          <path d="M5.8 14c2-.3 3.6-1 5-2.2" />
        </svg>
      );
    case "couronne":
      return (
        <svg {...common}>
          <path d="M2.5 12.5h11M3 12.5l-1-7 3.5 3L8 3.5l2.5 5L14 5.5l-1 7" />
        </svg>
      );
    case "ancre":
      return (
        <svg {...common}>
          <circle cx="8" cy="3.4" r="1.4" />
          <path d="M8 4.8v9.2M5 7.5h6M2.8 9.8c.4 2.6 2.6 4.2 5.2 4.2s4.8-1.6 5.2-4.2" />
        </svg>
      );
    case "eclair":
      return (
        <svg {...common}>
          <path d="M9.5 1.8L3.8 9h4l-1.3 5.2L12.2 7h-4z" />
        </svg>
      );
    default:
      return null;
  }
}
