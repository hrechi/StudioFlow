"use client";

import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { RatingInput, RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import {
  deleteMyAvisAction,
  deleteMyReclamationAction,
  updateMyAvisAction,
  updateMyReclamationAction,
} from "../avis.actions";
import {
  CATEGORIES_RECLAMATION,
  categorieReclamationLabels,
  statutAvisConfig,
  type Avis,
  type CategorieReclamation,
  type Reclamation,
} from "../avis.types";

/** Edit / Delete buttons shared by both item types. */
function ItemActions({
  label,
  canEdit,
  editHint,
  onEdit,
  onDelete,
}: {
  label: string;
  canEdit: boolean;
  editHint?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {canEdit ? (
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${label}`}>
          <Pencil aria-hidden />
          Edit
        </Button>
      ) : (
        editHint && <span className="mr-2 text-xs text-muted-foreground">{editHint}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive-text hover:bg-destructive/10 hover:text-destructive-text"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
      >
        <Trash2 aria-hidden />
        Delete
      </Button>
    </div>
  );
}

function EditButtons({
  pending,
  disabled,
  onCancel,
}: {
  pending: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="submit" size="sm" disabled={disabled || pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
        Save changes
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
        <X aria-hidden />
        Cancel
      </Button>
    </div>
  );
}

function useFeedbackMutation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    messages: { ok: string; okDescription?: string; failed: string },
    onDone?: () => void,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(messages.failed, { description: result.error });
        return;
      }
      toast.success(messages.ok, { description: messages.okDescription });
      onDone?.();
      router.refresh();
    });
  return { pending, run };
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export function MyReviewItem({ avis }: { avis: Avis }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [note, setNote] = useState(avis.note);
  const [commentaire, setCommentaire] = useState(avis.commentaire);
  const { pending, run } = useFeedbackMutation();
  const statut = avis.statut ?? (avis.estPublie ? "PUBLIE" : "EN_ATTENTE");

  const cancel = () => {
    setNote(avis.note);
    setCommentaire(avis.commentaire);
    setEditing(false);
  };

  return (
    <li className="space-y-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars value={editing ? note : avis.note} />
          <StatusBadge value={statut} config={statutAvisConfig} />
          <span className="text-xs text-muted-foreground">
            {avis.seance.titre} · {formatDate(avis.dateAvis)}
          </span>
        </div>
        {!editing && (
          <ItemActions
            label="this review"
            canEdit
            onEdit={() => setEditing(true)}
            onDelete={() => setConfirmDelete(true)}
          />
        )}
      </div>

      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => updateMyAvisAction({ id: avis.id, note, commentaire }),
              {
                ok: "Review updated",
                okDescription: "It will be visible again once the studio has approved it.",
                failed: "Review not updated",
              },
              () => setEditing(false),
            );
          }}
        >
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-slate">Your rating</legend>
            <RatingInput value={note} onChange={setNote} name={`note-${avis.id}`} />
          </fieldset>
          <FormField id={`commentaire-${avis.id}`} label="Your review" required>
            <Textarea
              id={`commentaire-${avis.id}`}
              rows={4}
              className="bg-card"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              maxLength={3000}
            />
          </FormField>
          <p className="text-xs text-muted-foreground">
            An edited review goes back to moderation before it is published again.
          </p>
          <EditButtons
            pending={pending}
            disabled={note === 0 || !commentaire.trim()}
            onCancel={cancel}
          />
        </form>
      ) : (
        <>
          <p className="text-sm text-slate">“{avis.commentaire}”</p>
          {avis.reponseStudio && (
            <p className="text-sm text-primary-text">Studio reply: {avis.reponseStudio}</p>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="destructive"
        title="Delete this review?"
        description="It will be removed from your account and from the studio's website. This cannot be undone."
        confirmLabel="Delete review"
        pending={pending}
        onConfirm={() =>
          run(
            () => deleteMyAvisAction({ id: avis.id }),
            { ok: "Review deleted", failed: "Review not deleted" },
            () => setConfirmDelete(false),
          )
        }
      />
    </li>
  );
}

// ── Complaints ──────────────────────────────────────────────────────────────

export function MyComplaintItem({
  reclamation: r,
  progress,
}: {
  reclamation: Reclamation;
  /** The status timeline, rendered by the parent list. */
  progress: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [objet, setObjet] = useState(r.objet);
  const [description, setDescription] = useState(r.description);
  const [categorie, setCategorie] = useState<CategorieReclamation>(r.categorie);
  const { pending, run } = useFeedbackMutation();
  const editable = r.statut === "OUVERTE";

  const cancel = () => {
    setObjet(r.objet);
    setDescription(r.description);
    setCategorie(r.categorie);
    setEditing(false);
  };

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{r.objet}</p>
            {progress}
          </div>
          <p className="text-xs text-muted-foreground">
            {r.seance.titre} · {categorieReclamationLabels[r.categorie]} · sent{" "}
            {formatDate(r.dateCreation)}
          </p>
          {!editing && <p className="mt-2 text-sm text-slate">{r.description}</p>}
          {r.reponse && (
            <p className="mt-2 rounded-lg bg-surface p-2.5 text-sm text-slate">
              Studio: {r.reponse}
            </p>
          )}
        </div>
        {!editing && (
          <ItemActions
            label="this complaint"
            canEdit={editable}
            editHint="Being handled: can't be edited"
            onEdit={() => setEditing(true)}
            onDelete={() => setConfirmDelete(true)}
          />
        )}
      </div>

      {editing && (
        <form
          className="space-y-3 rounded-lg border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => updateMyReclamationAction({ id: r.id, objet, description, categorie }),
              { ok: "Complaint updated", failed: "Complaint not updated" },
              () => setEditing(false),
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <FormField id={`objet-${r.id}`} label="Subject" required>
              <Input
                id={`objet-${r.id}`}
                className="h-10 bg-card"
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
                maxLength={180}
              />
            </FormField>
            <FormField id={`categorie-${r.id}`} label="Category" required>
              <Select
                value={categorie}
                onValueChange={(v) => setCategorie(v as CategorieReclamation)}
              >
                <SelectTrigger id={`categorie-${r.id}`} className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_RECLAMATION.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categorieReclamationLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField id={`description-${r.id}`} label="Description" required>
            <Textarea
              id={`description-${r.id}`}
              rows={3}
              className="bg-card"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
            />
          </FormField>
          <EditButtons
            pending={pending}
            disabled={!objet.trim() || !description.trim()}
            onCancel={cancel}
          />
        </form>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        tone="destructive"
        title="Delete this complaint?"
        description={
          r.statut === "OUVERTE"
            ? "The studio will no longer see it. This cannot be undone."
            : "It will be removed from your account, with the studio's reply. This cannot be undone."
        }
        confirmLabel="Delete complaint"
        pending={pending}
        onConfirm={() =>
          run(
            () => deleteMyReclamationAction({ id: r.id }),
            { ok: "Complaint deleted", failed: "Complaint not deleted" },
            () => setConfirmDelete(false),
          )
        }
      />
    </li>
  );
}
