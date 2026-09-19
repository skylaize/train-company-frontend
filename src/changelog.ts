export const CURRENT_VERSION = "1.1.0";

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
    version: "1.1.0",
    date: "Septembre 2026",
    changes: [
      { type: "nouveau", text: "Carrière : cinq grades à franchir, chacun débloqué par une chaîne d'objectifs précis" },
      { type: "nouveau", text: "Assurance fret : réduisez le risque de dommage d'une cargaison fragile contre une prime" },
      { type: "nouveau", text: "8 nouveaux succès : vétéran du rail, passage au Premium, flotte diversifiée, équipe complète, assurance, grand réseau et champion du réseau" },
      { type: "nouveau", text: "Parrainage : invitez des amis avec votre code, 100 pi. pour eux, 150 pi. pour vous une fois qu'ils ont vraiment commencé à jouer" },
      { type: "ameliore", text: "Le modèle de chaque rame (Standard, Express, Fret Lourd) est maintenant visible dans la flotte" },
      { type: "ameliore", text: "Le tutoriel est désormais mémorisé sur votre compte, plus seulement sur votre navigateur" },
      { type: "ameliore", text: "Le fret peut désormais subir des retards comme les lignes voyageurs, et la météo l'affecte enfin aussi" },
      { type: "corrige", text: "Réduction du taux d'incidents, devenu excessif sur les lignes longues" },
      { type: "corrige", text: "Coût de réparation réduit, pour éviter qu'une double panne ne bloque un nouveau joueur sans argent" },
      { type: "corrige", text: "Les succès restent désormais acquis pour toujours, même si la condition qui les a débloqués ne l'est plus" },
      { type: "corrige", text: "Correction de plusieurs bugs d'affectation de trains et de menus déroulants" },
      { type: "corrige", text: "Le tutoriel ne masque plus le bouton d'achat quand le catalogue est déjà ouvert" },
      { type: "corrige", text: "Le tutoriel ne bloque plus le formulaire de création de ligne" },
    ],
  },
  {
    version: "1.0.0",
    date: "Septembre 2026",
    changes: [
      { type: "nouveau", text: "Fondez votre compagnie, tracez vos lignes et gérez votre flotte de trains" },
      { type: "nouveau", text: "Fret et contrats de marchandises, y compris les cargaisons fragiles à risque" },
      { type: "nouveau", text: "Personnel de compagnie (mécanicien, chef de dépôt) et statut Premium (rames Express et Fret Lourd, Directeur commercial)" },
      { type: "nouveau", text: "Météo dynamique et réputation influençant vos revenus" },
      { type: "nouveau", text: "Classement national, succès à débloquer et défi quotidien" },
      { type: "nouveau", text: "Carte du réseau en direct et tutoriel guidé" },
      { type: "nouveau", text: "Page d'accueil publique avec présentation du jeu et des offres" },
    ],
  },
];
