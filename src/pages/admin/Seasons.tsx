import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Btn, Field, Loading, PageHead, Panel, dateOnly, dateTime, inputCls, nf, useAction, useAdminData, useConfirm } from "./ui";

type SeasonsData = {
  current: {
    id: string; number: number; name: string; startsAt: string; endsAt: string; entries: number; ranked: number;
    divisions: { label: string; companies: number; groups: number; points: number }[];
    top: { companyId: string; name: string; division: string; group: number; points: number }[];
  } | null;
  history: { id: string; number: number; name: string; startsAt: string; endsAt: string; endedAt: string | null }[];
  world: { id: string; name: string; target: number; progress: number; startedAt: string; completedAt: string | null; contributors: { name: string; amount: number }[] } | null;
};

/* datetime-local attend l'heure locale, sans fuseau */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function Seasons() {
  const { data, error, reload } = useAdminData<SeasonsData>("/seasons");
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [target, setTarget] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (data?.current) {
      setName(data.current.name);
      setEndsAt(toLocalInput(data.current.endsAt));
    }
    if (data?.world) {
      setTarget(String(data.world.target));
      setProgress(String(data.world.progress));
    }
  }, [data]);

  if (!data) return <Loading error={error} onRetry={reload} />;
  const s = data.current;
  const w = data.world;

  return (
    <>
      <PageHead title="Saisons et Grand Chantier" intro="La saison en cours, son classement, et l'avancement du tunnel du Mont-Blanc." />

      {s ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px] mb-6">
          <Panel title={`Saison ${s.number} · ${s.name}`} aside={`du ${dateOnly(s.startsAt)} au ${dateOnly(s.endsAt)}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line mb-4">
              {s.divisions.map((d) => (
                <div key={d.label} className="bg-navy-900 px-3 py-2.5">
                  <div className="font-body text-[13px]">{d.label}</div>
                  <div className="font-mono2 text-[18px]">{nf(d.companies)}</div>
                  <div className="font-body text-[12px] text-slate2">
                    {d.groups} groupe{d.groups > 1 ? "s" : ""}, {nf(d.points)} pts
                  </div>
                </div>
              ))}
            </div>
            <h3 className="font-display text-[15px] mb-1.5">Meilleurs scores, toutes divisions</h3>
            <ol className="divide-y divide-line">
              {s.top.filter((t) => t.points > 0).length === 0 && <li className="py-3 font-body text-[13.5px] text-slate2">Personne n'a encore marqué de points.</li>}
              {s.top
                .filter((t) => t.points > 0)
                .map((t, i) => (
                  <li key={t.companyId}>
                    <Link to={`/admin/joueurs/${t.companyId}`} className="flex gap-3 py-1.5 font-body text-[13.5px] hover:bg-navy-800/50 -mx-2 px-2">
                      <span className="w-5 text-right font-mono2 text-[12px] text-slate2">{i + 1}</span>
                      <span className="flex-1 truncate">{t.name}</span>
                      <span className="text-slate2">
                        {t.division}, gr. {t.group}
                      </span>
                      <span className="w-20 text-right font-mono2">{nf(t.points)}</span>
                    </Link>
                  </li>
                ))}
            </ol>
          </Panel>

          <Panel title="Réglages de la saison">
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const end = new Date(endsAt);
                const changed: Record<string, string> = {};
                if (name.trim() !== s.name) changed.name = name.trim();
                if (end.getTime() !== new Date(s.endsAt).getTime()) changed.endsAt = end.toISOString();
                if (!Object.keys(changed).length) return;
                if (changed.endsAt && end.getTime() <= Date.now()) {
                  const r = await confirm({
                    title: "Clôturer la saison maintenant ?",
                    body: "Le classement final est figé, les récompenses distribuées et la saison suivante démarre au prochain tour de simulation (30 secondes).",
                    confirm: "Clôturer",
                    danger: true,
                  });
                  if (!r.ok) return;
                }
                await run(() => api.patch(`/admin/seasons/${s.id}`, changed), "Saison modifiée", reload);
              }}
            >
              <Field label="Nom">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={60} />
              </Field>
              <Field label="Fin" hint="Une date passée clôture la saison au prochain tour.">
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Btn type="submit" tone="primary" disabled={busy}>
                  Enregistrer
                </Btn>
                <Btn onClick={() => setEndsAt(toLocalInput(new Date(Date.now() - 60_000).toISOString()))}>Fin maintenant</Btn>
              </div>
            </form>
            <p className="mt-4 font-body text-[12.5px] text-slate2">
              {nf(s.entries)} compagnies inscrites, dont {nf(s.ranked)} avec des points.
            </p>
          </Panel>
        </div>
      ) : (
        <Panel className="mb-6">
          <p className="font-body text-[14px] text-slate2">Pas de saison en cours. La suivante démarre toute seule au prochain tour de simulation.</p>
        </Panel>
      )}

      {w && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px] mb-6">
          <Panel title={w.name} aside={w.completedAt ? `ouvert le ${dateOnly(w.completedAt)}` : `commencé le ${dateOnly(w.startedAt)}`}>
            <div className="h-3 bg-navy-800 overflow-hidden">
              <div className="h-full bg-amber" style={{ width: `${w.completedAt ? 100 : Math.min(100, (w.progress / w.target) * 100)}%` }} />
            </div>
            <p className="mt-2 mb-4 font-body text-[13.5px] text-slate2">
              {nf(w.progress)} trajets sur {nf(w.target)} ({((w.progress / Math.max(1, w.target)) * 100).toFixed(1).replace(".", ",")} %)
            </p>
            <h3 className="font-display text-[15px] mb-1.5">Plus gros contributeurs</h3>
            <ol className="divide-y divide-line">
              {w.contributors.map((c, i) => (
                <li key={i} className="flex gap-3 py-1.5 font-body text-[13.5px]">
                  <span className="w-5 text-right font-mono2 text-[12px] text-slate2">{i + 1}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="font-mono2">{nf(c.amount)}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Réglages du chantier">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => api.patch("/admin/world", { target: Number(target), progress: Number(progress) }), "Chantier modifié", reload);
              }}
            >
              <Field label="Objectif (trajets)" hint="À baisser s'il y a peu de joueurs.">
                <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" className={inputCls} />
              </Field>
              <Field label="Avancement (trajets)">
                <input value={progress} onChange={(e) => setProgress(e.target.value)} inputMode="numeric" className={inputCls} />
              </Field>
              <Btn type="submit" tone="primary" disabled={busy || !Number(target)}>
                Enregistrer
              </Btn>
            </form>
          </Panel>
        </div>
      )}

      <Panel title="Saisons passées">
        <ul className="divide-y divide-line">
          {data.history.map((h) => (
            <li key={h.id} className="flex gap-3 py-2 font-body text-[13.5px]">
              <span className="w-24 text-slate2">Saison {h.number}</span>
              <span className="flex-1 truncate">{h.name}</span>
              <span className="text-slate2">{h.endedAt ? `close le ${dateTime(h.endedAt)}` : "en cours"}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
