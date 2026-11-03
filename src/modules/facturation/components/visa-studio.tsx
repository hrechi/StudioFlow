"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";
import { deleteVisaImageAction } from "../facturation.actions";
import type { ChampVisa, VisaStudioView } from "../facturation.types";
import { ImagePicker, SignatureInput, useSignatureInput } from "./signature-input";

const TITRES: Record<ChampVisa, string> = { signature: "Signature", cachet: "Company stamp" };

/** /dashboard/profil (admin): the signature and stamp printed on every quote and invoice PDF. */
export function VisaStudioCard({ visa }: { visa: VisaStudioView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Signature and company stamp</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add them once: they appear automatically on all quote and invoice PDFs.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <VisaSlot champ="signature" fichier={visa.signature} />
        <VisaSlot champ="cachet" fichier={visa.cachet} />
      </CardContent>
    </Card>
  );
}

function VisaSlot({ champ, fichier }: { champ: ChampVisa; fichier?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, start] = useTransition();

  const remove = () =>
    start(async () => {
      const result = await deleteVisaImageAction(champ);
      setDeleting(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${TITRES[champ]} deleted`);
      router.refresh();
    });

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium text-foreground">{TITRES[champ]}</p>
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed bg-white p-2">
        {fichier ? (
          // A private API image: next/image cannot optimise it. The id refreshes it after a change.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/facturation/visa/${champ}?v=${fichier}`} alt={TITRES[champ]} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-neutral-500">Not added yet</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <ImagePlus aria-hidden />
          {fichier ? "Edit" : "Add"}
        </Button>
        {fichier && (
          <Button size="sm" variant="ghost" onClick={() => setDeleting(true)}>
            <Trash2 aria-hidden />
            Delete
          </Button>
        )}
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {editing && (
            <VisaForm
              champ={champ}
              onDone={() => {
                setEditing(false);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        tone="destructive"
        title={`Delete the ${champ === "signature" ? "signature" : "company stamp"}?`}
        description="It will no longer appear on any PDF, including those already issued, until you add it again."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}

function VisaForm({ champ, onDone }: { champ: ChampVisa; onDone: () => void }) {
  const signature = useSignatureInput();
  const [cachet, setCachet] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const ready = champ === "signature" ? signature.ready : !!cachet;

  const submit = () =>
    start(async () => {
      setErrors({});
      const image = champ === "signature" ? await signature.toBlob() : cachet;
      if (!image) return;
      const form = new FormData();
      form.set("champ", champ);
      form.set("image", image, `${champ}.png`);
      let result: ActionResult;
      try {
        const response = await fetch("/api/facturation/visa", { method: "POST", body: form });
        result = (await response.json()) as ActionResult;
      } catch {
        toast.error("Upload failed: check your connection and try again.");
        return;
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(`${TITRES[champ]} saved`, { description: "It now appears on all your PDFs." });
      onDone();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{TITRES[champ]}</DialogTitle>
        <DialogDescription>It will appear automatically on all quote and invoice PDFs.</DialogDescription>
      </DialogHeader>
      {champ === "signature" ? (
        <FormField id="visa-signature" label="Signature" required error={errors.signature?.[0]}>
          <SignatureInput id="visa-signature" input={signature} />
        </FormField>
      ) : (
        <FormField id="visa-cachet" label="Company stamp" required error={errors.cachet?.[0]}>
          <ImagePicker id="visa-cachet" file={cachet} onChange={setCachet} />
        </FormField>
      )}
      <DialogFooter>
        <Button onClick={submit} disabled={pending || !ready}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
