import { useState } from "react";
import { api } from "../../api/client";
import { Btn, Field, Panel, Pill, dateTime, inputCls, useAction, useAdminData, useConfirm } from "./ui";

/* 2.7 : l'éruption solaire. La lancer (au début de la saison), suivre les
   sous-stations, régler le rythme et les prix en cours de route. */

type Cfg = { startsAt: string; order: string[]; stepMinutes: number; reducedMinutes: number; autoRepairDays: number; containersOpen: number; containerChance: number };
type Region = { id: string; name: string; status: string; cost: number; points: number; contributorsCount: number; alertAt: string; cutAt: string };
type Data = { config: Cfg | null; summary: { regions: Region[] } | null; nextSeasonAt: string | null };

const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const LABEL: Record<string, string> = { normal: "Courant", alerte: "Pas encore touchée", reduite: "Courant faible", coupee: "Coupée", reparee: "Réparée" };
const TONE: Record<string, "slate" | "amber" | "red" | "green"> = { normal: "slate", alerte: "slate", reduite: "amber", coupee: "red", reparee: "green" };

export function EruptionPanel() {
  const { data, reload } = useAdminData<Data>("/eruption");
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [at, setAt] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  if (!data) return null;
  const cfg = data.config;
  const startValue = at ?? local(data.nextSeasonAt ? new Date(data.nextSeasonAt) : new Date(Date.now() + 3_600_000));

  async function launch() {
    const r = await confirm({
      title: cfg ? "Relancer l'éruption ?" : "Lancer l'éruption solaire ?",
      body: `Début : ${new Date(startValue).toLocaleString("fr-FR")}.\nUne région tombe toutes les 2 h (courant faible 2 h, puis coupure). ${cfg ? "Les sous-stations et les dons actuels sont remis à zéro." : ""}`,
      confirm: cfg ? "Relancer" : "Lancer",
      danger: !!cfg,
    });
    if (r.ok) await run(() => api.post("/admin/eruption", { startsAt: new Date(startValue).toISOString() }), "Éruption programmée", reload);
  }

  return (
    <Panel title="Éruption solaire" aside={cfg ? <Pill tone="amber">{Date.parse(cfg.startsAt) > Date.now() ? "Programmée" : "En cours"}</Pill> : <Pill>Pas lancée</Pill>} className="mb-6">
      {!cfg ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Début (par défaut, le début de la prochaine saison)">
            <input type="datetime-local" value={startValue} onChange={(e) => setAt(e.target.value)} className={inputCls} />
          </Field>
          <Btn tone="primary" disabled={busy} onClick={launch}>
            Programmer l'éruption
          </Btn>
        </div>
      ) : (
        <div className="font-body text-[13.5px]">
          <p className="text-slate2 mb-3">
            Début {dateTime(cfg.startsAt)} · une région toutes les {cfg.stepMinutes} min · courant faible {cfg.reducedMinutes} min · réparation automatique après {cfg.autoRepairDays} jours · {cfg.containersOpen} conteneurs au marché.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-slate2 text-left">
                <tr>
                  <th className="py-1 pr-3 font-normal">Région</th>
                  <th className="py-1 pr-3 font-normal">État</th>
                  <th className="py-1 pr-3 font-normal">Coupure</th>
                  <th className="py-1 pr-3 font-normal text-right">Points</th>
                  <th className="py-1 pr-3 font-normal text-right">Prix</th>
                  <th className="py-1 font-normal text-right">Donateurs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.summary?.regions.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-3">{r.name}</td>
                    <td className="py-1.5 pr-3"><Pill tone={TONE[r.status]}>{LABEL[r.status] ?? r.status}</Pill></td>
                    <td className="py-1.5 pr-3 text-slate2">{dateTime(r.cutAt)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono2">{r.points}</td>
                    <td className="py-1.5 pr-3 text-right">
                      <input
                        value={edit[r.id] ?? String(r.cost)}
                        onChange={(e) => setEdit((x) => ({ ...x, [r.id]: e.target.value }))}
                        disabled={r.status === "reparee"}
                        className="w-20 bg-navy-950 border border-line px-2 py-1 text-right font-mono2"
                      />
                    </td>
                    <td className="py-1.5 text-right font-mono2">{r.contributorsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn disabled={busy || !Object.keys(edit).length} onClick={() => run(() => api.patch("/admin/eruption", { costs: edit }), "Prix enregistrés", () => { setEdit({}); return reload(); })}>
              Enregistrer les prix
            </Btn>
            <Btn
              tone="danger"
              disabled={busy}
              onClick={async () => {
                const r = await confirm({ title: "Arrêter l'éruption ?", body: "Le courant revient partout tout de suite. Les dons restent enregistrés (et l'icône de ceux qui l'ont gagnée).", confirm: "Arrêter", danger: true });
                if (r.ok) await run(() => api.delete("/admin/eruption"), "Éruption arrêtée", reload);
              }}
            >
              Arrêter l'éruption
            </Btn>
          </div>
        </div>
      )}
    </Panel>
  );
}
