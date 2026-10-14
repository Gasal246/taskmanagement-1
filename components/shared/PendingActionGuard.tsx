"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { hasPendingAction, useHasPendingAction } from "@/hooks/use-action-pending";
import { Loader2 } from "lucide-react";
import { isInteractiveMutation } from "@/query/create-query-client";

/** A native modal also makes portalled sheets/dialogs inert, including keyboard
 * actions. A CSS overlay alone would leave focused controls usable underneath. */
export default function PendingActionGuard() {
  const client = useQueryClient();
  const mutations = useIsMutating({ predicate: isInteractiveMutation });
  const manualPending = useHasPendingAction();
  const pending = mutations > 0 || manualPending;
  const dialog = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    // Radix may have hidden this sibling when opening its own portal. The
    // native modal is now the active top-layer surface and must be announced.
    if (pending && element) {
      element.removeAttribute("aria-hidden");
      if (!element.open) element.showModal();
    }
    if (!pending && element?.open) element.close();
  }, [pending]);

  useEffect(() => {
    // Consult the cache directly: block a second click even before React has
    // rendered the pending state. Reads and background work are exempt.
    const guard = (event: Event) => {
      if (!hasPendingAction() && !client.isMutating({ predicate: isInteractiveMutation })) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const events = ["click", "dblclick", "submit", "keydown", "pointerdown"];
    events.forEach(event => document.addEventListener(event, guard, true));
    return () => events.forEach(event => document.removeEventListener(event, guard, true));
  }, [client]);

  return <dialog ref={dialog} aria-labelledby="pending-action-title" aria-describedby="pending-action-description"
    onCancel={event => event.preventDefault()}
    className="pointer-events-auto m-auto w-[min(90vw,22rem)] rounded-xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm">
    <div role="status" aria-live="polite" aria-busy={pending} className="flex items-center gap-4">
      <Loader2 aria-hidden="true" className="size-6 shrink-0 animate-spin text-cyan-400 motion-reduce:animate-none" />
      <div><p id="pending-action-title" className="font-semibold">Updating…</p>
        <p id="pending-action-description" className="mt-1 text-sm text-slate-400">Please wait while we finish and refresh your view.</p></div>
    </div>
  </dialog>;
}
