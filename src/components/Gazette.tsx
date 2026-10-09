import { api } from "../api/client";

/* ============================================================
   La Gazette du Rail (2.0) : le petit journal du réseau, refait toutes les
   dix minutes par le serveur à partir des dernières 24 heures. Imprimée sur
   le papier de la page d'accueil du jeu, pour qu'on la reconnaisse d'un coup
   d'œil au milieu de la console.
   ============================================================ */

export interface GazetteData {
  date: string;
  edition: number;
  headlines: { kind: string; title: string; body: string }[];
}

export async function loadGazette(): Promise<GazetteData | null> {
  try {
    const { data } = await api.get("/gazette");
    return data;
  } catch {
    return null;
  }
}

export function Gazette({ data }: { data: GazetteData }) {
  const [lead, ...rest] = data.headlines;
  return (
    <section className="gazette text-[#1c1a17]" aria-label="La Gazette du Rail">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-[#1c1a17] pb-1.5">
        <h2 className="gazette-title">La Gazette du Rail</h2>
        <span className="gazette-meta">
          N° {Math.max(1, data.edition)}, {data.date}
        </span>
      </header>
      <div className="grid gap-x-6 gap-y-3 pt-3 md:grid-cols-[1.3fr_1fr]">
        {lead && (
          <article className="md:border-r md:border-[#1c1a17]/25 md:pr-6">
            <h3 className="gazette-lead">{lead.title}</h3>
            <p className="gazette-body mt-1">{lead.body}</p>
          </article>
        )}
        <div className="flex flex-col divide-y divide-[#1c1a17]/20">
          {rest.map((h) => (
            <article key={h.title} className="py-1.5 first:pt-0">
              <h3 className="gazette-head">{h.title}</h3>
              <p className="gazette-body">{h.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
