/* Service worker — il ne sert qu'aux notifications.

   Volontairement minimal : aucun cache, aucune interception de requête. Un
   service worker qui met en cache est une source classique de « le jeu affiche
   une vieille version » ; ici il se contente d'écouter deux événements. */

self.addEventListener("install", () => {
  // on n'attend pas la fermeture des anciens onglets pour prendre le relais
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Réseau";
  const options = {
    body: data.body || "",
    icon: "/icone-192.png",
    badge: "/icone-192.png",
    // deux notifications de même étiquette se remplacent au lieu de s'empiler
    tag: data.tag || "reseau",
    renotify: true,
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  /* Si le jeu est déjà ouvert quelque part, on ramène cet onglet au premier
     plan plutôt que d'en ouvrir un deuxième. */
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
