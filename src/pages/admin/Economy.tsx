import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Btn, Field, Figure, Loading, PageHead, Panel, dateTime, inputCls, nf, useAction, useAdminData, useConfirm } from "./ui";

/* ============================================================
   2.4 : réglages de l'économie.

   Les taux du gazole, du courant, de la taxe carbone, des pièces, des voies
   et des centrales se règlent ici, sans redéployer. Chaque champ montre la
   valeur par défaut ; une valeur modifiée prend effet dans les 30 secondes.
   ============================================================ */

type Settings = Record<string, unknown> & {
  trialUntil: string | null;
  carbonBrackets: { from: number; rate: number }[];
  plants: Record<string, { cost: number; kwh: number }>;
};

type EconomyAdmin = {
  settings: Settings;
  defaults: Settings;
  trial: boolean;
  markets: { diesel: { value: number; shock: number; shockLabel: string | null } | null; power: { value: number; shock: number; shockLabel: string | null } | null };
  stats: { co2Week: number; energy24h: { cost: number | null; income: number | null; kwh: number | null; liters: number | null }; carbonLastWeek: { amount: number; companies: number } };
};

/* Les réglages simples, par groupe, avec leur explication. */
const GROUPS: { title: string; fields: { key: string; label: string; hint?: string }[] }[] = [
  {
    title: "Gazole",
    fields: [
      { key: "dieselPerMinute", label: "Litres par minute de trajet" },
      { key: "dieselBase", label: "Prix de référence (pi./L)" },
      { key: "dieselMin", label: "Prix plancher" },
      { key: "dieselMax", label: "Prix plafond (hors choc)" },
      { key: "dieselShockChancePerHour", label: "Chance de choc par heure", hint: "0,003 ≈ un choc toutes les deux semaines" },
      { key: "tankLiters", label: "Litres par cuve" },
      { key: "tankCost", label: "Prix d'une cuve" },
      { key: "maxTanks", label: "Cuves au plus" },
      { key: "fixedDays", label: "Durée d'un contrat à prix fixe (jours)" },
      { key: "fixedFee", label: "Frais d'un contrat (0,1 = 10 %)" },
    ],
  },
  {
    title: "Électricité",
    fields: [
      { key: "kwhPerMinute", label: "kWh par minute de trajet" },
      { key: "tgvPowerFactor", label: "Consommation du TGV (×)" },
      { key: "powerBase", label: "Prix de référence (pi./kWh)" },
      { key: "peakFactor", label: "Heure de pointe (×)" },
      { key: "nightFactor", label: "Heures creuses de nuit (×)" },
      { key: "summerNoonFactor", label: "Plein soleil d'été (×)" },
      { key: "coldFactor", label: "Vague de froid (×)" },
      { key: "gridBuyback", label: "Rachat du surplus par le réseau (0,8 = 80 %)" },
      { key: "outageChancePerHour", label: "Chance de panne de sous-station par heure" },
      { key: "outageMinutes", label: "Durée d'une panne (min)" },
    ],
  },
  {
    title: "Carbone",
    fields: [
      { key: "weeklyQuota", label: "Quota gratuit (t par semaine)" },
      { key: "co2PerLiter", label: "t de CO₂ par litre de gazole" },
      { key: "co2PerGridKwh", label: "t de CO₂ par kWh du réseau" },
      { key: "steamFactor", label: "Vapeur (×)" },
    ],
  },
  {
    title: "Pièces détachées",
    fields: [
      { key: "partStock", label: "Stock national visé, par pièce" },
      { key: "partRestockPerHour", label: "Reconstitution par heure (0,05 = 5 %)" },
      { key: "partMaxPriceFactor", label: "Prix au plus fort de la pénurie (×)" },
      { key: "partMaxDelayFactor", label: "Délai au plus fort de la pénurie (×)" },
      { key: "factoryCost", label: "Prix d'une usine" },
      { key: "factoryPerDay", label: "Pièces par jour et par usine" },
      { key: "maxFactories", label: "Usines au plus" },
    ],
  },
  {
    title: "Voies et concessions",
    fields: [
      { key: "trackWearPerTrip", label: "Usure par trajet (points)" },
      { key: "renovationPerKm", label: "Rénovation complète (pi. par km)" },
      { key: "cofunderBonus", label: "Bonus des co-financeurs (0,03 = 3 %)" },
      { key: "concessionPerKm", label: "Concession (pi. par km)" },
      { key: "maxToll", label: "Péage au plus (0,15 = 15 %)" },
      { key: "concessionMinCondition", label: "État minimum d'une concession (%)" },
      { key: "maxConcessions", label: "Concessions au plus" },
    ],
  },
];

const num = (v: string) => Number(v.replace(",", "."));
// affichage sans queue de décimales (0,00297619… → 0.00297619)
const shown = (v: unknown) => (typeof v === "number" ? String(Number(v.toPrecision(6))) : String(v ?? ""));

export default function Economy() {
  const { data, error, reload } = useAdminData<EconomyAdmin>("/economy");
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const [form, setForm] = useState<Record<string, string>>({});
  const [brackets, setBrackets] = useState<{ from: string; rate: string }[]>([]);
  const [plants, setPlants] = useState<Record<string, { cost: string; kwh: string }>>({});

  useEffect(() => {
    if (!data) return;
    const f: Record<string, string> = {};
    for (const g of GROUPS) for (const fl of g.fields) f[fl.key] = shown(data.settings[fl.key]);
    setForm(f);
    setBrackets(data.settings.carbonBrackets.map((b) => ({ from: String(b.from), rate: String(b.rate) })));
    setPlants(Object.fromEntries(Object.entries(data.settings.plants).map(([k, v]) => [k, { cost: String(v.cost), kwh: String(v.kwh) }])));
  }, [data]);

  if (!data) return <Loading error={error} onRetry={reload} />;
  const s = data.settings;

  const save = () => {
    const patch: Record<string, unknown> = {};
    for (const g of GROUPS) {
      for (const fl of g.fields) {
        const v = num(form[fl.key] ?? "");
        if (Number.isFinite(v) && String(v) !== shown(s[fl.key])) patch[fl.key] = v;
      }
    }
    const br = brackets.map((b) => ({ from: num(b.from), rate: num(b.rate) })).filter((b) => Number.isFinite(b.from) && Number.isFinite(b.rate));
    if (JSON.stringify(br) !== JSON.stringify(s.carbonBrackets)) patch.carbonBrackets = br.sort((a, b) => a.from - b.from);
    const pl = Object.fromEntries(Object.entries(plants).map(([k, v]) => [k, { cost: num(v.cost), kwh: num(v.kwh) }]));
    if (JSON.stringify(pl) !== JSON.stringify(s.plants)) patch.plants = pl;
    if (!Object.keys(patch).length) return;
    void run(() => api.patch("/admin/economy", { settings: patch }), `${Object.keys(patch).length} réglage(s) enregistré(s)`, reload);
  };

  return (
    <>
      <PageHead
        title="Économie"
        intro="Gazole, courant, taxe carbone, pièces, voies et centrales. Les changements prennent effet en moins d'une minute, sans redéployer."
        actions={
          <Btn tone="primary" onClick={save} disabled={busy}>
            Enregistrer
          </Btn>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Figure value={data.trial ? "en cours" : "terminée"} label="Période d'essai" detail={s.trialUntil ? `jusqu'au ${dateTime(s.trialUntil)}` : "démarre au prochain tour"} tone={data.trial ? "cobalt" : "green"} />
        <Figure value={`${nf(data.stats.co2Week)} t`} label="CO₂ du réseau depuis lundi" />
        <Figure value={`${nf((data.stats.energy24h.cost ?? 0) - (data.stats.energy24h.income ?? 0))} pi.`} label="Énergie payée, 24 h" detail={`${nf(data.stats.energy24h.liters)} L · ${nf(data.stats.energy24h.kwh)} kWh`} />
        <Figure value={`${nf(data.stats.carbonLastWeek.amount)} pi.`} label="Taxe carbone, dernière semaine" detail={`${data.stats.carbonLastWeek.companies} factures`} tone="amber" />
      </div>

      {data.trial && (
        <Panel title="Période d'essai" className="mb-6">
          <p className="font-body text-[14px] text-slate2 mb-3">Pendant l'essai, tout est calculé et affiché aux joueurs, mais rien n'est prélevé. Vous pouvez la terminer maintenant.</p>
          <Btn
            tone="danger"
            disabled={busy}
            onClick={async () => {
              const r = await confirm({ title: "Terminer la période d'essai ?", body: "Gazole, courant et taxe carbone seront prélevés dès la prochaine heure.", confirm: "Terminer l'essai", danger: true });
              if (r.ok) {
                void run(() => api.patch("/admin/economy", { endTrial: true }), "Période d'essai terminée", reload);
              }
            }}
          >
            Terminer l'essai maintenant
          </Btn>
        </Panel>
      )}

      <Panel title="Cours du moment" className="mb-6">
        <p className="font-body text-[14px]">
          Gazole : indice {data.markets.diesel ? data.markets.diesel.value.toFixed(3) : "—"}
          {data.markets.diesel?.shockLabel && ` · ${data.markets.diesel.shockLabel}`} — Courant : indice {data.markets.power ? data.markets.power.value.toFixed(3) : "—"}
          {data.markets.power?.shockLabel && ` · ${data.markets.power.shockLabel}`}
        </p>
      </Panel>

      <Panel title="Barème de la taxe carbone" className="mb-6" aside="tranches de valeur de la compagnie">
        <div className="space-y-2 mb-3">
          {brackets.map((b, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <Field label={i === 0 ? "À partir de (pi.)" : ""}>
                <input className={inputCls} inputMode="numeric" value={b.from} onChange={(e) => setBrackets((x) => x.map((y, j) => (j === i ? { ...y, from: e.target.value } : y)))} />
              </Field>
              <Field label={i === 0 ? "Prix de la tonne" : ""}>
                <input className={inputCls} inputMode="decimal" value={b.rate} onChange={(e) => setBrackets((x) => x.map((y, j) => (j === i ? { ...y, rate: e.target.value } : y)))} />
              </Field>
              <Btn tone="danger" onClick={() => setBrackets((x) => x.filter((_, j) => j !== i))} disabled={brackets.length <= 1}>
                Retirer
              </Btn>
            </div>
          ))}
        </div>
        <Btn onClick={() => setBrackets((x) => [...x, { from: "", rate: "" }])}>Ajouter une tranche</Btn>
      </Panel>

      <Panel title="Centrales" className="mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(plants).map(([k, v]) => (
            <div key={k} className="space-y-2">
              <div className="font-body text-[13.5px] font-medium">{k}</div>
              <Field label="Prix">
                <input className={inputCls} inputMode="numeric" value={v.cost} onChange={(e) => setPlants((p) => ({ ...p, [k]: { ...p[k], cost: e.target.value } }))} />
              </Field>
              <Field label={k === "BATTERIE" ? "Capacité (kWh)" : "Production max (kWh/h)"}>
                <input className={inputCls} inputMode="numeric" value={v.kwh} onChange={(e) => setPlants((p) => ({ ...p, [k]: { ...p[k], kwh: e.target.value } }))} />
              </Field>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <Panel key={g.title} title={g.title}>
            <div className="grid sm:grid-cols-2 gap-3">
              {g.fields.map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint ?? `par défaut : ${shown(data.defaults[f.key])}`}>
                  <input className={inputCls} inputMode="decimal" value={form[f.key] ?? ""} onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} />
                </Field>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
