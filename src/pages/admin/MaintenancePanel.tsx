import { useState } from "react";
import { api } from "../../api/client";
import { Btn, Field, Panel, Pill, dateTime, inputCls, useAction, useAdminData, useConfirm } from "./ui";

/* Maintenance : l'annoncer (bandeau chez les joueurs), puis fermer le jeu
   le temps de la mise à jour. Les admins continuent de passer. */

type State = { maintenance: { message: string; startsAt: string; endsAt: string | null; active: boolean } | null };

// valeur d'un <input type="datetime-local"> dans l'heure du navigateur
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function MaintenancePanel() {
  const { data, reload } = useAdminData<State>("/maintenance");
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [message, setMessage] = useState("");
  const [at, setAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setMinutes(0, 0, 0);
    return local(d);
  });
  const [minutes, setMinutes] = useState("15");
  const m = data?.maintenance ?? null;

  async function start(now: boolean) {
    if (now) {
      const r = await confirm({
        title: "Fermer le jeu maintenant ?",
        body: "Les joueurs voient l'écran de maintenance tout de suite. Les trains continuent de rouler. Vous, vous gardez l'accès.",
        confirm: "Lancer la maintenance",
        danger: true,
      });
      if (!r.ok) return;
    }
    await run(
      () => api.post("/admin/maintenance", { message, minutes: Number(minutes) || 0, ...(now ? {} : { startsAt: new Date(at).toISOString() }) }),
      now ? "Maintenance lancée" : "Maintenance annoncée",
      reload
    );
  }

  return (
    <Panel
      title="Maintenance"
      aside={m ? m.active ? <Pill tone="red">Jeu fermé</Pill> : <Pill tone="amber">Annoncée</Pill> : <Pill>Jeu ouvert</Pill>}
      className="mb-6"
    >
      {m ? (
        <div className="font-body text-[13.5px]">
          <p className="text-offwhite">
            {m.active ? `Jeu fermé depuis ${dateTime(m.startsAt)}` : `Annoncée pour ${dateTime(m.startsAt)}`}
            {m.endsAt ? `, retour prévu ${dateTime(m.endsAt)}` : ""}.
          </p>
          {m.message && <p className="text-slate2 mt-1">« {m.message} »</p>}
          <p className="text-slate2 mt-1">
            {m.active
              ? "Pensez à la terminer une fois la mise à jour en ligne : le jeu ne rouvre pas tout seul."
              : "Les joueurs voient un bandeau. À l'heure dite, le jeu se ferme tout seul."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn tone={m.active ? "primary" : undefined} disabled={busy} onClick={() => run(() => api.delete("/admin/maintenance"), m.active ? "Jeu rouvert" : "Annonce retirée", reload)}>
              {m.active ? "Terminer et rouvrir le jeu" : "Retirer l'annonce"}
            </Btn>
            {!m.active && (
              <Btn tone="danger" disabled={busy} onClick={() => start(true)}>
                Fermer maintenant
              </Btn>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_200px_120px]">
          <Field label="Message (facultatif)">
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="ex. mise à jour 2.7" className={inputCls} maxLength={300} />
          </Field>
          <Field label="Début">
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Durée (min)">
            <input type="number" min={0} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-3 flex flex-wrap gap-2">
            <Btn disabled={busy || !at} onClick={() => start(false)}>
              Annoncer
            </Btn>
            <Btn tone="danger" disabled={busy} onClick={() => start(true)}>
              Fermer le jeu maintenant
            </Btn>
          </div>
        </div>
      )}
    </Panel>
  );
}
