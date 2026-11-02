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
  bogies: [number, number]; // centre des bogies, depuis l'avant gauche du dessin
}

export interface SvgSkin {
  id: string;
  label: string;
  creator: string;
  head: SvgPart;
  cars: Record<string, SvgPart>; // par type de voiture (SECONDE, PREMIERE, BAR, COUCHETTE…)
  defaultCar: string;
  base: string[]; // la composition d'origine, de la queue vers la motrice
}

export const SVG_SKINS: Record<string, SvgSkin> = {
  intercites: {
    id: "intercites",
    label: "Intercités",
    creator: "N0RCAM",
    head: { file: "/skins/intercites/motrice.svg", width: 108.9, bogies: [24, 84.9] },
    cars: {
      SECONDE: { file: "/skins/intercites/seconde.svg", width: 200, bogies: [37, 163.1] },
      PREMIERE: { file: "/skins/intercites/premiere.svg", width: 200, bogies: [37, 163.1] },
      BAR: { file: "/skins/intercites/restaurant.svg", width: 200, bogies: [37, 163.1] },
    },
    defaultCar: "SECONDE",
    base: ["SECONDE", "BAR", "PREMIERE"],
  },
};

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
