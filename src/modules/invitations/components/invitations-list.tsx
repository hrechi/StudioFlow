"use client";

import { ArrowLeft, Copy, Globe, Loader2, Mail, MoreHorizontal, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import { createInvitationAction, deleteInvitationAction, duplicateInvitationAction } from "../invitation.actions";
import { configEvenement, LISTE_EVENEMENTS } from "../invitation.evenements";
import { LANGUES, type Langue, type TypeEvenement } from "../invitation.schema";
import { apercuTemplate, templatesDuType } from "../invitation.templates";
import { CLIENT_PATH, langueLabels, MAX_INVITATIONS, type InvitationResume } from "../invitation.types";
import { InvitationApercu } from "./invitation-apercu";

/** /espace-client/invitations once unlocked: the client's cards, and the template picker. */
export function InvitationsList({ invitations }: { invitations: InvitationResume[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<InvitationResume | null>(null);
  const [pending, start] = useTransition();

  const dupliquer = (invitation: InvitationResume) =>
    start(async () => {
      const result = await duplicateInvitationAction(invitation.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation duplicated");
      router.refresh();
    });

  const supprimer = () =>
    start(async () => {
      if (!deleting) return;
      const result = await deleteInvitationAction(deleting.id);
      setDeleting(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation deleted");
      router.refresh();
    });

  const nouveau = (
    <Button onClick={() => setCreating(true)} disabled={invitations.length >= MAX_INVITATIONS}>
      <Plus aria-hidden />
      New invitation
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {invitations.length} / {MAX_INVITATIONS} invitations
        </p>
        {invitations.length > 0 && nouveau}
      </div>

      {invitations.length === 0 ? (
        <EmptyState icon={Mail} title="Your editor is unlocked" description="Choose a template to create your first invitation." action={nouveau} />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {invitations.map((invitation) => (
            <li key={invitation.id}>
              <Card className="gap-0 overflow-hidden py-0">
                <Link href={`${CLIENT_PATH}/${invitation.id}`} aria-label={`Edit ${invitation.titre}`} className="block bg-muted/40 p-3">
                  <InvitationApercu contenu={invitation.contenu} className="pointer-events-none mx-auto max-h-64 max-w-full overflow-hidden rounded shadow-soft" />
                </Link>
                <CardContent className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{invitation.titre}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {formatDate(invitation.updatedAt)}
                      {invitation.partageActif && (
                        <span className="inline-flex items-center gap-1 text-success-text">
                          · <Globe className="size-3" aria-hidden /> Shared
                        </span>
                      )}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${invitation.titre}`}>
                        <MoreHorizontal aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`${CLIENT_PATH}/${invitation.id}`}>
                          <Pencil aria-hidden />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`${CLIENT_PATH}/${invitation.id}?envoyer=1`}>
                          <Send aria-hidden />
                          Send to guests
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => dupliquer(invitation)} disabled={pending}>
                        <Copy aria-hidden />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDeleting(invitation)} className="text-destructive">
                        <Trash2 aria-hidden />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-3xl">{creating && <NouvelleInvitation onClose={() => setCreating(false)} />}</DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="destructive"
        title={`Delete "${deleting?.titre}"?`}
        description="The card is permanently deleted and its shared link stops working."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={supprimer}
      />
    </div>
  );
}

/** Two steps: the kind of event, then a template in the chosen language. */
function NouvelleInvitation({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<TypeEvenement | null>(null);
  const [titre, setTitre] = useState("");
  const [langue, setLangue] = useState<Langue>("en");
  const [templateId, setTemplateId] = useState<string>("");
  const [erreur, setErreur] = useState<string>();
  const [pending, start] = useTransition();
  const templates = type ? templatesDuType(type) : [];

  const choisirType = (choisi: TypeEvenement) => {
    const modeles = templatesDuType(choisi);
    setType(choisi);
    setTemplateId(modeles[0]?.id ?? "");
    setLangue(modeles[0]?.contenu.details.langue ?? "en");
    setTitre(`My ${configEvenement(choisi).label.toLowerCase()} invitation`.slice(0, 80));
  };

  const creer = () =>
    start(async () => {
      const result = await createInvitationAction({ titre, templateId, langue });
      if (!result.ok) {
        setErreur(result.fieldErrors?.titre?.[0]);
        if (!result.fieldErrors?.titre) toast.error(result.error);
        return;
      }
      router.push(`${CLIENT_PATH}/${result.data.id}`);
    });

  if (!type) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>New invitation</DialogTitle>
          <DialogDescription>What are you celebrating? You can change everything on the card afterwards.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Event type" className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4">
          {LISTE_EVENEMENTS.map((e) => (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={false}
              onClick={() => choisirType(e.id)}
              className="flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors hover:border-primary hover:bg-muted/50"
            >
              <Image src={`/invitations/decorations/${e.icone}.svg`} alt="" width={48} height={48} unoptimized className="size-12" />
              <span className="text-sm font-semibold text-foreground">{e.label}</span>
              <span className="text-xs text-muted-foreground">{e.description}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{configEvenement(type).label} invitation</DialogTitle>
        <DialogDescription>Pick a template and the language of the card.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-1">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <FormField id="invitation-titre" label="Name" required error={erreur}>
            <Input id="invitation-titre" value={titre} maxLength={80} onChange={(e) => setTitre(e.target.value)} />
          </FormField>
          <FormField id="invitation-langue" label="Language">
            <Select value={langue} onValueChange={(v) => setLangue(v as Langue)}>
              <SelectTrigger id="invitation-langue" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUES.map((l) => (
                  <SelectItem key={l} value={l}>{langueLabels[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={templateId === template.id}
              onClick={() => setTemplateId(template.id)}
              className={cn(
                "flex flex-col rounded-lg border p-2 text-left transition-colors hover:bg-muted/50",
                templateId === template.id && "border-primary ring-2 ring-primary/30",
              )}
            >
              <InvitationApercu contenu={apercuTemplate(template, langue)} className="pointer-events-none overflow-hidden rounded" />
              <span className="mt-2 block text-sm font-semibold text-foreground">{template.nom}</span>
              <span className="block text-xs text-muted-foreground">{template.description}</span>
            </button>
          ))}
        </div>
      </div>
      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" onClick={() => setType(null)} disabled={pending}>
          <ArrowLeft aria-hidden />
          Other event
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={creer} disabled={pending || !templateId}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Create
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
