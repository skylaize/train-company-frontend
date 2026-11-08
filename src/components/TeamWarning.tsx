import { useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { DISCORD } from "../social";

/* Avertissement de l'équipe : affiché à l'ouverture du jeu tant que le
   joueur n'a pas cliqué « J'ai compris ». Pas de croix : il faut le lire. */
export function TeamWarning({ message, at, onDone }: { message: string; at: string | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const date = at ? new Date(at) : null;

  async function ack() {
    setBusy(true);
    await api.post("/me/warning/ack").catch(() => undefined);
    onDone();
  }

  return createPortal(
    <div data-modal className="fixed inset-0 z-[85] bg-black/70 flex items-center justify-center p-4">
      <div role="alertdialog" aria-modal="true" aria-label="Avertissement de l'équipe" className="w-full max-w-md bg-navy-900 border border-line border-t-[3px] border-t-amber rounded-card">
        <div className="px-5 pt-4 pb-3 border-b border-line">
          <div className="font-body text-[12px] text-amber font-medium">
            Message de l'équipe{date && !Number.isNaN(date.getTime()) ? ` · ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}
          </div>
          <h3 className="font-display text-xl leading-tight mt-0.5">Avertissement</h3>
        </div>
        <div className="p-5">
          <p className="font-body text-[14.5px] text-offwhite whitespace-pre-wrap break-words">{message}</p>
          <p className="font-body text-[13px] text-slate2 mt-4">
            Votre compte n'est pas suspendu. Si ça recommence, il pourra l'être. Pour en discuter, passez sur{" "}
            <a href={DISCORD.url} target="_blank" rel="noreferrer" className="text-cobalt hover:underline">
              le Discord
            </a>
            .
          </p>
          <button
            onClick={ack}
            disabled={busy}
            className="mt-5 w-full h-11 bg-amber text-onaccent rounded-md font-semibold text-[13.5px] hover:bg-amber/90 transition disabled:opacity-60"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
