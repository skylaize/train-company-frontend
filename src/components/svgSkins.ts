/* ============================================================
   2.6 : les habillages dessinés par les joueurs (Série Créateurs).

   Jusqu'ici, chaque habillage était dessiné en code (trainArt.ts). Un
   habillage de créateur est un jeu de fichiers SVG : la motrice et une
   voiture par type (2de, 1re, restaurant). Le jeu les pose sur ses propres
   bogies, aux repères `bogie-1` et `bogie-2` du dessin, et les adapte :
   - la livrée : le magenta pur (#FF00FF) prend la couleur de la compagnie ;
   - le jour, les fenêtres sont en verre sombre ; elles s'allument la nuit,
     telles que le créateur les a dessinées.

   Les fichiers vivent dans public/skins/<id>/ et sont chargés à la demande.
   Tant qu'un dessin n'est pas prêt, la rame s'affiche sous sa forme
   habituelle ; à l'arrivée du dessin, un événement « reseau-skin » demande
   aux canevas fixes de se redessiner (les scènes animées le font seules).

   Ajouter un habillage de créateur : déposer ses fichiers, recadrés sur la
   caisse (bas de caisse en bas du cadre de 46), puis le déclarer ci-dessous.
   ============================================================ */

export interface SvgPart {
  file: string;
  width: number; // longueur, en unités du jeu (une voiture ordinaire fait 200)
  height?: number; // hauteur de l'image, en unités du jeu (46 par défaut, la hauteur d'une caisse) ; posée sur le bas de caisse
  bogies: number[]; // centre des bogies (ou des essieux), depuis l'avant gauche du dessin
  sink?: number; // 2.7 : descend le dessin de tant d'unités, quand des pièces (marchepieds, tampons) pendent sous la caisse et la faisaient flotter au-dessus des bogies
}

export interface SvgSkin {
  id: string;
  label: string;
  creator: string;
  head: SvgPart;
  cars: Record<string, SvgPart>; // par type de voiture (SECONDE, PREMIERE, BAR, COUCHETTE…)
  defaultCar: string;
  base: string[]; // la composition d'origine, de la queue vers la motrice
  /* 2.7 : un habillage de locomotive de fret. Il ne s'applique qu'à ces
     modèles, garde les wagons de la rame, et se choisit à part
     (company.freightSkin) ; les autres ne s'appliquent qu'aux rames de voyageurs. */
  models?: string[];
}

const INTERCITES_CARS = (dir: string): Record<string, SvgPart> => ({
  SECONDE: { file: `/skins/${dir}/seconde.svg`, width: 200, bogies: [37, 163.1] },
  PREMIERE: { file: `/skins/${dir}/premiere.svg`, width: 200, bogies: [37, 163.1] },
  BAR: { file: `/skins/${dir}/restaurant.svg`, width: 200, bogies: [37, 163.1] },
});

export const SVG_SKINS: Record<string, SvgSkin> = {
  intercites: {
    id: "intercites",
    label: "Intercités",
    creator: "N0RCAM",
    // la motrice est dessinée plus petite que les voitures sur la planche : agrandie ×1,3 pour que son toit arrive à celui des voitures
    head: { file: "/skins/intercites/motrice.svg", width: 141.6, height: 44.6, bogies: [31.2, 110.4] },
    cars: INTERCITES_CARS("intercites"),
    defaultCar: "SECONDE",
    base: ["SECONDE", "BAR", "PREMIERE"],
  },
  // 2.7 : la même rame en livrée carmillon, vendue en boutique (la version à vos couleurs passe dans le pass)
  "intercites-carmillon": {
    id: "intercites-carmillon",
    label: "Intercités carmillon",
    creator: "N0RCAM",
    head: { file: "/skins/intercites-carmillon/motrice.svg", width: 141.6, height: 44.6, bogies: [31.2, 110.4] },
    cars: INTERCITES_CARS("intercites-carmillon"),
    defaultCar: "SECONDE",
    base: ["SECONDE", "BAR", "PREMIERE"],
  },
  // 2.7 : pass de saison « Retour au vieux matériel »
  "rer-c": {
    id: "rer-c",
    label: "RER C",
    creator: "N0RCAM",
    // dessinée plus petite que les autres sur la planche : agrandie ×1,4 pour qu'une voiture à deux niveaux dépasse un peu les autres
    head: { file: "/skins/rer-c/motrice.svg", width: 260.7, height: 64.4, bogies: [31.2, 229.9] },
    cars: {
      SECONDE: { file: "/skins/rer-c/seconde.svg", width: 280.0, height: 64.4, bogies: [36.4, 242.9] },
      PREMIERE: { file: "/skins/rer-c/premiere.svg", width: 280.0, height: 64.4, bogies: [36.4, 242.9] },
      BAR: { file: "/skins/rer-c/restaurant.svg", width: 280.0, height: 64.4, bogies: [36.4, 242.9] },
    },
    defaultCar: "SECONDE",
    base: ["SECONDE", "PREMIERE"],
  },
  bb69200: {
    id: "bb69200",
    label: "BB 69200",
    creator: "N0RCAM",
    head: { file: "/skins/bb69200/motrice.svg", width: 197.4, height: 62.1, bogies: [44.0, 157.3], sink: 4 },
    cars: {},
    defaultCar: "",
    base: [],
    models: ["FRET_RAPIDE"],
  },
};

const FREIGHT_MODELS = ["LOCOTRACTEUR", "FRET_LOURD", "FRET_RAPIDE", "FRET_ELECTRIQUE"];

/* 2.7 : un habillage va-t-il sur ce modèle ? Sans modèle (vignette de
   boutique), oui. Les habillages de fret ne vont que sur leur locomotive,
   les autres que sur les rames de voyageurs. */
export function skinFits(skin: string | null | undefined, model: string | null | undefined) {
  if (!skin) return false;
  if (!model) return true;
  const svg = SVG_SKINS[skin];
  if (svg?.models) return svg.models.includes(model);
  return !FREIGHT_MODELS.includes(model);
}

export const isFreightSkin = (id: string | null | undefined) => Boolean(id && SVG_SKINS[id]?.models);

/* L'habillage de vue cabine d'une rame de la compagnie : celui des voyageurs
   ou celui du fret, selon le modèle. */
export function companySkinFor(model: string | null | undefined, cabSkin: string | null | undefined, freightSkin: string | null | undefined) {
  if (freightSkin && skinFits(freightSkin, model)) return freightSkin;
  if (cabSkin && skinFits(cabSkin, model)) return cabSkin;
  return null;
}

export const isSvgSkin = (id: string | null | undefined): id is string => Boolean(id && SVG_SKINS[id]);

/* ---------------- chargement ---------------- */

// la nuit (fenêtres allumées) est le dessin d'origine ; le jour, ces teintes chaudes deviennent du verre sombre
const LIT_TO_DAY: [RegExp, string][] = [
  [/rgb\(249,\s*220,\s*162\)/g, "rgb(44,58,78)"],
  [/rgb\(241,\s*188,\s*101\)/g, "rgb(24,32,46)"],
];
const MAGENTA = /rgb\(255,\s*0,\s*255\)|#ff00ff|#f0f\b/gi;

const texts = new Map<string, Promise<string | null>>();
const images = new Map<string, HTMLImageElement | "loading" | "error">();

function sourceOf(file: string) {
  if (!texts.has(file)) {
    texts.set(
      file,
      fetch(file)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null)
    );
  }
  return texts.get(file)!;
}

function announce() {
  try {
    window.dispatchEvent(new Event("reseau-skin"));
  } catch {
    /* hors navigateur */
  }
}

/* Le dessin prêt à poser, pour cette livrée et cet éclairage ; null tant qu'il charge. */
export function svgImage(part: SvgPart, livery: string, lit: boolean): HTMLImageElement | null {
  if (typeof window === "undefined" || typeof Image === "undefined") return null;
  const key = `${part.file}|${livery}|${lit ? 1 : 0}`;
  const have = images.get(key);
  if (have && have !== "loading" && have !== "error") return have;
  if (have) return null;
  images.set(key, "loading");
  void sourceOf(part.file).then((text) => {
    if (!text) {
      images.set(key, "error");
      return;
    }
    let svg = text.replace(MAGENTA, livery);
    if (!lit) for (const [re, to] of LIT_TO_DAY) svg = svg.replace(re, to);
    const img = new Image();
    img.onload = () => {
      images.set(key, img);
      announce();
    };
    img.onerror = () => images.set(key, "error");
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  return null;
}

/* Les canevas fixes (vignettes, composition) se redessinent quand un dessin arrive. */
export function onSkinReady(fn: () => void) {
  window.addEventListener("reseau-skin", fn);
  return () => window.removeEventListener("reseau-skin", fn);
}

/* L'adresse d'un véhicule seul (vignettes « ce qui est inclus ») ; null tant qu'il charge. */
export function svgPartUrl(part: SvgPart, livery: string, lit: boolean): string | null {
  return svgImage(part, livery, lit)?.src ?? null;
}
