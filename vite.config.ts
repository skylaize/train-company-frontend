import { defineConfig, loadEnv, Plugin } from "vite";
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

/* 1.7 : AdSense. Avec VITE_ADSENSE_CLIENT=ca-pub-…, le build publie le fichier
   ads.txt exigé par Google et la balise de validation du site. Sans, rien. */
function adsense(client: string): Plugin {
  const ok = /^ca-pub-\d+$/.test(client);
  return {
    name: "reseau-adsense",
    transformIndexHtml(html) {
      return ok ? html.replace("</head>", `  <meta name="google-adsense-account" content="${client}">\n  </head>`) : html;
    },
    generateBundle() {
      if (!ok) return;
      this.emitFile({ type: "asset", fileName: "ads.txt", source: `google.com, ${client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n` });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), versionFile(), adsense((loadEnv(mode, process.cwd(), "VITE_").VITE_ADSENSE_CLIENT || "").trim())],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: { port: 5173 },
}));
