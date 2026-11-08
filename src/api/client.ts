import axios from "axios";
import { getToken } from "../authToken";
import { setMaintenance, setMaintenanceNotice, setSuspension } from "../suspension";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  // 2.1.2 : une requête sans réponse ne doit pas laisser le jeu charger à l'infini
  timeout: 25_000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Compte suspendu, maintenance en cours ou annoncée : l'application
   bascule sur l'écran qui va bien, ou affiche le bandeau. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readNotice(headers: any) {
  const raw = headers?.["x-maintenance"];
  if (!raw) return setMaintenanceNotice(null);
  try {
    setMaintenanceNotice(JSON.parse(decodeURIComponent(String(raw))));
  } catch {
    setMaintenanceNotice(null);
  }
}

api.interceptors.response.use(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res: any) => {
    readNotice(res?.headers);
    return res;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (err: any) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    if (status === 403 && data?.banned) {
      setSuspension({ reason: data.reason ?? null, since: data.since ?? null, until: data.until ?? null });
    } else if (status === 503 && data?.maintenance) {
      setMaintenance({ message: data.message ?? "", endsAt: data.endsAt ?? null });
    } else if (err?.response) {
      readNotice(err.response.headers);
    }
    return Promise.reject(err);
  }
);
