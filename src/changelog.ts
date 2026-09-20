export const CURRENT_VERSION = "1.2.0";

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
    version: "1.2.0",
    date: "Septembre 2026",
    changes: [
      // --- l'économie et le temps long ---
      { type: "nouveau", text: "Donneurs d'ordre : quatre chargeurs vous confient des ordres de fret datés, à accepter ou à refuser. Les honorer fait monter votre réputation chez eux, qui majore le tarif de toutes leurs cargaisons jusqu'à +25 %. Un ordre accepté puis non tenu coûte leur confiance ; le refuser ne coûte rien" },
      { type: "nouveau", text: "Cours du fret : les neuf marchandises ont un prix qui monte et descend, commun à tout le réseau, avec la courbe des huit dernières heures et les événements qui l'expliquent — grève au port, récolte abondante, commande publique de rails" },
      { type: "nouveau", text: "Entrepôt : acheter bas, garder, revendre haut. La capacité limite la mise, les frais de garde font payer l'attente" },
      { type: "nouveau", text: "Livrer une marchandise recherchée paie plus : de −19 % à +24 % selon le cours du jour, affiché sur chaque contrat" },
      { type: "nouveau", text: "Chantiers : entrepôt, agrandissements et places de dépôt se construisent. On paie à la commande, la livraison vient plus tard, et on ne mène qu'un chantier à la fois" },
      { type: "nouveau", text: "Le dépôt n'a plus de plafond, mais chaque place coûte 1,7 fois la précédente — 1 670 pi. pour la 7e, 8 207 pour la 10e — et demande un chantier plus long" },
      { type: "nouveau", text: "Entretien du réseau : une charge qui croît avec le carré de votre parc, les deux premières rames exonérées. Votre compagnie a désormais une taille optimale, vers quatorze rames" },
      { type: "nouveau", text: "Le rendement d'une ligne croît avec sa longueur : de +0 % à 3 minutes de trajet jusqu'à +25 % à 20 minutes" },

      // --- la carte, l'équipement, l'abonnement ---
      { type: "nouveau", text: "Tracez une ligne directement sur la carte : cliquez deux gares, la distance et la durée se calculent toutes seules" },
      { type: "nouveau", text: "Les rames Express et Fret Lourd et le poste de Directeur commercial dépendent maintenant de votre grade et non de l'abonnement. Personne n'avait jamais pu les acheter : aucune compagnie ne pouvait devenir Premium" },
      { type: "nouveau", text: "Premium repensé : deux ordres par donneur d'ordre, six contrats de fret au lieu de quatre, réparation automatique des rames en panne, −20 % sur les places de dépôt, livrées réservées, alertes de cours, ordres permanents et cinq marchandises stockées en parallèle. Aucun bonus de revenu, aucun chantier accéléré" },
      { type: "nouveau", text: "Deux habillages au choix, Nuit et Papier, enregistrés sur votre compte" },

      // --- classement, parrainage, progression ---
      { type: "nouveau", text: "Quatre classements au lieu d'un : valeur de la compagnie, fret de la semaine, ponctualité, parrains. Votre position s'affiche toujours, même hors du top 20, avec l'écart qui vous sépare de la compagnie devant vous" },
      { type: "nouveau", text: "Paliers de parrainage : une place de dépôt à 3 filleuls, le titre « Recruteur du rail » à 5, une rame Express offerte à 10. Le bandeau de la flotte donne un message tout prêt et la progression" },
      { type: "nouveau", text: "16 nouveaux succès et un défi quotidien qui passe de 3 à 15 modèles, tirés parmi ceux à la portée de votre grade" },
      { type: "nouveau", text: "Chaque nouveauté s'explique la première fois que vous ouvrez sa page, et l'explication est mémorisée sur votre compte" },

      { type: "ameliore", text: "Le classement principal repose sur la valeur totale de la compagnie — trésorerie, matériel et dépôt réunis : acheter une rame ne vous fait plus reculer" },
      { type: "ameliore", text: "La ponctualité n'est classée qu'à partir de dix trajets, et le grade de chaque compagnie est visible au classement" },
      { type: "ameliore", text: "La durée d'un trajet découle de la distance réelle entre les deux gares. Vos lignes existantes ont été recalculées" },
      { type: "ameliore", text: "Tutoriel refondu : huit étapes, dont trois qui attendent que vous agissiez vraiment. Pendant ces étapes, l'interface reste entière et cliquable" },
      { type: "ameliore", text: "La flotte affiche l'entretien horaire du réseau, le prix et la durée du prochain chantier de dépôt" },
      { type: "ameliore", text: "Bulletin de service refait : toutes les versions sont consultables, les lignes regroupées par nature" },
      { type: "ameliore", text: "Vous êtes prévenu quand un filleul rejoint le réseau, quand la prime tombe et quand un palier est atteint" },

      { type: "corrige", text: "L'usure réduite promise aux abonnés ne faisait rien : l'arrondi ramenait 2 × 0,3 et 2 ÷ 2 à la même valeur. Le mécanicien est enfin pleinement utile" },
      { type: "corrige", text: "Un « retard » ne retardait rien : la progression étant calculée depuis l'heure de départ, l'incident faisait même sauter l'usure du tour" },
      { type: "corrige", text: "Le marché garantit la présence de la marchandise réclamée par un ordre en cours : un ordre ne peut plus devenir infaisable sans votre faute" },
      { type: "corrige", text: "Une cargaison endommagée en route ne compte plus pour un ordre de mission" },
      { type: "corrige", text: "Le fret n'usait pas les rames : une rame affectée à des livraisons roulait indéfiniment sans jamais tomber en panne, alors que le fret paie mieux qu'une ligne voyageurs. L'usure s'applique désormais des deux côtés, mécanicien et canicule compris" },
      { type: "corrige", text: "Un retard sur le fret ne retardait rien non plus, et faisait sauter l'usure du tour. Il décale maintenant vraiment la livraison" },
      { type: "corrige", text: "Un faux compte ne rapporte plus de palier : seuls les filleuls ayant atteint le grade « Gestionnaire confirmé » comptent" },
      { type: "corrige", text: "La page d'accueil débordait horizontalement sur téléphone, et ses avantages Premium dataient du lancement" },
      { type: "corrige", text: "Classement et progression de parrainage sont mis en cache côté serveur, pour alléger la base de données" },
    ],
  },
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
