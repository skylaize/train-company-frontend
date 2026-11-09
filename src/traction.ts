/* 2.7 : ce qui fait rouler une rame, pour l'éruption solaire. Même règle que
   le serveur : une rame est électrique sur une ligne électrifiée (sauf la
   vapeur et la Micheline), le TGV l'est toujours ; côté fret, seule
   l'« Électrique longue distance » l'est. */
export type Traction = "electrique" | "diesel" | "vapeur";

export function tractionOf(t: { model: string; heritage?: { skin?: string } | null; line?: { electrified?: boolean } | null }): Traction {
  const skin = t.heritage?.skin;
  if (t.model === "VAPEUR" || skin === "vapeur") return "vapeur";
  if (t.model === "TGV" || t.model === "FRET_ELECTRIQUE") return "electrique";
  if (["LOCOTRACTEUR", "FRET_LOURD", "FRET_RAPIDE"].includes(t.model) || skin === "micheline") return "diesel";
  return t.line?.electrified ? "electrique" : "diesel";
}

export const TRACTION_LABEL: Record<Traction, string> = { electrique: "Électrique", diesel: "Diesel", vapeur: "Vapeur" };

export function tractionHint(t: { model: string; line?: { electrified?: boolean } | null }, tr: Traction) {
  if (tr === "vapeur") return "Vapeur : roule pendant l'éruption solaire";
  if (tr === "diesel") {
    if (!["LOCOTRACTEUR", "FRET_LOURD", "FRET_RAPIDE"].includes(t.model) && !t.line) return "Diesel tant qu'elle n'est pas sur une ligne électrifiée : roule pendant l'éruption solaire";
    return "Diesel : roule pendant l'éruption solaire";
  }
  if (t.model === "FRET_ELECTRIQUE") return "Électrique : ralentie par l'éruption solaire, ne peut pas partir vers une région coupée";
  if (t.model === "TGV") return "Électrique : ralentie par l'éruption solaire, à quai sous la coupure";
  return "Électrique parce que sa ligne est électrifiée : ralentie par l'éruption solaire, à quai sous la coupure. Sur une ligne non électrifiée, elle roule au diesel";
}
