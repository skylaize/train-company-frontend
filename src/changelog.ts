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
      { type: "nouveau", text: "Lancement de Réseau : créez votre compagnie, tracez vos lignes, gérez vos trains" },
      { type: "nouveau", text: "Fret et contrats de marchandises, y compris les cargaisons fragiles à risque" },
      { type: "nouveau", text: "Personnel de compagnie (mécanicien, chef de dépôt) et statut Premium (rames Express et Fret Lourd, Directeur commercial)" },
      { type: "nouveau", text: "Météo dynamique, réputation de compagnie et revenus voyageurs" },
      { type: "nouveau", text: "Classement national, succès à débloquer et défi quotidien" },
      { type: "nouveau", text: "Carte du réseau en direct, historique de trésorerie et résumé du jour" },
      { type: "nouveau", text: "Page d'accueil publique et tutoriel guidé" },
    ],
  },
];
