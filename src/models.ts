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
  // 2.1 : le fret
  LOCOTRACTEUR: "Locotracteur",
  FRET_RAPIDE: "Messagerie rapide",
  FRET_ELECTRIQUE: "Électrique longue distance",
};
export const modelLabel = (m: string) => MODEL_LABEL[m] ?? "Standard";
export const DLC_MODEL_IDS = new Set(["VAPEUR", "LUXE", "CREMAILLERE"]);

export const ORGAN_LABEL: Record<string, string> = { FREINS: "Freins", BOGIES: "Bogies", MOTEUR: "Moteur", CAISSE: "Caisse" };
export const PART_LABEL: Record<string, string> = {
  FREINS: "Garnitures de frein",
  BOGIES: "Bogie complet",
  MOTEUR: "Moteur de traction",
  CAISSE: "Panneaux de caisse",
};

export const hhmm = (iso: string | Date) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function minutesLeft(iso: string | Date, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000));
}

/* Durée relative d'un trajet selon le matériel (aligné sur le serveur). */
export const MODEL_SPEED: Record<string, number> = { EXPRESS: 0.7, VAPEUR: 1.3, LUXE: 1.1, CREMAILLERE: 1.35 };
export const modelSpeed = (m: string) => MODEL_SPEED[m] ?? 1;

/* « il faut … » : la pièce avec son article */
export const PART_NEED: Record<string, string> = {
  FREINS: "des garnitures de frein",
  BOGIES: "un bogie complet",
  MOTEUR: "un moteur de traction",
  CAISSE: "des panneaux de caisse",
};
