import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { TrainMark } from "../components/TrainMark";
import { RailSchematic } from "../components/RailSchematic";
import { SplitFlap } from "../components/SplitFlap";
import { SteamEffect } from "../components/SteamEffect";
import { api } from "../api/client";

interface NetworkStats {
  activeCompanies: number;
  trainsInService: number;
  punctuality: number;
  activeIncidents: number;
}

function buildBoard(stats: NetworkStats | null) {
  return [
    {
      code: "TC-014",
      dest: "Compagnies actives",
      val: stats ? String(stats.activeCompanies).padStart(4, " ") : "  …",
      status: "OK",
      color: "text-rail-green",
    },
    {
      code: "TC-022",
      dest: "Trains en circulation",
      val: stats ? String(stats.trainsInService).padStart(4, " ") : "  …",
      status: "OK",
      color: "text-rail-green",
    },
    {
      code: "TC-031",
      dest: "Ponctualité réseau",
      val: stats ? `${stats.punctuality}%`.padStart(4, " ") : "  …",
      status: "OK",
      color: stats && stats.punctuality < 80 ? "text-rail-red" : "text-amber",
    },
    {
      code: "TC-047",
      dest: "Incidents en cours",
      val: stats ? String(stats.activeIncidents).padStart(4, " ") : "  …",
      status: stats && stats.activeIncidents > 0 ? "ALERTE" : "OK",
      color: stats && stats.activeIncidents > 0 ? "text-rail-red" : "text-rail-green",
    },
  ];
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(searchParams.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data } = await api.get("/network/stats");
        setStats(data);
      } catch {
        // page de connexion : on affiche simplement le tableau en attente, pas grave si ça échoue
      }
    }
    loadStats();
    const interval = setInterval(loadStats, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        showToast("Connexion réussie");
      } else {
        await register(email, pseudo, password);
        showToast("Compte créé — bienvenue à bord");
      }
      navigate("/dashboard");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Une erreur est survenue";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
      {/* Panneau gauche — identité + tableau de bord réseau */}
      <div className="hidden md:flex flex-col justify-between bg-navy-900 border-r border-line p-10 rail-bg relative overflow-hidden">
        <RailSchematic className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative inline-flex">
              <SteamEffect size={28} />
              <TrainMark size={20} className="text-cobalt relative" />
            </span>
            <div className="font-body uppercase tracking-[0.16em] text-xs text-slate2">Réseau</div>
          </div>
          <div className="font-display text-4xl lg:text-5xl leading-[1.05] max-w-sm">
            Console d'exploitation ferroviaire
          </div>
        </div>

        <div className="border border-line">
          <div className="flex justify-between px-3 py-2 border-b border-line font-mono2 text-[11px] text-slate2 uppercase tracking-wide">
            <span>Réseau national</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rail-green blink-dot" />
              <SplitFlap
                value={now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                size="sm"
              />
            </span>
          </div>
          {buildBoard(stats).map((row) => (
            <div key={row.code} className="flex items-center px-3 py-2.5 border-b border-line last:border-0 font-mono2 text-xs">
              <span className="text-slate2 w-16">{row.code}</span>
              <span className="flex-1">{row.dest}</span>
              <span className={`${row.color} mr-3 font-semibold`}>{row.val}</span>
              <span className={row.status === "ALERTE" ? "text-rail-red" : "text-rail-green"}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex items-center justify-center px-6 py-16 bg-navy-950">
        <div className="w-full max-w-sm tutorial-step-enter">
          <div className="md:hidden font-display uppercase tracking-wide text-lg mb-8">Réseau</div>

          <h1 className="font-display text-3xl mb-1">
            {mode === "login" ? "Bon retour" : "Rejoindre le réseau"}
          </h1>
          <p className="text-sm text-slate2 font-body mb-6">
            {mode === "login" ? "Reprenez la main sur votre compagnie." : "Fondez votre première compagnie ferroviaire."}
          </p>

          <div className="flex border-b border-line mb-6">
            <button
              className={`px-1 py-2.5 mr-6 text-xs uppercase tracking-wide font-mono2 border-b-2 -mb-px ${
                mode === "login" ? "border-cobalt text-cobalt" : "border-transparent text-slate2"
              }`}
              onClick={() => { setMode("login"); setError(null); }}
            >
              Connexion
            </button>
            <button
              className={`px-1 py-2.5 text-xs uppercase tracking-wide font-mono2 border-b-2 -mb-px ${
                mode === "register" ? "border-cobalt text-cobalt" : "border-transparent text-slate2"
              }`}
              onClick={() => { setMode("register"); setError(null); }}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs uppercase tracking-wide text-slate2 mb-1.5">Pseudo</label>
                <input
                  className="w-full bg-transparent border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wide text-slate2 mb-1.5">Email</label>
              <input
                type="email"
                className="w-full bg-transparent border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-slate2 mb-1.5">Mot de passe</label>
              <input
                type="password"
                className="w-full bg-transparent border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div key={error} className="text-rail-red text-xs border-l-2 border-rail-red pl-2 py-0.5 error-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-cobalt text-offwhite font-semibold py-2.5 text-sm uppercase tracking-wide hover:bg-cobalt/90 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:active:scale-100"
            >
              {submitting ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
