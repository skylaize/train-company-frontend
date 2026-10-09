/* 2.0 : la vraie météo de chaque gare (relevée par le serveur auprès de
   MET Norway). Gardée ici, hors de React : la vue cabine la lit à chaque
   image pour savoir quel temps il fait là où roule la rame. */

export type WxKind = "CLAIR" | "NUAGEUX" | "PLUIE" | "ORAGE" | "NEIGE" | "VERGLAS" | "BROUILLARD" | "CANICULE";
export interface StationWx {
  kind: WxKind;
  label: string;
  effect: string | null;
  temp: number;
  wind: number; // km/h
  isDay: boolean;
}

let map: Record<string, StationWx> = {};
export function setStationWeather(m: Record<string, StationWx> | null | undefined) {
  map = m ?? {};
}
export function weatherAt(station: string | null | undefined): StationWx | null {
  return station ? map[station] ?? null : null;
}

// le nom que la scène de la vue cabine donne à chaque temps
export const SCENE_KIND: Record<WxKind, string> = {
  CLAIR: "clair", NUAGEUX: "nuageux", PLUIE: "pluie", ORAGE: "orage", NEIGE: "neige", VERGLAS: "verglas", BROUILLARD: "brouillard", CANICULE: "canicule",
};
