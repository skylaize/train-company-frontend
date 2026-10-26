fn main() {
    // l'identifiant de l'application Discord est lu à la compilation (variable du dépôt GitHub)
    println!("cargo:rerun-if-env-changed=DISCORD_CLIENT_ID");
    /* Seules ces trois commandes existent côté application. Toute autre
    demande venant de la page est refusée par Tauri. */
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "set_presence",
            "clear_presence",
            "open_external",
        ]),
    ))
    .expect("échec de la préparation de l'application");
}
