import axios from "axios";
import { getToken } from "../authToken";

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
