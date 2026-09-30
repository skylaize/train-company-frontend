import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogoMark } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { RailSchematic } from "../components/RailSchematic";
import { Turnstile, TurnstileHandle } from "../components/Turnstile";
import { api } from "../api/client";
import { SplitFlap } from "../components/SplitFlap";

/* ============================================================
   Connexion et inscription (1.6).

   Une seule carte au centre, deux onglets, et tout ce qu'on attend d'un
   écran de connexion : afficher le mot de passe, rester connecté, mot de
   passe oublié, la vérification Cloudflare, Discord et Google. Chacune de
   ces options n'apparaît que si le serveur la propose (GET /auth/providers) :
   tant qu'une clé n'est pas renseignée, rien de cassé ne s'affiche.
   ============================================================ */

interface Providers {
  discord: boolean;
  google: boolean;
  turnstileSiteKey: string | null;
  passwordReset: boolean;
}

interface NetworkStats {
  activeCompanies: number;
  trainsInService: number;
  punctuality: number;
  activeIncidents: number;
}

/* Le réseau national en direct (1.6) : les quatre indicateurs de l'ancien
   tableau de départs, en tuiles. Chacune a son état, lisible d'un coup d'œil. */
type Tone = "ok" | "warn" | "alert";
function buildBoard(stats: NetworkStats | null) {
  const punct = stats?.punctuality ?? null;
  const inc = stats?.activeIncidents ?? null;
  return [
    { code: "TC-014", label: "Compagnies actives", val: stats ? String(stats.activeCompanies) : "—", unit: "", tone: "ok" as Tone, state: "En service", bar: null as number | null },
    { code: "TC-022", label: "Trains en circulation", val: stats ? String(stats.trainsInService) : "—", unit: "", tone: "ok" as Tone, state: "En service", bar: null },
    { code: "TC-031", label: "Ponctualité", val: punct !== null ? String(punct) : "—", unit: "%", tone: (punct !== null && punct < 80 ? "alert" : punct !== null && punct < 90 ? "warn" : "ok") as Tone, state: punct !== null && punct < 80 ? "Dégradée" : punct !== null && punct < 90 ? "Correcte" : "Bonne", bar: punct },
    { code: "TC-047", label: "Incidents en cours", val: inc !== null ? String(inc) : "—", unit: "", tone: (inc ? "alert" : "ok") as Tone, state: inc ? "Alerte" : "Aucun", bar: null },
  ];
}

const TONE: Record<Tone, { text: string; chip: string; dot: string; bar: string }> = {
  ok: { text: "text-offwhite", chip: "text-rail-green bg-rail-green/10 border-rail-green/30", dot: "bg-rail-green", bar: "bg-rail-green" },
  warn: { text: "text-amber", chip: "text-amber bg-amber/10 border-amber/30", dot: "bg-amber", bar: "bg-amber" },
  alert: { text: "text-rail-red", chip: "text-rail-red bg-rail-red/10 border-rail-red/30", dot: "bg-rail-red", bar: "bg-rail-red" },
};

type Mode = "login" | "register" | "forgot" | "reset";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.3 5.3A17 17 0 0 0 15.1 4l-.5 1a15.7 15.7 0 0 0-5.2 0l-.5-1a17 17 0 0 0-4.2 1.3C2 9.3 1.3 13.2 1.6 17a17 17 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.2 12.2 0 0 0 10.8 0l.4.3-1.7.8 1.1 1.8a17 17 0 0 0 5.2-2.6c.4-4.4-.7-8.3-3.1-11.7ZM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-2 3.2-4.9 3.2-8.2Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2.1a11 11 0 0 0 0 9.8L5.8 14Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1L5.8 10c.9-2.7 3.3-4.6 6.2-4.6Z" />
    </svg>
  );
}

export default function AuthPage() {
  const [params] = useSearchParams();
  const resetToken = params.get("reset");
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const [now, setNow] = useState(new Date());
  const { login, register, adopt } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/auth/providers").then(({ data }) => setProviders(data)).catch(() => setProviders({ discord: false, google: false, turnstileSiteKey: null, passwordReset: false }));
    const loadStats = () => api.get("/network/stats").then(({ data }) => setStats(data)).catch(() => undefined);
    loadStats();
    const s = setInterval(loadStats, 15_000);
    const c = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(s);
      clearInterval(c);
    };
  }, []);

  /* Retour de Discord ou Google : le jeton arrive dans l'ancre de l'adresse
     (#token=…), jamais dans la requête, pour ne pas finir dans les journaux. */
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const token = h.get("token");
    const err = h.get("erreur");
    if (token || err) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (token) {
      adopt(token, h.get("remember") === "1");
      showToast(h.get("nouveau") ? "Compte créé, bienvenue à bord" : "Connexion réussie");
      navigate("/dashboard", { replace: true });
    } else if (err) {
      setError(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
    setPassword("");
    setPassword2("");
  }

  const needCaptcha = !!providers?.turnstileSiteKey && mode !== "reset";
  const captchaMissing = needCaptcha && !captcha;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if ((mode === "register" || mode === "reset") && password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    if (mode === "reset" && password !== password2) {
      setError("Les deux mots de passe ne sont pas identiques");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password, { remember, turnstile: captcha });
        showToast("Connexion réussie");
        navigate("/dashboard");
      } else if (mode === "register") {
        await register(email, pseudo, password, { remember, turnstile: captcha });
        showToast("Compte créé, bienvenue à bord");
        navigate("/dashboard");
      } else if (mode === "forgot") {
        await api.post("/auth/forgot", { email, turnstile: captcha ?? undefined });
        setInfo("Si un compte existe avec cette adresse, un e-mail vient de partir. Le lien reste valable une heure.");
      } else {
        const { data } = await api.post("/auth/reset", { token: resetToken, password });
        adopt(data.token, true);
        showToast("Mot de passe changé");
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      const message = err?.response?.data?.error || "Une erreur est survenue";
      setError(message);
      // un jeton Turnstile ne sert qu'une fois : on en redemande un
      turnstile.current?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  function oauth(p: "discord" | "google") {
    const base = String(api.defaults.baseURL ?? "").replace(/\/$/, "");
    window.location.href = `${base}/auth/oauth/${p}?remember=${remember ? 1 : 0}`;
  }

  const label = "block text-[13px] text-slate2 font-body mb-1.5";
  const input =
    "w-full h-11 bg-navy-950 border border-line rounded-md px-3.5 text-[14.5px] font-body text-offwhite placeholder:text-slate2/50 focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/40 transition-colors";
  const title =
    mode === "forgot" ? "Mot de passe oublié" : mode === "reset" ? "Nouveau mot de passe" : null;
  const social = providers && (providers.discord || providers.google) && (mode === "login" || mode === "register");

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 bg-navy-950 overflow-hidden">
      <RailSchematic className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(60% 50% at 50% 35%, rgb(var(--c-amber) / 0.06), transparent 70%)" }} />

      <div className="relative w-full max-w-[420px] tutorial-step-enter">
        <Link to="/" className="flex items-center justify-center gap-3 mb-7" aria-label="Retour à l'accueil de Réseau">
          <LogoMark size={40} />
          <div>
            <div className="font-display text-2xl leading-none">Réseau</div>
            <div className="font-mono2 text-[9.5px] uppercase tracking-[0.24em] text-slate2 mt-1">Compagnie ferroviaire</div>
          </div>
        </Link>

        <div className="bg-navy-900 border border-line rounded-lg px-6 sm:px-8 pt-2 pb-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          {title ? (
            <div className="pt-6 pb-2">
              <h1 className="font-display text-2xl">{title}</h1>
              <p className="text-[13.5px] text-slate2 font-body mt-1">
                {mode === "forgot"
                  ? "Indiquez l'adresse de votre compte : nous vous envoyons un lien pour en choisir un nouveau."
                  : "Choisissez le mot de passe de votre compte Réseau."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 border-b border-line" role="tablist">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={`relative py-4 font-mono2 text-[12.5px] uppercase tracking-[0.14em] transition-colors ${
                    mode === m ? "text-amber" : "text-slate2 hover:text-offwhite"
                  }`}
                >
                  {m === "login" ? "Connexion" : "Inscription"}
                  <span className={`absolute left-0 right-0 -bottom-px h-[2px] transition-colors ${mode === m ? "bg-amber" : "bg-transparent"}`} />
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate={false}>
            {mode === "register" && (
              <div>
                <label htmlFor="auth-pseudo" className={label}>Pseudo</label>
                <input id="auth-pseudo" className={input} value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Comment les autres vous verront" maxLength={24} autoComplete="nickname" required />
              </div>
            )}

            {mode !== "reset" && (
              <div>
                <label htmlFor="auth-email" className={label}>Email</label>
                <input id="auth-email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="email" required />
              </div>
            )}

            {mode !== "forgot" && (
              <div>
                <label htmlFor="auth-password" className={label}>{mode === "reset" ? "Nouveau mot de passe" : "Mot de passe"}</label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPwd ? "text" : "password"}
                    className={`${input} pr-11`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "••••••••" : "8 caractères minimum"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate2 hover:text-offwhite"
                    aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    aria-pressed={showPwd}
                  >
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </div>
            )}

            {mode === "reset" && (
              <div>
                <label htmlFor="auth-password2" className={label}>Confirmer le mot de passe</label>
                <input id="auth-password2" type={showPwd ? "text" : "password"} className={input} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" required />
              </div>
            )}

            {(mode === "login" || mode === "register") && (
              <div className="flex items-center justify-between gap-3 -mt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-[13.5px] font-body text-slate2">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
                  <span className="w-[18px] h-[18px] rounded-[4px] border border-line bg-navy-950 flex items-center justify-center peer-checked:bg-amber peer-checked:border-amber peer-focus-visible:ring-2 peer-focus-visible:ring-amber/50 transition-colors">
                    {remember && (
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="rgb(var(--c-onaccent))" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  Rester connecté
                </label>
                {mode === "login" && providers?.passwordReset && (
                  <button type="button" onClick={() => switchMode("forgot")} className="text-[13.5px] font-body text-cobalt hover:underline underline-offset-4">
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            )}

            {needCaptcha && providers?.turnstileSiteKey && <Turnstile ref={turnstile} siteKey={providers.turnstileSiteKey} onToken={setCaptcha} />}

            {error && (
              <div key={error} role="alert" className="text-rail-red text-[13px] font-body border border-rail-red/40 bg-rail-red/10 rounded-md px-3 py-2 error-shake">
                {error}
              </div>
            )}
            {info && (
              <div role="status" className="text-rail-green text-[13px] font-body border border-rail-green/40 bg-rail-green/10 rounded-md px-3 py-2">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || captchaMissing || (mode === "forgot" && !!info)}
              className="w-full h-11 mt-1 bg-amber text-onaccent rounded-md font-semibold text-[13.5px] uppercase tracking-[0.1em] hover:bg-amber/90 active:scale-[0.99] transition disabled:opacity-50 disabled:active:scale-100"
            >
              {submitting
                ? "Un instant…"
                : mode === "login"
                  ? "Se connecter"
                  : mode === "register"
                    ? "Créer mon compte"
                    : mode === "forgot"
                      ? "Envoyer le lien"
                      : "Enregistrer et se connecter"}
            </button>

            {(mode === "forgot" || mode === "reset") && (
              <button type="button" onClick={() => { switchMode("login"); if (mode === "reset") navigate("/auth", { replace: true }); }} className="text-[13px] font-body text-slate2 hover:text-offwhite">
                ← Retour à la connexion
              </button>
            )}
          </form>

          {social && (
            <>
              <div className="flex items-center gap-3 my-5" aria-hidden="true">
                <span className="flex-1 h-px bg-line" />
                <span className="font-mono2 text-[10.5px] uppercase tracking-[0.2em] text-slate2">ou</span>
                <span className="flex-1 h-px bg-line" />
              </div>
              <div className="flex flex-col gap-3">
                {providers?.discord && (
                  <button type="button" onClick={() => oauth("discord")} className="w-full h-11 rounded-md bg-[#5865F2] hover:bg-[#4f5ce0] text-white font-semibold text-[13.5px] uppercase tracking-[0.08em] flex items-center justify-center gap-2.5 transition-colors">
                    <DiscordIcon /> Continuer avec Discord
                  </button>
                )}
                {providers?.google && (
                  <button type="button" onClick={() => oauth("google")} className="w-full h-11 rounded-md bg-white hover:bg-[#f2f2f2] text-[#1f1f1f] font-semibold text-[13.5px] uppercase tracking-[0.08em] flex items-center justify-center gap-2.5 transition-colors">
                    <GoogleIcon /> Continuer avec Google
                  </button>
                )}
              </div>
            </>
          )}

          {mode === "register" && (
            <p className="text-[12px] text-slate2/80 font-body text-center mt-5">
              Gratuit. Vous fondez votre compagnie juste après, en une minute.
            </p>
          )}
        </div>

        {/* le réseau national, en direct : il vit pendant qu'on se connecte */}
        <section className="mt-6 rounded-lg border border-line bg-navy-900/70 backdrop-blur-md overflow-hidden" aria-label="Réseau national en direct">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
            <span className="flex items-center gap-2 font-mono2 text-[10.5px] uppercase tracking-[0.18em] text-slate2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-rail-green opacity-60 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-rail-green" />
              </span>
              Réseau national · en direct
            </span>
            <SplitFlap value={now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-line">
            {buildBoard(stats).map((t) => {
              const tone = TONE[t.tone];
              return (
                <div key={t.code} className="bg-navy-900 px-4 py-3.5 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono2 text-[9.5px] tracking-[0.14em] text-slate2/60">{t.code}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] font-mono2 text-[9.5px] uppercase tracking-wide ${tone.chip}`}>
                      <span className={`w-1 h-1 rounded-full ${tone.dot} ${t.tone === "alert" ? "blink-dot" : ""}`} />
                      {t.state}
                    </span>
                  </div>
                  <div className={`font-mono2 text-[26px] leading-none tabular-nums ${tone.text}`}>
                    {t.val}
                    {t.unit && <span className="text-[14px] text-slate2 ml-0.5">{t.unit}</span>}
                  </div>
                  <div className="text-[12px] font-body text-slate2 truncate">{t.label}</div>
                  {t.bar !== null && (
                    <div className="h-1 rounded-full bg-line overflow-hidden">
                      <div className={`h-full rounded-full ${tone.bar} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, t.bar))}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <div className="text-center mt-4">
          <Link to="/" className="text-[12.5px] font-body text-slate2 hover:text-offwhite">← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  );
}
