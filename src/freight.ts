/* ============================================================
   2.1 : le matériel de fret, côté interface. Une locomotive tire des
   wagons typés : plusieurs wagons du même type portent plus (le contrat
   paie plus), des types différents prennent plusieurs contrats en une
   tournée. Doit rester aligné sur freight.service côté serveur.
   ============================================================ */

export const WAGON_TYPES: { id: string; label: string; short: string; cargos: string[]; price: number }[] = [
  { id: "W_TREMIE", label: "Wagon-trémie", short: "Trémie", cargos: ["Céréales"], price: 140 },
  { id: "W_PLAT", label: "Wagon plat", short: "Plat", cargos: ["Acier", "Bois"], price: 120 },
  { id: "W_CONTENEUR", label: "Wagon porte-conteneurs", short: "Conteneurs", cargos: ["Conteneurs"], price: 150 },
  { id: "W_PORTE_AUTOS", label: "Wagon porte-autos", short: "Porte-autos", cargos: ["Automobiles"], price: 190 },
  { id: "W_CITERNE", label: "Wagon-citerne", short: "Citerne", cargos: ["Produits chimiques"], price: 180 },
  { id: "W_CAPITONNE", label: "Wagon couvert capitonné", short: "Capitonné", cargos: ["Verre soufflé", "Œuvres d'art"], price: 220 },
  { id: "W_FRIGO", label: "Wagon frigorifique", short: "Frigo", cargos: ["Produits pharmaceutiques réfrigérés"], price: 240 },
];
export const wagonForCargo = (cargo: string) => WAGON_TYPES.find((w) => w.cargos.includes(cargo)) ?? null;
export const FREIGHT_CATALOG = [
  { id: "LOCOTRACTEUR", name: "Locotracteur", spec: "La petite machine pour débuter le fret : deux wagons, trajets courts.", maxWagons: 2, pace: 1.15, bonus: 1, speedLevel: 1, price: 300, minGradeId: 0, sample: ["W_TREMIE", "W_PLAT"] },
  { id: "FRET_LOURD", name: "Fret Lourd", spec: "Le cheval de trait : quatre wagons, le vrac et l'acier. +10 % sur chaque livraison.", maxWagons: 4, pace: 1.1, bonus: 1.1, speedLevel: 1, price: 450, minGradeId: 2, sample: ["W_TREMIE", "W_PLAT", "W_PLAT"] },
  { id: "FRET_RAPIDE", name: "Messagerie rapide", spec: "Trois wagons, 30 % plus rapide. Fait pour le fragile et le frais. +15 % sur chaque livraison.", maxWagons: 3, pace: 0.7, bonus: 1.15, speedLevel: 3, price: 900, minGradeId: 2, sample: ["W_FRIGO", "W_CAPITONNE"] },
  { id: "FRET_ELECTRIQUE", name: "Électrique longue distance", spec: "Cinq wagons à bonne allure, pour les grandes tournées. +20 % sur chaque livraison.", maxWagons: 5, pace: 0.9, bonus: 1.2, speedLevel: 2, price: 1800, minGradeId: 4, sample: ["W_CITERNE", "W_PORTE_AUTOS", "W_CONTENEUR"] },
];
export const isFreightLoco = (model: string) => FREIGHT_CATALOG.some((m) => m.id === model);
export const isWagonId = (id: string) => WAGON_TYPES.some((w) => w.id === id);

export const LOAD_FACTOR = [0, 1, 1.6, 2.1, 2.5, 2.8, 3];
export const WAGON_DRAG = 0.04;
export const freightModel = (model: string) => FREIGHT_CATALOG.find((m) => m.id === model) ?? null;
export const wagonById = (id: string) => WAGON_TYPES.find((w) => w.id === id) ?? null;

/* charge d'une marchandise sur une rame : ×1, ×1,6, ×2,1… selon le nombre de wagons adaptés */
export function loadFor(cars: string[], cargo: string) {
  const w = wagonForCargo(cargo);
  const n = w ? cars.filter((c) => c === w.id).length : 0;
  return n > 0 ? LOAD_FACTOR[Math.min(n, LOAD_FACTOR.length - 1)] : 0;
}

/* durée d'une tournée : le plus long trajet, plus la moitié des autres, à l'allure de la locomotive et de ses wagons */
export function tourMinutes(model: string, durations: number[], wagonCount: number) {
  if (!durations.length) return 0;
  const sorted = [...durations].sort((a, b) => b - a);
  const raw = sorted[0] + sorted.slice(1).reduce((s, d) => s + d / 2, 0);
  const pace = (freightModel(model)?.pace ?? 1) * (1 + WAGON_DRAG * Math.max(0, wagonCount - 1));
  return Math.max(2, Math.round(raw * pace));
}

export const fmtLoad = (k: number) => `×${String(Math.round(k * 10) / 10).replace(".", ",")}`;
