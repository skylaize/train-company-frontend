import { useEffect, useState } from "react";

/* ============================================================
   Le fil du réseau (1.7).

   La barre du haut disait « Réseau opérationnel », toujours. Elle fait
   maintenant défiler ce qui se passe : vos rames qui arrivent, une autre
   compagnie qui ouvre une ligne, un salon qui commence à Lyon. Le monde
   bouge même quand on ne touche à rien.
   ============================================================ */

export interface NewsItem {
  id: string;
  at: string;
  text: string;
  tone: "moi" | "rival" | "reseau" | "alerte";
}

const DOT: Record<NewsItem["tone"], string> = {
  moi: "bg-rail-green",
  rival: "bg-amber",
  reseau: "bg-cobalt",
  alerte: "bg-rail-red",
};

export function NewsTicker({ items }: { items: NewsItem[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setI((n) => n + 1), 6000);
    return () => clearInterval(t);
  }, [items.length]);
  const item = items[i % items.length];
  if (!item) return null;
  const time = new Date(item.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <span className="relative flex items-center gap-2 min-w-0 flex-1 overflow-hidden h-4" aria-live="polite">
      <span key={item.id} className="ticker-in flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[item.tone]} ${item.tone === "alerte" ? "blink-dot" : ""}`} />
        <span className="text-slate2 shrink-0">{time}</span>
        <span className="normal-case tracking-normal font-body text-[12px] text-offwhite/90 truncate">{item.text}</span>
      </span>
    </span>
  );
}
