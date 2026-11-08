"use client";

/**
 * "Send": everything needed to get the digital invitation to the guests. The private link is
 * turned on here, the message is ready (in the language of the card) and each button opens the
 * app with it: WhatsApp, Messenger, Telegram, SMS, email, or the phone's own share sheet. A QR
 * code of the link can be downloaded, to print on a table card or show from a screen.
 */
import { Check, Copy, Download, ExternalLink, Globe, Link2Off, Loader2, Mail, MessageCircle, MessageSquare, Send, Share2, TriangleAlert } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { setPartageAction } from "../invitation.actions";
import { configEvenement } from "../invitation.evenements";
import { canauxEnvoi, messageEnvoi, type CanalEnvoi } from "../invitation.invite";
import { champsManquants } from "../invitation.linked";
import { matriceQr } from "../invitation.qr";
import type { ContenuInvitation } from "../invitation.schema";
import { partageHref } from "../invitation.types";

export type EtatPartage = { actif: boolean; token?: string };

const ICONES: Record<CanalEnvoi["id"], typeof Send> = { whatsapp: MessageCircle, messenger: MessageSquare, telegram: Send, sms: MessageSquare, email: Mail };
const COULEURS: Partial<Record<CanalEnvoi["id"], string>> = { whatsapp: "#1f9d55", messenger: "#0866ff", telegram: "#229ed9" };

export const lienPartage = (token: string | undefined) => (token && typeof window !== "undefined" ? `${window.location.origin}${partageHref(token)}` : "");

/** A sharp vector QR code of the link (same generator as the card). */
function QrLien({ lien }: { lien: string }) {
  const chemin = useMemo(() => {
    const m = matriceQr(lien);
    let d = "";
    for (let l = 0; l < m.taille; l += 1) for (let c = 0; c < m.taille; c += 1) if (m.noir(l, c)) d += `M${c + 4} ${l + 4}h1v1h-1z`;
    return { d, taille: m.taille + 8 };
  }, [lien]);

  const telecharger = () => {
    const m = matriceQr(lien);
    const cote = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = cote;
    canvas.height = cote;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pas = cote / (m.taille + 8);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cote, cote);
    ctx.fillStyle = "#111111";
    for (let l = 0; l < m.taille; l += 1) for (let c = 0; c < m.taille; c += 1) if (m.noir(l, c)) ctx.fillRect(Math.floor((c + 4) * pas), Math.floor((l + 4) * pas), Math.ceil(pas), Math.ceil(pas));
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "invitation-qr.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, "image/png");
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border p-3">
      <svg viewBox={`0 0 ${chemin.taille} ${chemin.taille}`} className="size-24 shrink-0 rounded-md bg-white" role="img" aria-label="QR code of the invitation link" shapeRendering="crispEdges">
        <path d={chemin.d} fill="#111111" />
      </svg>
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">QR code of the invitation</p>
        <p className="text-xs text-muted-foreground">Print it on a table card or a poster, or let a guest scan it from your screen.</p>
        <Button type="button" variant="outline" size="sm" onClick={telecharger}>
          <Download aria-hidden />
          Download (PNG)
        </Button>
      </div>
    </div>
  );
}

export function ContenuEnvoi({
  invitationId,
  contenu,
  partage,
  onPartage,
}: {
  invitationId: string;
  contenu: ContenuInvitation;
  partage: EtatPartage;
  onPartage: (partage: EtatPartage) => void;
}) {
  const [pending, start] = useTransition();
  const [copie, setCopie] = useState<"lien" | "message" | null>(null);
  const lien = partage.actif ? lienPartage(partage.token) : "";
  const [messageModifie, setMessage] = useState<string | null>(null);
  const message = messageModifie ?? (lien ? messageEnvoi(contenu, lien) : "");
  const local = typeof window !== "undefined" && /^(localhost|127\.)/.test(window.location.hostname);
  const reseauLocal = typeof window !== "undefined" && /^(192\.168\.|10\.)/.test(window.location.hostname);
  const manquants = Object.values(champsManquants(contenu.details, contenu.typeEvenement ?? "MARIAGE"));
  const sujet = configEvenement(contenu.typeEvenement ?? "MARIAGE").label;

  const basculer = (actif: boolean) =>
    start(async () => {
      const result = await setPartageAction(invitationId, actif);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onPartage({ actif: result.data.actif, token: result.data.token });
      if (result.data.actif) toast.success("Your invitation link is on", { description: "Send it to your guests with the buttons below." });
    });

  const copier = async (quoi: "lien" | "message") => {
    try {
      await navigator.clipboard.writeText(quoi === "lien" ? lien : message);
      setCopie(quoi);
      setTimeout(() => setCopie(null), 1500);
    } catch {
      toast.error("Copy is blocked by the browser: select the text and copy it yourself.");
    }
  };

  const partagerNatif = async () => {
    await navigator.share?.({ title: sujet, text: message.replace(lien, "").trim(), url: lien }).catch(() => undefined);
  };

  if (!partage.actif) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-muted/60 p-4">
          <Globe className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">Your invitation gets its own private link</p>
            <p className="text-muted-foreground">
              Guests open it on their phone without an account: the animated card, a countdown, the map to the venue and the buttons to reply.
              Nobody can find it without the link, and you can turn it off at any time.
            </p>
          </div>
        </div>
        {manquants.length > 0 && <Manquants liste={manquants} />}
        <Button className="h-12 w-full text-base" onClick={() => basculer(true)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Turn on the link and send
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {manquants.length > 0 && <Manquants liste={manquants} />}
      {(local || reseauLocal) && (
        <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {local
            ? "You are on localhost: this link only opens on this computer. Guests can open it once the site is online (or from a phone on the same Wi-Fi with the computer's address)."
            : "This link works for phones on the same Wi-Fi as this computer. It works for everyone once the site is online."}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="lien-invitation">Invitation link</Label>
        <div className="flex gap-2">
          <Input id="lien-invitation" readOnly value={lien} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
          <Button type="button" variant="outline" size="icon" aria-label="Copy the link" onClick={() => void copier("lien")}>
            {copie === "lien" ? <Check aria-hidden /> : <Copy aria-hidden />}
          </Button>
          <Button type="button" variant="outline" size="icon" asChild>
            <a href={lien} target="_blank" rel="noopener noreferrer" aria-label="Open the guest page">
              <ExternalLink aria-hidden />
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="message-envoi">Message</Label>
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => void copier("message")}>
            {copie === "message" ? <Check aria-hidden /> : <Copy aria-hidden />}
            Copy the message
          </Button>
        </div>
        <Textarea id="message-envoi" rows={3} dir="auto" value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
      </div>

      {typeof navigator !== "undefined" && "share" in navigator && (
        <Button type="button" className="h-12 w-full text-base" onClick={() => void partagerNatif()}>
          <Share2 aria-hidden />
          Share…
        </Button>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {canauxEnvoi(message, lien, sujet).map((canal) => {
          const Icon = ICONES[canal.id];
          const couleur = COULEURS[canal.id];
          return (
            <Button key={canal.id} asChild variant={couleur ? "default" : "outline"} className="h-11" style={couleur ? { background: couleur, color: "#fff" } : undefined}>
              <a href={canal.href} target={canal.id === "sms" || canal.id === "email" || canal.id === "messenger" ? undefined : "_blank"} rel="noopener noreferrer">
                <Icon aria-hidden />
                {canal.label}
              </a>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Messenger opens on phones with the app installed. Each guest sees the same link: send it in a group or one by one.</p>

      <QrLien lien={lien} />

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <div>
          <Label htmlFor="partage-actif" className="flex items-center gap-1.5">
            <Link2Off className="size-3.5" aria-hidden />
            Link turned on
          </Label>
          <p className="text-xs text-muted-foreground">Turn it off to stop the card opening. The same link works again if you turn it back on.</p>
        </div>
        <Switch id="partage-actif" checked={partage.actif} onCheckedChange={basculer} disabled={pending} />
      </div>
    </div>
  );
}

function Manquants({ liste }: { liste: string[] }) {
  return (
    <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">Before sending, check the details:</p>
        <ul className="mt-0.5 list-disc pl-4">
          {liste.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DialogEnvoi({
  open,
  onOpenChange,
  ...props
}: Parameters<typeof ContenuEnvoi>[0] & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5" aria-hidden />
            Send the invitation
          </DialogTitle>
          <DialogDescription>Your guests open the animated card from a private link, on any phone.</DialogDescription>
        </DialogHeader>
        <ContenuEnvoi {...props} />
      </DialogContent>
    </Dialog>
  );
}
