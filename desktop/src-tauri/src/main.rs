// pas de console noire derrière la fenêtre du jeu sous Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/* ============================================================
Réseau pour Windows.

L'application ne contient AUCUN code du jeu : c'est une fenêtre qui
affiche https://compagnie.skhost.fr, comme un navigateur, avec trois
choses en plus :
- le statut Discord (Rich Presence) : « Compagnie X · 14 rames » ;
- la fenêtre reste sur le jeu : tout autre site s'ouvre dans le
  navigateur du joueur ;
- un lien externe (Instagram, Discord…) s'ouvre aussi dans le navigateur.

Sécurité :
- la page ne peut appeler que les trois commandes ci-dessous (voir
  build.rs et capabilities/main.json), et seulement depuis
  https://compagnie.skhost.fr ; pas d'accès aux fichiers, au système
  ni aux autres API de Tauri ;
- les textes reçus sont raccourcis, le bouton du statut pointe toujours
  vers le site officiel, et seuls les liens https s'ouvrent dehors ;
- les outils de développement sont absents de la version compilée.
============================================================ */

use std::sync::Mutex;
use std::time::{Duration, Instant};

use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use serde::Deserialize;
use tauri::{Url, WebviewUrl, WebviewWindowBuilder};

const GAME_URL: &str = "https://compagnie.skhost.fr/";
// identifiant de l'application Discord (public), fourni à la compilation
const DISCORD_CLIENT_ID: Option<&str> = option_env!("DISCORD_CLIENT_ID");

/* Sites qui peuvent s'afficher DANS la fenêtre : le jeu et son API
(sous-domaines de skhost.fr), la connexion Discord ou Google, et le
paiement Stripe. Tout le reste part dans le navigateur. */
fn allowed_inside(url: &Url) -> bool {
    if url.scheme() != "https" {
        return false;
    }
    let host = match url.host_str() {
        Some(h) => h.to_ascii_lowercase(),
        None => return false,
    };
    let is = |domain: &str| host == domain || host.ends_with(&format!(".{domain}"));
    is("skhost.fr") || is("discord.com") || host == "accounts.google.com" || is("stripe.com")
}

/* Ouvre un lien https dans le navigateur du joueur. Au plus un lien par
seconde : une page ne peut pas ouvrir des dizaines d'onglets d'un coup. */
static LAST_OPEN: Mutex<Option<Instant>> = Mutex::new(None);

fn open_outside(url: &Url) {
    if url.scheme() != "https" || url.as_str().len() > 2048 {
        return;
    }
    if let Ok(mut last) = LAST_OPEN.lock() {
        if last.map_or(false, |t| t.elapsed() < Duration::from_secs(1)) {
            return;
        }
        *last = Some(Instant::now());
    }
    let _ = open::that_detached(url.as_str());
}

#[tauri::command]
fn open_external(url: String) {
    if let Ok(parsed) = Url::parse(&url) {
        open_outside(&parsed);
    }
}

/* ---------------- statut Discord ---------------- */

struct Rpc(Mutex<Option<DiscordIpcClient>>);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Presence {
    details: Option<String>,
    state: Option<String>,
    started_at: Option<i64>,
}

// Discord refuse les textes de moins de 2 ou de plus de 128 caractères
fn clip(text: &Option<String>) -> Option<String> {
    let t: String = text
        .as_deref()?
        .trim()
        .chars()
        .filter(|c| !c.is_control())
        .take(120)
        .collect();
    if t.chars().count() >= 2 {
        Some(t)
    } else {
        None
    }
}

#[tauri::command]
fn set_presence(rpc: tauri::State<'_, Rpc>, presence: Presence) {
    let Some(client_id) = DISCORD_CLIENT_ID else {
        return;
    };
    let Ok(mut slot) = rpc.0.lock() else { return };

    // Discord fermé ou absent : on réessaiera au prochain changement
    if slot.is_none() {
        let Ok(mut client) = DiscordIpcClient::new(client_id) else {
            return;
        };
        if client.connect().is_err() {
            return;
        }
        *slot = Some(client);
    }

    let details = clip(&presence.details);
    let state = clip(&presence.state);
    let mut act = activity::Activity::new()
        .assets(
            activity::Assets::new()
                .large_image("logo")
                .large_text("Réseau, jeu de gestion ferroviaire"),
        )
        .buttons(vec![activity::Button::new("Jouer à Réseau", GAME_URL)]);
    if let Some(d) = details.as_deref() {
        act = act.details(d);
    }
    if let Some(s) = state.as_deref() {
        act = act.state(s);
    }
    if let Some(t) = presence.started_at.filter(|t| *t > 0) {
        act = act.timestamps(activity::Timestamps::new().start(t));
    }

    let sent = slot.as_mut().map_or(false, |c| c.set_activity(act).is_ok());
    if !sent {
        // Discord a été fermé entre-temps : la connexion sera refaite
        if let Some(mut client) = slot.take() {
            let _ = client.close();
        }
    }
}

#[tauri::command]
fn clear_presence(rpc: tauri::State<'_, Rpc>) {
    if let Ok(mut slot) = rpc.0.lock() {
        if let Some(client) = slot.as_mut() {
            if client.clear_activity().is_err() {
                *slot = None;
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .manage(Rpc(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            set_presence,
            clear_presence,
            open_external
        ])
        .setup(|app| {
            let start: Url = GAME_URL.parse().expect("adresse du jeu");
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(start))
                .title("Réseau")
                .inner_size(1280.0, 820.0)
                .min_inner_size(400.0, 600.0)
                .center()
                .on_navigation(|url| {
                    if allowed_inside(url) {
                        true
                    } else {
                        open_outside(url);
                        false
                    }
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Réseau n'a pas pu démarrer");
}
