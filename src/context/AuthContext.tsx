import { createContext, useContext, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { clearToken, setToken } from "../authToken";

interface User {
  id: string;
  email: string;
  pseudo: string;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string, opts?: AuthOpts) => Promise<void>;
  register: (email: string, pseudo: string, password: string, opts?: AuthOpts) => Promise<void>;
  /* jeton reçu d'ailleurs : retour de Discord ou Google, nouveau mot de passe */
  adopt: (token: string, remember: boolean) => void;
  logout: () => void;
}

export interface AuthOpts {
  remember?: boolean;
  turnstile?: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  async function login(email: string, password: string, opts: AuthOpts = {}) {
    const remember = opts.remember ?? true;
    const { data } = await api.post("/auth/login", { email, password, remember, turnstile: opts.turnstile ?? undefined });
    setToken(data.token, remember);
    setUser(data.user);
  }

  async function register(email: string, pseudo: string, password: string, opts: AuthOpts = {}) {
    const remember = opts.remember ?? true;
    const { data } = await api.post("/auth/register", { email, pseudo, password, remember, turnstile: opts.turnstile ?? undefined });
    setToken(data.token, remember);
    setUser(data.user);
  }

  function adopt(token: string, remember: boolean) {
    setToken(token, remember);
  }

  function logout() {
    clearToken();
    setUser(null);
    navigate("/auth", { replace: true });
  }

  return (
    <AuthContext.Provider value={{ user, login, register, adopt, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
