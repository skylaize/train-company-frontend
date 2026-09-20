export type ThemeId = "sombre" | "papier";

export const THEMES: { id: ThemeId; label: string; note: string }[] = [
  { id: "sombre", label: "Nuit", note: "Le poste de commande : fond sombre, accents cyan et ambre" },
  { id: "papier", label: "Papier", note: "Le bordereau imprimé : crème, encre noire et vert wagon" },
];

const KEY = "reseau.theme";

/* Le thème est stocké sur le compte, mais aussi en local : sans ça, chaque
   chargement de page afficherait le thème par défaut pendant la seconde que
   dure l'appel réseau, et l'écran clignoterait. */
export function readLocalTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY);
    return v === "papier" || v === "sombre" ? v : "sombre";
  } catch {
    return "sombre";
  }
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  // la barre d'adresse du mobile suit la couleur de fond
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "papier" ? "#e9e4d7" : "#0b0f19");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* navigation privée : le thème du compte prendra le relais au prochain chargement */
  }
}
