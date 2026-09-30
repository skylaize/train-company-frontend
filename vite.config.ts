import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

/* 1.6 : chaque build porte un identifiant, publié aussi dans /version.json.
   Le jeu compare les deux de temps en temps : un onglet ouvert depuis des
   jours (ou une page gardée en cache par l'hébergeur) sait qu'une nouvelle
   version est en ligne et propose de recharger. Un joueur tournait encore
   en 1.3 deux versions plus tard. */
const BUILD_ID = new Date().toISOString();

function versionFile(): Plugin {
  return {
    name: "reseau-version",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ build: BUILD_ID }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 5173 },
});
