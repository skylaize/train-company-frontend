import { ReactNode, useEffect, useState } from "react";
import { Emblem } from "./Emblem";
import { TrainMark } from "./TrainMark";

/* ============================================================
   Menu (2.0).

   Sur ordinateur, une colonne calme : des icônes sans cadre, des groupes
   nommés en minuscules. 2.3 : la rubrique active est une pastille teintée,
   le filet à gauche faisait « tableau de bord générique ».
   Sur téléphone, une barre d'onglets en bas de l'écran, à portée de pouce,
   et toutes les autres rubriques dans « Plus ».
   ============================================================ */

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
  alert?: boolean;
  dataTutorial?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function NavRow({ item }: { item: NavItem }) {
  return (
    <button
      data-tutorial={item.dataTutorial}
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
      className={`relative w-full flex items-center gap-3 px-3 py-[7px] rounded-control text-[14.5px] font-body text-left transition-colors ${
        item.active ? "bg-cobalt/[0.12] text-offwhite font-medium" : "text-slate2 hover:text-offwhite hover:bg-offwhite/[0.05]"
      }`}
    >
      <span className={`shrink-0 inline-flex ${item.active ? "text-cobalt" : ""}`}>{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.alert && <span className="w-1.5 h-1.5 rounded-full bg-amber" aria-label="demande en attente" />}
      {item.count !== undefined && item.count > 0 && (
        <span className={`text-[12px] tabular-nums ${item.active ? "text-cobalt" : "text-slate2/70"}`}>{item.count}</span>
      )}
    </button>
  );
}

/* L'emblème (ou la rame) de la compagnie, dans un carré à sa livrée. */
export function CompanyBadge({ company, size = 36 }: { company: { liveryColor: string; emblem?: string | null }; size?: number }) {
  const icon = Math.round(size * 0.55);
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center rounded-control"
      style={{ width: size, height: size, background: `${company.liveryColor}26`, boxShadow: `inset 0 0 0 1px ${company.liveryColor}80`, color: company.liveryColor }}
      aria-hidden="true"
    >
      {company.emblem ? <Emblem id={company.emblem} size={icon} /> : <TrainMark size={icon} />}
    </span>
  );
}

interface Extra {
  id: string;
  label: string;
  onClick: () => void;
  accent?: boolean;
}

export function MobileTabBar({ tabs, groups, extra, current }: { tabs: NavItem[]; groups: NavGroup[]; extra: Extra[]; current: string }) {
  const [open, setOpen] = useState(false);
  // changer de rubrique referme le panneau
  useEffect(() => setOpen(false), [current]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const inTabs = new Set(tabs.map((t) => t.id));
  const moreActive = !tabs.some((t) => t.active);
  const moreAlert = groups.some((g) => g.items.some((i) => i.alert && !inTabs.has(i.id)));

  return (
    <>
      {open && (
        <div data-modal data-nav-sheet className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Toutes les rubriques">
          <button className="absolute inset-0 bg-navy-950/70" aria-label="Fermer" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 bottom-0 max-h-[82vh] overflow-y-auto bg-navy-900 border-t border-line rounded-t-[18px] pb-[calc(env(safe-area-inset-bottom)+72px)] sheet-up">
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="w-10 h-1 rounded-full bg-line" />
            </div>
            {groups.map((g) => (
              <div key={g.label} className="pt-2">
                <div className="px-5 pb-1 text-[12px] font-body text-slate2/70">{g.label}</div>
                <div className="grid grid-cols-2 gap-1 px-2">
                  {g.items.map((it) => (
                    <button
                      key={it.id}
                      onClick={it.onClick}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-control text-[14.5px] font-body text-left ${it.active ? "text-cobalt bg-cobalt/[0.12]" : "text-offwhite"}`}
                    >
                      <span className="shrink-0">{it.icon}</span>
                      <span className="truncate">{it.label}</span>
                      {it.alert && <span className="w-1.5 h-1.5 rounded-full bg-amber" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-2 border-t border-line pt-1">
              {extra.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setOpen(false);
                    e.onClick();
                  }}
                  className={`block w-full text-left px-5 py-3 text-[14.5px] font-body ${e.accent ? "text-amber" : "text-slate2"}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav
        className="app-tabbar md:hidden fixed left-0 right-0 bottom-0 z-[60] grid grid-cols-5 border-t border-line bg-navy-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
        aria-label="Rubriques principales"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={t.onClick}
            data-tutorial={t.dataTutorial}
            aria-current={t.active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 pt-2 pb-2 text-[11.5px] font-body ${t.active && !open ? "text-cobalt font-medium" : "text-slate2"}`}
          >
            <span className={`inline-flex items-center justify-center w-12 h-7 rounded-full transition-colors ${t.active && !open ? "bg-cobalt/[0.15]" : ""}`}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`relative flex flex-col items-center gap-0.5 pt-2 pb-2 text-[11.5px] font-body ${open || moreActive ? "text-cobalt font-medium" : "text-slate2"}`}
        >
          <span className={`inline-flex items-center justify-center w-12 h-7 rounded-full transition-colors ${open || moreActive ? "bg-cobalt/[0.15]" : ""}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          Plus
          {moreAlert && <span className="absolute top-2 right-[30%] w-1.5 h-1.5 rounded-full bg-amber" />}
        </button>
      </nav>
    </>
  );
}
