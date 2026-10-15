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
  rail: "Rail et traverses",
  boussole: "Boussole",
  horloge: "Horloge de gare",
  viaduc: "Viaduc",
  // 1.5 : éditions de saison
  grappe: "Grappe des Vendanges",
  sapin: "Sapin de Noël",
  flocon: "Flocon",
  soleil: "Soleil d'été",
  // 1.7
  lanterne: "Lanterne Belle Époque",
  fleche: "Flèche de la grande vitesse",
  aiguillage: "Aiguillage",
  sifflet: "Sifflet du chef de gare",
  // 2.0 : le Grand Chantier
  tunnel: "Bâtisseur du tunnel",
  sommet: "Sommet",
  // 2.0 : Pass de saison
  feuille: "Feuille d'érable",
  givre: "Cristal de givre",
  fleur: "Fleur de cerisier",
  phare: "Phare",
  gland: "Gland de chêne",
  "etoile-polaire": "Étoile polaire",
  papillon: "Papillon",
  vague: "Vague",
  // 2.1 : le musée et les éditions de boutique
  musee: "Fronton du musée",
  chataigne: "Châtaigne de la Toussaint",
  artifice: "Feu d'artifice",
  coeur: "Cœur",
  // 2.1 : exclusivité Discord, jamais vendue
  "porte-voix": "Porte-voix",
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
    case "rail":
      return (
        <svg {...common}>
          <path d="M5 1.8L3.6 14.2M11 1.8l1.4 12.4M4.2 4.5h7.6M3.9 8h8.2M3.6 11.5h8.8" />
        </svg>
      );
    case "boussole":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 3.6l1.6 4.4L8 12.4 6.4 8z" />
          <path d="M8 1.8v1M8 13.2v1M1.8 8h1M13.2 8h1" />
        </svg>
      );
    case "horloge":
      return (
        <svg {...common}>
          <circle cx="8" cy="8.6" r="5.4" />
          <path d="M8 5.6v3l2 1.4M6.2 1.8h3.6M8 1.8v1.4" />
        </svg>
      );
    case "viaduc":
      return (
        <svg {...common}>
          <path d="M1.8 5h12.4M1.8 5v9M14.2 5v9" />
          <path d="M3.4 14v-3.4a1.9 1.9 0 0 1 3.8 0V14M8.8 14v-3.4a1.9 1.9 0 0 1 3.8 0V14" />
          <path d="M1.8 3h12.4" />
        </svg>
      );
    case "grappe":
      return (
        <svg {...common}>
          <path d="M8 1.6v2.2M8 3.2c1.4-1.2 3.2-1 4 0" />
          <circle cx="6" cy="6" r="1.6" /><circle cx="10" cy="6" r="1.6" />
          <circle cx="8" cy="8.8" r="1.6" /><circle cx="4.8" cy="9" r="1.4" /><circle cx="11.2" cy="9" r="1.4" />
          <circle cx="6.6" cy="11.8" r="1.5" /><circle cx="9.4" cy="11.8" r="1.5" /><circle cx="8" cy="14.2" r="1.2" />
        </svg>
      );
    case "sapin":
      return (
        <svg {...common}>
          <path d="M8 1.6 11 6H9.6l2.6 4H10l2.8 3.6H3.2L6 10H3.8l2.6-4H5L8 1.6Z" />
          <path d="M8 13.6v1.8" />
        </svg>
      );
    case "flocon":
      return (
        <svg {...common}>
          <path d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5" />
          <path d="M6.4 2.6 8 4l1.6-1.4M6.4 13.4 8 12l1.6 1.4" />
        </svg>
      );
    case "soleil":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.4v2M8 12.6v2M1.4 8h2M12.6 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" />
        </svg>
      );
    case "lanterne":
      return (
        <svg {...common}>
          <path d="M6 2.2h4M8 2.2v1.6M5.2 3.8h5.6l-.8 7.4H6z" />
          <path d="M6 11.2h4v1.4H6zM8 6.2v2.6" />
          <path d="M4.6 14h6.8" />
        </svg>
      );
    case "fleche":
      return (
        <svg {...common}>
          <path d="M1.8 11.5h8.6c1.8 0 3.2-.6 3.8-1.8L15 8.4H6.6" />
          <path d="M3 8.4h1.8M1.8 5.6h6" />
        </svg>
      );
    case "aiguillage":
      return (
        <svg {...common}>
          <path d="M3 14.2V1.8M3 9.5c0-3 1.8-4.6 6.6-5.4l4-.7" />
          <path d="M1.6 12.4h2.8M1.6 9h2.8M1.6 5.6h2.8M6.4 7l1 1.6M9.6 5.6l.6 1.8" />
        </svg>
      );
    case "sifflet":
      return (
        <svg {...common}>
          <path d="M2 6.4h7.4a3.6 3.6 0 1 1-3.4 4.8H4.6A2.6 2.6 0 0 1 2 8.6z" />
          <circle cx="9.6" cy="10" r="1.2" />
          <path d="M12.6 3.6l1.6-1.2M13.6 6l1.8-.4" />
        </svg>
      );
    case "tunnel":
      return (
        <svg {...common}>
          <path d="M1 14.5l4-7.5 2.2 2.6L10 4l5 10.5" />
          <path d="M5.6 14.5v-2.4a2.4 2.4 0 0 1 4.8 0v2.4" />
          <path d="M1 14.5h14" />
        </svg>
      );
    case "feuille":
      return (
        <svg {...common}>
          <path d="M8 1.5l1.3 2.8 2.4-1-0.6 2.6 2.9 0.4-2 2 1.4 1.4-3 .3.2 2.4L8 11l-2.6 1.4.2-2.4-3-.3 1.4-1.4-2-2 2.9-.4-.6-2.6 2.4 1z" />
          <path d="M8 11v3.5" />
        </svg>
      );
    case "givre":
      return (
        <svg {...common}>
          <path d="M8 1v14M1.9 4.5l12.2 7M1.9 11.5l12.2-7" />
          <path d="M6.4 2.4L8 4l1.6-1.6M6.4 13.6L8 12l1.6 1.6M2.2 6.6l2.2-.6-.6-2.2M13.8 9.4l-2.2.6.6 2.2M2.2 9.4l2.2.6-.6 2.2M13.8 6.6l-2.2-.6.6-2.2" />
        </svg>
      );
    case "fleur":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="1.4" />
          <path d="M8 6.6C6.6 4.6 7 2.2 8 1.6c1 .6 1.4 3 0 5zM9.3 7.6c1.6-1.8 4-2.3 4.8-1.5-.4 1.1-2.5 2.4-4.8 1.5zM8.8 9.2c2.2 1.1 3.2 3.3 2.6 4.2-1.2.1-2.9-1.7-2.6-4.2zM7.2 9.2c.3 2.5-1.4 4.3-2.6 4.2-.6-.9.4-3.1 2.6-4.2zM6.7 7.6C4.4 8.5 2.3 7.2 1.9 6.1c.8-.8 3.2-.3 4.8 1.5z" />
        </svg>
      );
    case "phare":
      return (
        <svg {...common}>
          <path d="M6.2 5h3.6l1 9.5H5.2z" />
          <path d="M6 3h4v2H6zM7 1.5h2V3H7zM5.7 9h4.6M5.4 12h5.2" />
          <path d="M10.5 3.6L15 2.4M10.5 4.4L15 5.6M5.5 3.6L1 2.4M5.5 4.4L1 5.6" />
          <path d="M3 14.5h10" />
        </svg>
      );
    case "gland":
      return (
        <svg {...common}>
          <path d="M4 6.5h8c0-2.2-1.8-3.6-4-3.6S4 4.3 4 6.5z" />
          <path d="M4.6 6.5c0 4 1.6 7 3.4 7.6 1.8-.6 3.4-3.6 3.4-7.6" />
          <path d="M8 2.9V1.2M5.5 4.6l5 0" />
        </svg>
      );
    case "etoile-polaire":
      return (
        <svg {...common}>
          <path d="M8 1l1.3 5.7L15 8l-5.7 1.3L8 15l-1.3-5.7L1 8l5.7-1.3z" />
          <path d="M3.5 3.5l2 2M12.5 3.5l-2 2M3.5 12.5l2-2M12.5 12.5l-2-2" />
        </svg>
      );
    case "papillon":
      return (
        <svg {...common}>
          <path d="M8 4.5v8" />
          <path d="M8 6C6.5 3 2.5 2 1.8 3.6 1.2 5.4 4 8 8 8.2 12 8 14.8 5.4 14.2 3.6 13.5 2 9.5 3 8 6z" />
          <path d="M8 8.6c-1.6.2-4.4 1.6-4 3.4.4 1.4 2.8 1 4-1.4 1.2 2.4 3.6 2.8 4 1.4.4-1.8-2.4-3.2-4-3.4z" />
          <path d="M8 4.5L6.8 2.5M8 4.5l1.2-2" />
        </svg>
      );
    case "vague":
      return (
        <svg {...common}>
          <path d="M1 11c1.6 0 2.2-1.6 3.5-1.6S6.4 11 8 11s2.2-1.6 3.5-1.6S13.4 11 15 11" />
          <path d="M1 14c1.6 0 2.2-1.6 3.5-1.6S6.4 14 8 14s2.2-1.6 3.5-1.6S13.4 14 15 14" />
          <path d="M2.5 8.2C3 4.5 6 2.2 9.4 2.6c2.2.3 3.4 2 2.6 3.4-.7 1.2-2.4.8-2.6-.4" />
        </svg>
      );
    case "sommet":
      return (
        <svg {...common}>
          <path d="M1 14l5-8 2.5 3.5L11 5l4 9z" />
          <path d="M9.6 7.2l1.4-2.2 1.4 2.2" />
          <path d="M3 14l11-6" strokeDasharray="1.4 1.4" />
        </svg>
      );
    case "musee":
      return (
        <svg {...common}>
          <path d="M1.8 6 8 2l6.2 4H1.8Z" />
          <path d="M3.2 6.6v5.6M6.4 6.6v5.6M9.6 6.6v5.6M12.8 6.6v5.6" />
          <path d="M1.6 12.6h12.8M1 14.4h14" />
        </svg>
      );
    case "chataigne":
      return (
        <svg {...common}>
          <path d="M8 3.2c3.6 0 5.6 3 5.6 6.2 0 2.6-2.4 4.4-5.6 4.4s-5.6-1.8-5.6-4.4C2.4 6.2 4.4 3.2 8 3.2Z" />
          <path d="M8 1.4v1.8M4.4 11.2c1.2.9 2.3 1.2 3.6 1.2s2.4-.3 3.6-1.2" />
        </svg>
      );
    case "artifice":
      return (
        <svg {...common}>
          <path d="M8 8V15" />
          <path d="M8 7 8 1.6M8 7l3.8-3.8M8 7l5.2 0M8 7 4.2 3.2M8 7H2.8M8 7l3.4 3.4M8 7l-3.4 3.4" />
        </svg>
      );
    case "coeur":
      return (
        <svg {...common}>
          <path d="M8 13.8S2 10.2 2 6.2A3 3 0 0 1 8 4.8a3 3 0 0 1 6 1.4c0 4-6 7.6-6 7.6Z" />
        </svg>
      );
    case "porte-voix":
      return (
        <svg {...common}>
          <path d="M2.4 6.2H5L11 3v10L5 9.8H2.4z" />
          <path d="M5.4 10l1 3.4h1.4l-.6-3" />
          <path d="M12.9 6.4c.7.9.7 2.3 0 3.2M14.3 5.1c1.2 1.6 1.2 4.2 0 5.8" />
        </svg>
      );
    default:
      return null;
  }
}
