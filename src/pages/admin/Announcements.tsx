import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Btn, Empty, Field, Loading, PageHead, Panel, Pill, dateTime, inputCls, nf, useAction, useAdminData } from "./ui";
import { IG_FORMATS, IG_LAYOUTS, IG_STYLES, IgFormat, IgLayout, IgStyle, drawIg, igCaption, loadIgFonts } from "./igCanvas";

type Data = {
  bot: boolean;
  push: boolean;
  channels: { key: string; label: string }[];
  pings: { key: string; label: string }[];
  announcements: { id: string; title: string; body: string; channel: string; ping: string | null; igCaption: string; discordKey: string | null; pushSent: number; createdBy: string; createdAt: string }[];
};

const SITE = "compagnie.skhost.fr";
const HANDLE = "reseau.lejeu";
const DRAFT_KEY = "reseau-admin-annonce";

/* Le brouillon reste sur l'appareil : rien ne se perd si l'onglet se ferme. */
function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<{ title: string; body: string; figure: string }>;
  } catch {
    return {};
  }
}

export default function Announcements() {
  const { data, error, reload } = useAdminData<Data>("/announcements");
  const { run, busy } = useAction();
  const { showToast } = useToast();
  const draft = useMemo(readDraft, []);

  const [title, setTitle] = useState(draft.title ?? "");
  const [body, setBody] = useState(draft.body ?? "");
  const [channel, setChannel] = useState("ANNONCES");
  const [ping, setPing] = useState("");
  const [toDiscord, setToDiscord] = useState(true);
  const [toPush, setToPush] = useState(false);
  const [attach, setAttach] = useState(true);

  const [format, setFormat] = useState<IgFormat>("post");
  const [style, setStyle] = useState<IgStyle>("nuit");
  const [layout, setLayout] = useState<IgLayout>("annonce");
  const [figure, setFigure] = useState(draft.figure ?? "");
  const [shot, setShot] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  const [caption, setCaption] = useState("");
  const [captionEdited, setCaptionEdited] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ready = Boolean(data);

  useEffect(() => {
    void loadIgFonts().then(() => setFontsReady(true));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body, figure }));
    } catch {
      /* stockage indisponible : tant pis pour le brouillon */
    }
  }, [title, body, figure]);
  // la légende suit le texte tant qu'on ne l'a pas retouchée à la main
  useEffect(() => {
    if (!captionEdited) setCaption(title || body ? igCaption(title, body, SITE) : "");
  }, [title, body, captionEdited]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const f = IG_FORMATS[format];
    c.width = f.w;
    c.height = f.h;
    const ctx = c.getContext("2d");
    if (ctx) drawIg(ctx, format, style, layout, { title: title || "Ton titre ici", body, figure, shot, site: SITE, handle: HANDLE });
    // `ready` : le canevas n'existe qu'une fois les données de la page chargées
  }, [format, style, layout, title, body, figure, shot, fontsReady, ready]);

  function pickShot(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Choisis une image (PNG ou JPEG)", "error");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setShot(img);
    img.onerror = () => showToast("Image illisible", "error");
    img.src = url;
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const slug = (title || "annonce").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
      a.download = `reseau-${slug || "annonce"}-${format}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      showToast("Légende copiée", "success");
    } catch {
      showToast("Copie impossible : sélectionne le texte à la main", "error");
    }
  }

  function imageData() {
    const c = canvasRef.current;
    if (!c) return undefined;
    const png = c.toDataURL("image/png");
    // une capture photo peut alourdir le PNG : on passe alors en JPEG
    return png.length > 6_000_000 ? c.toDataURL("image/jpeg", 0.9) : png;
  }

  async function publish() {
    const ok = await run(
      () =>
        api.post("/admin/announcements", {
          title,
          body,
          channel,
          ping: ping || undefined,
          discord: toDiscord,
          push: toPush,
          igCaption: caption,
          imageData: toDiscord && attach ? imageData() : undefined,
        }),
      toDiscord ? "Annonce publiée sur Discord" : toPush ? "Notification envoyée" : "Annonce enregistrée",
      reload
    );
    if (ok) {
      setTitle("");
      setBody("");
      setFigure("");
      setShot(null);
      setCaptionEdited(false);
    }
  }

  if (!data) return <Loading error={error} onRetry={reload} />;
  const canPublish = title.trim().length >= 2 && body.trim().length >= 2 && (toDiscord || toPush) && !busy && (!toDiscord || data.bot);

  return (
    <>
      <PageHead
        title="Annonces"
        intro="Écris une fois : l'annonce part sur Discord avec son visuel, et le même visuel et sa légende sont prêts pour Instagram."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] mb-8">
        {/* le texte et où il part */}
        <div className="space-y-4 min-w-0">
          <Panel title="Le message">
            <div className="space-y-3">
              <Field label="Titre">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="ex. 200 joueurs, merci !" className={inputCls} />
              </Field>
              <Field label="Texte" hint="Le gras (**texte**) et les listes de Discord marchent. Sur l'image, ils sont retirés.">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={3800} rows={8} className={`${inputCls} leading-relaxed`} />
              </Field>
              <div className="text-right font-body text-[12px] text-slate2">{nf(body.length)} / 3 800</div>
            </div>
          </Panel>

          <Panel title="Où l'envoyer">
            <div className="space-y-3 font-body text-[14px]">
              <Toggle checked={toDiscord} onChange={setToDiscord} disabled={!data.bot} label="Sur Discord" hint={data.bot ? undefined : "Bot non relié (DISCORD_BOT_TOKEN, DISCORD_GUILD_ID)"} />
              {toDiscord && (
                <div className="grid sm:grid-cols-2 gap-3 pl-7">
                  <Field label="Salon">
                    <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
                      {data.channels.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Mentionner">
                    <select value={ping} onChange={(e) => setPing(e.target.value)} className={inputCls}>
                      <option value="">Personne</option>
                      {data.pings.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Toggle checked={attach} onChange={setAttach} label="Joindre le visuel" hint="Le visuel de droite apparaît en grand sous le message." />
                  </div>
                </div>
              )}
              <Toggle
                checked={toPush}
                onChange={setToPush}
                disabled={!data.push}
                label="Notification aux joueurs"
                hint={data.push ? "Sur chaque appareil où les notifications sont activées. À garder pour les grandes nouvelles." : "Notifications non configurées sur le serveur"}
              />
            </div>
          </Panel>

          {toDiscord && (title || body) && (
            <Panel title="Aperçu Discord">
              <DiscordPreview title={title} body={body} canvas={attach ? canvasRef.current : null} redrawKey={`${format}${style}${layout}${title}${body}${figure}${shot?.src}`} />
            </Panel>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Btn tone="primary" onClick={publish} disabled={!canPublish}>
              {toDiscord ? "Publier sur Discord" : toPush ? "Envoyer la notification" : "Publier"}
            </Btn>
            <span className="font-body text-[12.5px] text-slate2">Instagram se publie à la main : télécharge le visuel et copie la légende.</span>
          </div>
        </div>

        {/* le visuel et la légende Instagram */}
        <div className="space-y-4 min-w-0">
          <Panel title="Le visuel" aside={`${IG_FORMATS[format].w} × ${IG_FORMATS[format].h}`}>
            <div className="space-y-3 mb-4">
              <Choice label="Format" value={format} onChange={setFormat} options={IG_FORMATS} />
              <Choice label="Gabarit" value={layout} onChange={setLayout} options={IG_LAYOUTS} />
              <Choice label="Couleurs" value={style} onChange={setStyle} options={Object.fromEntries(Object.entries(IG_STYLES).map(([k, v]) => [k, { label: v.label }])) as Record<IgStyle, { label: string }>} />
              <div className="flex flex-wrap items-end gap-3">
                {layout === "cap" && (
                  <div className="w-32">
                    <Field label="Le chiffre">
                      <input value={figure} onChange={(e) => setFigure(e.target.value)} maxLength={8} placeholder="200" className={inputCls} />
                    </Field>
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-line font-body text-[13.5px] cursor-pointer hover:border-slate2 focus-within:outline focus-within:outline-2 focus-within:outline-cobalt">
                  {shot ? "Changer la capture" : "Ajouter une capture du jeu"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickShot(e.target.files?.[0])} />
                </label>
                {shot && (
                  <button onClick={() => setShot(null)} className="font-body text-[13px] text-slate2 hover:text-rail-red">
                    Retirer la capture
                  </button>
                )}
              </div>
            </div>
            <div className="bg-navy-950 border border-line p-3 flex justify-center">
              <canvas
                ref={canvasRef}
                className="block h-auto max-w-full"
                style={{ maxHeight: 560, width: "auto" }}
                role="img"
                aria-label={`Aperçu du visuel : ${title || "sans titre"}`}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn tone="primary" onClick={download}>
                Télécharger le PNG
              </Btn>
            </div>
          </Panel>

          <Panel title="La légende Instagram" aside={`${nf(caption.length)} / 2 200`}>
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setCaptionEdited(true);
              }}
              rows={9}
              maxLength={2200}
              className={`${inputCls} leading-relaxed`}
              placeholder="Elle s'écrit toute seule à partir du titre et du texte."
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Btn onClick={copyCaption} disabled={!caption}>
                Copier la légende
              </Btn>
              {captionEdited && (
                <button onClick={() => setCaptionEdited(false)} className="font-body text-[13px] text-slate2 hover:text-offwhite">
                  Revenir à la légende automatique
                </button>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <h2 className="font-display text-[20px] mb-3">Annonces passées</h2>
      {data.announcements.length === 0 ? (
        <Empty>Aucune annonce publiée depuis le panneau.</Empty>
      ) : (
        <ul className="border border-line bg-navy-900 divide-y divide-line">
          {data.announcements.map((a) => (
            <li key={a.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-body text-[14.5px]">{a.title}</span>
                {a.discordKey && <Pill tone="cobalt">{data.channels.find((c) => c.key === a.channel)?.label ?? a.channel}</Pill>}
                {a.pushSent > 0 && <Pill tone="green">notifiée à {nf(a.pushSent)}</Pill>}
                <span className="ml-auto font-body text-[12.5px] text-slate2">
                  {a.createdBy}, {dateTime(a.createdAt)}
                </span>
              </div>
              <p className="mt-1 font-body text-[13px] text-slate2 line-clamp-2 whitespace-pre-line">{a.body}</p>
              <div className="mt-2 flex gap-3 font-body text-[12.5px]">
                <button
                  className="text-slate2 hover:text-offwhite"
                  onClick={() => {
                    setTitle(a.title);
                    setBody(a.body);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Reprendre ce texte
                </button>
                {a.igCaption && (
                  <button
                    className="text-slate2 hover:text-offwhite"
                    onClick={() => navigator.clipboard.writeText(a.igCaption).then(() => showToast("Légende copiée", "success"), () => undefined)}
                  >
                    Copier sa légende Instagram
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 accent-amber h-4 w-4" />
      <span>
        <span className="block font-body text-[14px]">{label}</span>
        {hint && <span className="block font-body text-[12.5px] text-slate2">{hint}</span>}
      </span>
    </label>
  );
}

function Choice<K extends string>({ label, value, onChange, options }: { label: string; value: K; onChange: (k: K) => void; options: Record<K, { label: string; hint?: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="w-20 font-body text-[13px] text-slate2">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {(Object.keys(options) as K[]).map((k) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            aria-pressed={value === k}
            title={options[k].hint}
            className={`px-3 py-1.5 border font-body text-[13px] ${value === k ? "border-amber text-amber" : "border-line text-slate2 hover:text-offwhite"}`}
          >
            {options[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Un rendu proche de l'embed Discord : barre de couleur, titre, texte, image. */
function DiscordPreview({ title, body, canvas, redrawKey }: { title: string; body: string; canvas: HTMLCanvasElement | null; redrawKey: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!canvas) return setSrc(null);
    // après le dessin du visuel
    const t = window.setTimeout(() => setSrc(canvas.toDataURL("image/jpeg", 0.6)), 120);
    return () => window.clearTimeout(t);
  }, [canvas, redrawKey]);
  return (
    <div className="rounded-md bg-[#313338] p-3 text-[#dbdee1]">
      <div className="flex gap-2.5">
        <div className="h-9 w-9 shrink-0 rounded-full bg-[#f59e0b] flex items-center justify-center font-display text-[15px] font-bold text-[#0b0f19]">R</div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-white" style={{ fontFamily: "'Work Sans', sans-serif" }}>
            Réseau <span className="ml-1 rounded bg-[#5865f2] px-1 py-px text-[10px] font-semibold text-white align-middle">APP</span>
          </div>
          <div className="mt-1 max-w-[440px] rounded border-l-4 border-[#f2a900] bg-[#2b2d31] px-3 py-2.5" style={{ fontFamily: "'Work Sans', sans-serif" }}>
            <div className="text-[15px] font-semibold text-[#00a8fc] break-words">{title || "Titre"}</div>
            <div className="mt-1 text-[13.5px] leading-[1.4] whitespace-pre-line break-words">{discordMarkdown(body)}</div>
            {src && <img src={src} alt="" className="mt-3 rounded max-w-full" />}
            <div className="mt-2 text-[11.5px] text-[#949ba4]">L'équipe de Réseau</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Juste le gras et l'italique, pour l'aperçu. */
function discordMarkdown(s: string): ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-white">
        {p.slice(2, -2)}
      </strong>
    ) : p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
      <em key={i}>{p.slice(1, -1)}</em>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
