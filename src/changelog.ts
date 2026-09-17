export const CURRENT_VERSION = "1.0.0";

export type ChangeType = "nouveau" | "ameliore" | "corrige";

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: ChangeType; text: string }[];
}

// Ajoutez une nouvelle entrée EN HAUT de ce tableau à chaque mise à jour notable,
// à partir de maintenant (la version 1.0.0 ci-dessous est le tout premier lancement,
// regroupant tout ce qui a été construit avant la mise en ligne).
// CURRENT_VERSION doit toujours correspondre au numéro de la première entrée.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "Septembre 2026",
    changes: [
      { type: "nouveau", text: "Fondez votre compagnie, tracez vos lignes et gérez votre flotte de trains" },
      { type: "nouveau", text: "Fret à risque, personnel et statut Premium (rames exclusives, Directeur commercial)" },
      { type: "nouveau", text: "Météo dynamique et réputation influençant vos revenus" },
      { type: "nouveau", text: "Classement, succès et défi quotidien" },
      { type: "nouveau", text: "Carte du réseau en direct et tutoriel guidé" },
    ],
  },
];
