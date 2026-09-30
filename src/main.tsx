import "./install"; // en premier : l'invitation à installer arrive dès le chargement
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, readLocalTheme } from "./theme";

// avant le premier rendu : évite le flash de thème au chargement
applyTheme(readLocalTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// écran de démarrage de l'application installée (voir index.html) : il s'efface une fois l'interface prête
const splash = document.getElementById("splash");
if (splash) {
  window.setTimeout(() => {
    splash.classList.add("gone");
    window.setTimeout(() => splash.remove(), 400);
  }, 450);
}
