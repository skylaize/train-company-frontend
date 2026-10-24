import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Link } from "react-router-dom";
import { api } from "../../api/client";
import { LogoMark } from "../../components/Logo";
import { ConfirmProvider, errorText } from "./ui";
import Overview from "./Overview";
import Players from "./Players";
import Seasons from "./Seasons";
import Alliances from "./Alliances";
import Shop from "./Shop";
import Giveaways from "./Giveaways";
import Announcements from "./Announcements";
import Logs from "./Logs";
import Economy from "./Economy";

/* ============================================================
   Panneau d'administration de Réseau (2.2).
   Réservé aux comptes listés dans ADMIN_EMAILS côté serveur : la page
   elle-même ne protège rien, chaque appel est vérifié par l'API.
   ============================================================ */

const SECTIONS = [
  { to: "", label: "Vue d'ensemble", end: true },
  { to: "joueurs", label: "Joueurs" },
  { to: "annonces", label: "Annonces" },
  { to: "giveaways", label: "Giveaways" },
  { to: "saisons", label: "Saisons et chantier" },
  { to: "economie", label: "Économie" },
  { to: "alliances", label: "Alliances" },
  { to: "boutique", label: "Boutique" },
  { to: "journal", label: "Journal" },
];

export default function AdminPage() {
  const [state, setState] = useState<"checking" | "ok" | { error: string }>("checking");
  const [me, setMe] = useState<{ name: string } | null>(null);

  useEffect(() => {
    document.title = "Admin · Réseau";
    api
      .get("/admin/me")
      .then(({ data }) => {
        setMe(data);
        setState("ok");
      })
      .catch((err) => setState({ error: errorText(err) }));
  }, []);

  if (state === "checking") return <div className="min-h-screen bg-navy-950" />;
  if (state !== "ok") {
    return (
      <main className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <LogoMark size={48} className="mx-auto" />
          <h1 className="mt-5 font-display text-[24px] text-offwhite">Panneau réservé à l'équipe</h1>
          <p className="mt-2 font-body text-[14px] text-slate2">{state.error}. Si vous faites partie de l'équipe, demandez à ce que votre adresse soit ajoutée à ADMIN_EMAILS.</p>
          <Link to="/dashboard" className="inline-block mt-6 px-4 py-2 border border-line font-body text-[14px] text-offwhite hover:border-slate2">
            Retour au jeu
          </Link>
        </div>
      </main>
    );
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 font-body text-[14px] border-l-2 transition-colors ${
      isActive ? "border-amber text-offwhite bg-navy-800/60" : "border-transparent text-slate2 hover:text-offwhite"
    }`;
  const tabCls = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 px-3 py-2.5 font-body text-[13.5px] border-b-2 ${isActive ? "border-amber text-offwhite" : "border-transparent text-slate2"}`;

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-navy-950 text-offwhite md:flex">
        {/* ordinateur : la colonne des rubriques */}
        <aside className="hidden md:flex md:flex-col w-[220px] shrink-0 border-r border-line sticky top-0 h-screen">
          <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
            <LogoMark size={30} />
            <div>
              <div className="font-display text-[17px] leading-none">Réseau</div>
              <div className="mt-1 font-body text-[12px] text-slate2">Panneau admin</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto" aria-label="Rubriques du panneau">
            {SECTIONS.map((s) => (
              <NavLink key={s.to} to={s.to ? `/admin/${s.to}` : "/admin"} end={s.end} className={linkCls}>
                {s.label}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-4 border-t border-line font-body text-[12.5px] text-slate2">
            <div>Connecté : {me?.name}</div>
            <Link to="/dashboard" className="inline-block mt-2 text-offwhite hover:text-amber">
              Retour au jeu
            </Link>
          </div>
        </aside>

        {/* téléphone : en-tête et rubriques qui défilent */}
        <header className="md:hidden sticky top-0 z-40 bg-navy-950/95 backdrop-blur border-b border-line">
          <div className="flex items-center gap-2.5 px-4 pt-3">
            <LogoMark size={26} />
            <span className="font-display text-[16px]">Panneau admin</span>
            <Link to="/dashboard" className="ml-auto font-body text-[13px] text-slate2">
              Retour au jeu
            </Link>
          </div>
          <nav className="flex overflow-x-auto px-2 [scrollbar-width:none]" aria-label="Rubriques du panneau">
            {SECTIONS.map((s) => (
              <NavLink key={s.to} to={s.to ? `/admin/${s.to}` : "/admin"} end={s.end} className={tabCls}>
                {s.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
          <div className="max-w-[1180px]">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="joueurs" element={<Players />} />
              <Route path="joueurs/:id" element={<Players />} />
              <Route path="annonces" element={<Announcements />} />
              <Route path="giveaways" element={<Giveaways />} />
              <Route path="saisons" element={<Seasons />} />
              <Route path="economie" element={<Economy />} />
              <Route path="alliances" element={<Alliances />} />
              <Route path="boutique" element={<Shop />} />
              <Route path="journal" element={<Logs />} />
              <Route path="*" element={<Overview />} />
            </Routes>
          </div>
        </main>
      </div>
    </ConfirmProvider>
  );
}
