import { useState } from "react";
import { api } from "../../api/client";
import { Btn, Empty, Field, Loading, PageHead, Panel, Pill, dateTime, inputCls, nf, useAction, useAdminData, useConfirm } from "./ui";

type Data = {
  bot: boolean;
  prizes: { name: string; value: string }[];
  maxCoins: number;
  maxTrialDays: number;
  maxWinners: number;
  giveaways: { id: string; prize: string; winners: number; endsAt: string; endedAt: string | null; participants: number; winnerIds: string[] }[];
};

const DURATIONS = ["24h", "48h", "3j", "7j"];

export default function Giveaways() {
  const { data, error, reload } = useAdminData<Data>("/giveaways");
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [lot, setLot] = useState("pieces");
  const [amount, setAmount] = useState("5000");
  const [days, setDays] = useState("7");
  const [winners, setWinners] = useState("1");
  const [duration, setDuration] = useState("48h");

  if (!data) return <Loading error={error} onRetry={reload} />;

  return (
    <>
      <PageHead
        title="Giveaways"
        intro="Le bot poste l'annonce dans #annonces avec un bouton Participer. Seuls les comptes Réseau liés à Discord peuvent jouer, et le lot est livré directement dans le jeu."
      />
      {!data.bot && (
        <p className="mb-4 border border-amber/50 bg-amber/10 px-4 py-3 font-body text-[13.5px]">
          Le bot Discord n'est pas relié : renseigne DISCORD_BOT_TOKEN et DISCORD_GUILD_ID sur le serveur pour lancer des giveaways.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="Lancer un giveaway">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await run(
                () => api.post("/admin/giveaways", { lot, amount: Number(amount), days: Number(days), winners: Number(winners), duration }),
                "Giveaway lancé sur Discord",
                reload
              );
            }}
          >
            <Field label="Lot">
              <select value={lot} onChange={(e) => setLot(e.target.value)} className={inputCls}>
                {data.prizes.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.name.replace(/ \(préciser.*\)$/, "")}
                  </option>
                ))}
              </select>
            </Field>
            {lot === "pieces" && (
              <Field label="Pièces par gagnant" hint={`${nf(data.maxCoins)} au plus`}>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={inputCls} />
              </Field>
            )}
            {lot === "essai" && (
              <Field label="Jours de Premium" hint={`De 1 à ${data.maxTrialDays}`}>
                <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className={inputCls} />
              </Field>
            )}
            <Field label="Nombre de gagnants">
              <input value={winners} onChange={(e) => setWinners(e.target.value)} inputMode="numeric" className={inputCls} />
            </Field>
            <Field label="Durée" hint="Par exemple 48h, 2j, 1j12h ou 1 semaine">
              <input value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls} />
            </Field>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-2.5 py-1 border font-body text-[12.5px] ${duration === d ? "border-amber text-amber" : "border-line text-slate2 hover:text-offwhite"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <Btn type="submit" tone="primary" disabled={busy || !data.bot}>
              Lancer le giveaway
            </Btn>
          </form>
        </Panel>

        <Panel title="Derniers giveaways">
          {data.giveaways.length === 0 ? (
            <Empty>Aucun giveaway lancé pour l'instant.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.giveaways.map((g) => {
                const open = !g.endedAt;
                return (
                  <li key={g.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 font-body text-[14px]">
                        {g.prize}
                        {g.winners > 1 && <span className="text-slate2">× {g.winners}</span>}
                        {open ? <Pill tone="green">En cours</Pill> : <Pill>Terminé</Pill>}
                      </div>
                      <div className="font-body text-[12.5px] text-slate2">
                        {nf(g.participants)} participant{g.participants > 1 ? "s" : ""} ·{" "}
                        {open ? `tirage le ${dateTime(g.endsAt)}` : `${g.winnerIds.length} gagnant${g.winnerIds.length > 1 ? "s" : ""}, tiré le ${dateTime(g.endedAt)}`}
                      </div>
                    </div>
                    {open ? (
                      <Btn
                        disabled={busy}
                        onClick={async () => {
                          const r = await confirm({ title: "Tirer au sort maintenant ?", body: `${nf(g.participants)} participants. Les gagnants reçoivent leur lot tout de suite.`, confirm: "Tirer au sort" });
                          if (r.ok) await run(() => api.post(`/admin/giveaways/${g.id}/finish`), "Tirage effectué", reload);
                        }}
                      >
                        Tirer maintenant
                      </Btn>
                    ) : (
                      <Btn
                        disabled={busy}
                        title="Un gagnant de plus, parmi ceux qui n'ont pas gagné"
                        onClick={async () => {
                          const r = await confirm({ title: "Tirer un gagnant de plus ?", body: "Utile si un gagnant ne s'est pas manifesté. Le nouveau reçoit aussi le lot.", confirm: "Retirer au sort" });
                          if (r.ok) await run(() => api.post(`/admin/giveaways/${g.id}/reroll`), "Nouveau tirage effectué", reload);
                        }}
                      >
                        Nouveau gagnant
                      </Btn>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
