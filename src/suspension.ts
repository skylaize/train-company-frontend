import { useSyncExternalStore } from "react";

/* État renvoyé par le serveur qui remplace le jeu par un écran :
   - compte suspendu : 403 avec { banned: true, reason, since, until } ;
   - maintenance en cours : 503 avec { maintenance: true, message, endsAt } ;
   - maintenance annoncée : en-tête X-Maintenance sur les réponses, pour le bandeau. */

function store<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    set(v: T) {
      value = v;
      listeners.forEach((l) => l());
    },
    get: () => value,
    use() {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useSyncExternalStore(
        (l) => {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        () => value
      );
    },
  };
}

export type Suspension = { reason: string | null; since: string | null; until?: string | null };
const suspension = store<Suspension | null>(null);
export const setSuspension = suspension.set;
export const useSuspension = suspension.use;

export type MaintenanceNow = { message: string; endsAt: string | null };
const maintenance = store<MaintenanceNow | null>(null);
export const setMaintenance = maintenance.set;
export const getMaintenance = maintenance.get;
export const useMaintenance = maintenance.use;

export type MaintenanceNotice = { message: string; startsAt: string; endsAt: string | null };
const notice = store<MaintenanceNotice | null>(null);
export const useMaintenanceNotice = notice.use;
export function setMaintenanceNotice(n: MaintenanceNotice | null) {
  const cur = notice.get();
  // même annonce : pas de nouveau rendu à chaque réponse de l'API
  if (cur?.startsAt === n?.startsAt && cur?.message === n?.message && cur?.endsAt === n?.endsAt) return;
  notice.set(n);
}
