import { useEffect, useState } from "react";
import { SVG_SKINS, svgPartUrl, onSkinReady } from "./svgSkins";

/* 2.5.1 : un véhicule seul d'un habillage de créateur (la motrice, une voiture),
   à la livrée choisie. Sert à la fiche « ce qui est inclus » de la boutique. */
export function SkinPartThumb({ skin, part, livery, height = 34 }: { skin: string; part: "HEAD" | string; livery: string; height?: number }) {
  const [, tick] = useState(0);
  useEffect(() => onSkinReady(() => tick((n) => n + 1)), []);
  const s = SVG_SKINS[skin];
  if (!s) return null;
  const p = part === "HEAD" ? s.head : s.cars[part] ?? s.cars[s.defaultCar];
  const url = svgPartUrl(p, livery, false);
  const w = (p.width / 46) * height;
  return (
    <div className="flex justify-center" style={{ height }}>
      {url ? <img src={url} alt="" style={{ height, width: w, maxWidth: "100%", objectFit: "contain" }} /> : <span className="block w-full h-full bg-white/5 rounded" />}
    </div>
  );
}
