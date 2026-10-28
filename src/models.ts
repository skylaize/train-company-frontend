/* 2.0 : les noms du matériel, partagés par toute l'interface. Le serveur
   reste la source de vérité des chiffres (prix, places, effets). */
export const MODEL_LABEL: Record<string, string> = {
  STANDARD: "Standard",
  EXPRESS: "Express",
  FRET_LOURD: "Fret lourd",
  COUCHETTES: "Couchettes",
  NUIT_EUROPE: "Nuit internationale", // 2.1.1
  VAPEUR: "Vapeur",
  LUXE: "Grand luxe",
  CREMAILLERE: "Crémaillère",
  AUTORAIL_CORSE: "Autorail corse", // 2.3
  // 2.1 : le fret
  LOCOTRACTEUR: "Locotracteur",
  FRET_RAPIDE: "Messagerie rapide",
  FRET_ELECTRIQUE: "Électrique longue distance",
  TGV: "TGV", // 2.2
};
export const modelLabel = (m: string) => MODEL_LABEL[m] ?? "Standard";
export const DLC_MODEL_IDS = new Set(["VAPEUR", "LUXE", "CREMAILLERE", "AUTORAIL_CORSE"]);

export const ORGAN_LABEL: Record<string, string> = { FREINS: "Freins", BOGIES: "Bogies", MOTEUR: "Moteur", CAISSE: "Caisse" };
export const PART_LABEL: Record<string, string> = {
  FREINS: "Garnitures de frein",
  BOGIES: "Bogie complet",
  MOTEUR: "Moteur de traction",
  CAISSE: "Panneaux de caisse",
};

export const hhmm = (iso: string | Date) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function minutesLeft(iso: string | Date, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000));
}

/* 2.4.1 : les heures précises (sortie d'atelier, livraison, arrivée) sont
   affichées à l'heure du joueur. Les règles du jeu qui tombent à heure fixe
   (pointe, nuit, horaires des rames, facture d'énergie) suivent l'heure de
   Paris, comme le serveur : on le précise à ceux qui ne sont pas à l'heure
   française. */
export const ON_PARIS_TIME = (() => {
  try {
    const now = new Date();
    const at = (tz?: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    return at() === at("Europe/Paris");
  } catch {
    return true;
  }
})();
export const PARIS_NOTE = ON_PARIS_TIME ? "" : " (heure de Paris)";

/* Durée relative d'un trajet selon le matériel (aligné sur le serveur). */
/* 2.2 : la rame TGV va à ×0,55 sur une LGV ouverte (×0,9 ailleurs, voir modelSpeed) */
export const MODEL_SPEED: Record<string, number> = { EXPRESS: 0.7, VAPEUR: 1.3, LUXE: 1.1, CREMAILLERE: 1.35, AUTORAIL_CORSE: 1.25, TGV: 0.55 };

/* 2.2 : une ligne dont la LGV est ouverte */
export const hslOpen = (l?: { highSpeedAt?: string | null } | null) => Boolean(l?.highSpeedAt && new Date(l.highSpeedAt).getTime() <= Date.now());
export const hslBuilding = (l?: { highSpeedAt?: string | null } | null) => Boolean(l?.highSpeedAt && new Date(l.highSpeedAt).getTime() > Date.now());
/* 2.4.1 : la rame TGV roule aussi sur une ligne classique électrifiée, à ×0,9 */
export const modelSpeed = (m: string, line?: { highSpeedAt?: string | null } | null) =>
  m === "TGV" && line !== undefined && !hslOpen(line) ? 0.9 : MODEL_SPEED[m] ?? 1;

/* « il faut … » : la pièce avec son article */
export const PART_NEED: Record<string, string> = {
  FREINS: "des garnitures de frein",
  BOGIES: "un bogie complet",
  MOTEUR: "un moteur de traction",
  CAISSE: "des panneaux de caisse",
};
