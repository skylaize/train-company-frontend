export type ThemeId = "sombre" | "papier" | "plan";

export const THEMES: { id: ThemeId; label: string; note: string; swatch: string[]; shop?: boolean }[] = [
  {
    id: "sombre",
    label: "Nuit",
    note: "Le poste de commande : fond sombre, accents cyan et ambre",
    swatch: ["#0b0f19", "#38bdf8", "#f59e0b"],
  },
  {
    id: "papier",
    label: "Papier",
    note: "Le bordereau imprimé : crème, encre noire et vert wagon",
    swatch: ["#e9e4d7", "#1f5c4d", "#a06a17"],
  },
  {
    id: "plan",
    label: "Plan 1935",
    note: "Le plan d'ingénieur : bleu de tirage, trait blanc, crayon jaune",
    swatch: ["#122d54", "#d6e8fa", "#f4d06f"],
    // débloqué en boutique : proposé à tous, grisé pour ceux qui ne l'ont pas
    shop: true,
  },
];

const KEY = "reseau.theme";

const META_COLOR: Record<ThemeId, string> = {
  sombre: "#0b0f19",
  papier: "#e9e4d7",
  plan: "#122d54",
};

function isTheme(v: string | null): v is ThemeId {
  return v === "sombre" || v === "papier" || v === "plan";
}

/* Le thème est stocké sur le compte, mais aussi en local : sans ça, chaque
   chargement de page afficherait le thème par défaut pendant la seconde que
   dure l'appel réseau, et l'écran clignoterait. */
export function readLocalTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY);
    return isTheme(v) ? v : "sombre";
  } catch {
    return "sombre";
  }
}

export function applyTheme(theme: ThemeId) {
  const safe: ThemeId = isTheme(theme) ? theme : "sombre";
  document.documentElement.dataset.theme = safe;
  // la barre d'adresse du mobile suit la couleur de fond
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", META_COLOR[safe]);
  try {
    localStorage.setItem(KEY, safe);
  } catch {
    /* navigation privée : le thème du compte prendra le relais au prochain chargement */
  }
}
