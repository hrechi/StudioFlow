"use client";

import { Copy, Download, FilePen, Loader2, ReceiptText, Send, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import {
  deleteDevisAction,
  duplicateDevisAction,
  regenerateFacturesAction,
  sendDevisAction,
  withdrawDevisAction,
} from "../facturation.actions";
import { pdfHref, type Devis } from "../facturation.types";

type Pending = "send" | "withdraw" | "duplicate" | "delete" | "invoices" | null;

/** Hook shared by the list menu and the detail page: runs a billing action with a toast. */
export function useDevisCommands() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [, start] = useTransition();

  const run = <T,>(key: Exclude<Pending, null>, action: () => Promise<ActionResult<T>>, ok: string, after?: (data: T) => void) =>
    start(async () => {
      setPending(key);
      const result = await action();
      setPending(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(ok);
      if (after) after(result.data);
      else router.refresh();
    });

  return {
    pending,
    send: (d: Devis) => run("send", () => sendDevisAction(d.id), "Quote sent to the client portal"),
    withdraw: (d: Devis) => run("withdraw", () => withdrawDevisAction(d.id), "Quote back to draft"),
    duplicate: (d: Devis) =>
      run("duplicate", () => duplicateDevisAction(d.id), "Quote duplicated as a new draft", ({ id }) =>
        router.push(`/dashboard/facturation/devis/${id}/modifier`),
      ),
    remove: (d: Devis, after?: () => void) =>
      run("delete", () => deleteDevisAction(d.id), d.statut === "BROUILLON" ? "Draft deleted" : "Quote archived", () => {
        if (after) after();
        router.refresh();
      }),
    issueInvoices: (d: Devis) => run("invoices", () => regenerateFacturesAction(d.id), "Invoices issued to the client"),
  };
}

/**
 * Invoices are issued automatically when the client accepts. This only covers an accepted quote
 * without invoices (accepted before that rule, or after the studio cancelled them).
 */
export const needsInvoices = (d: Devis) => d.statut === "ACCEPTE" && d.factures.length === 0;

/** Action bar of /dashboard/facturation/devis/[id]. */
export function DevisActions({ devis }: { devis: Devis }) {
  const router = useRouter();
  const commands = useDevisCommands();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const spinner = (key: Pending, Icon: typeof Send) =>
    commands.pending === key ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />;

  return (
    <div className="flex flex-wrap gap-2">
      {devis.statut === "BROUILLON" && (
        <>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/facturation/devis/${devis.id}/modifier`}>
              <FilePen aria-hidden />
              Edit
            </Link>
          </Button>
          <Button onClick={() => commands.send(devis)} disabled={!!commands.pending}>
            {spinner("send", Send)}
            Send to client
          </Button>
        </>
      )}
      {(devis.statut === "ENVOYE" || devis.statut === "EXPIRE") && (
        <Button variant="outline" onClick={() => commands.withdraw(devis)} disabled={!!commands.pending}>
          {spinner("withdraw", Undo2)}
          Back to draft
        </Button>
      )}
      {needsInvoices(devis) && (
        <Button onClick={() => commands.issueInvoices(devis)} disabled={!!commands.pending}>
          {spinner("invoices", ReceiptText)}
          Issue invoices
        </Button>
      )}
      <Button variant="outline" asChild>
        <a href={pdfHref(devis.id)} download>
          <Download aria-hidden />
          PDF
        </a>
      </Button>
      <Button variant="outline" onClick={() => commands.duplicate(devis)} disabled={!!commands.pending}>
        {spinner("duplicate", Copy)}
        Duplicate
      </Button>
      {devis.factures.length === 0 && (
        <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={!!commands.pending}>
          <Trash2 aria-hidden />
          Delete
        </Button>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="destructive"
        title={devis.statut === "BROUILLON" ? "Delete this draft?" : "Archive this quote?"}
        description={
          devis.statut === "BROUILLON"
            ? "The draft will be permanently deleted."
            : "The client has already seen this quote: it is archived and hidden from the lists."
        }
        confirmLabel={devis.statut === "BROUILLON" ? "Delete" : "Archive"}
        pending={commands.pending === "delete"}
        onConfirm={() => {
          setConfirmDelete(false);
          commands.remove(devis, () => router.push("/dashboard/facturation/devis"));
        }}
      />
    </div>
  );
}
