"use client";

/* Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi */
import { Blocks, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Materiel } from "@/modules/materiel/materiel.types";
import { categorieMaterielLabels } from "@/modules/materiel/materiel.types";
import {
  checkAvailabilityAction,
  prepareAllocationAction,
  recordAllocationAction,
} from "../allocation.actions";
import { requestAllocationTx, walletErrorMessage } from "../blockchain.client";
import { TxHash } from "./tx-hash";
import { useWallet } from "./wallet-panel";

type SeanceOption = {
  id: string;
  titre: string;
  dateDebut: string;
  dateFin: string;
  clientNom: string;
};

/** ISO → value of an <input type="datetime-local"> (local time). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

type Availability = "idle" | "checking" | "available" | "taken" | "error";

type ChainState = "ok" | "not-registered" | "inactive" | "out-of-order";

/** Why an item can't be booked on-chain, whatever the dates. */
const CHAIN_STATE_LABEL: Record<Exclude<ChainState, "ok">, string> = {
  "not-registered": "not on the blockchain yet",
  inactive: "deactivated on the blockchain",
  "out-of-order": "out of order on the blockchain",
};

function formatPeriod(dateDebut: string, dateFin: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return `${fmt(dateDebut)} → ${fmt(dateFin)}`;
}

/** Allocate one item to a séance: availability is checked live on the contract before signing. */
export function AllocationForm({
  materiels,
  seances,
  isAdmin,
  hiddenSeances,
}: {
  /** Items with their state on the contract (null: Ganache could not be read). */
  materiels: { materiel: Materiel; chain: ChainState | null }[];
  seances: SeanceOption[];
  isAdmin: boolean;
  /** Upcoming séances not offered yet: still a client request, or postponed. */
  hiddenSeances: number;
}) {
  const router = useRouter();
  const { config, ready } = useWallet();
  const [materielId, setMaterielId] = useState("");
  const [seanceId, setSeanceId] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [availabilityError, setAvailabilityError] = useState("");
  const [takenReason, setTakenReason] = useState("");
  // Bookable items first; the others stay visible, greyed out, with the reason.
  const ordered = [...materiels].sort(
    (a, b) => Number(a.chain !== "ok") - Number(b.chain !== "ok"),
  );
  const bookable = materiels.filter((m) => m.chain === "ok").length;
  const [step, setStep] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const complete = !!materielId && !!seanceId && !!debut && !!fin;
  const validPeriod = complete && new Date(fin) > new Date(debut);

  // Live "available on the blockchain?" — debounced, re-run when the item or the period changes.
  useEffect(() => {
    if (!complete || !validPeriod) return;
    let alive = true;
    const timer = setTimeout(async () => {
      setAvailability("checking");
      const result = await checkAvailabilityAction({
        materielId,
        seanceId,
        dateDebut: new Date(debut).toISOString(),
        dateFin: new Date(fin).toISOString(),
      });
      if (!alive) return;
      if (result.ok) {
        const { available, reason, conflict } = result.data;
        setAvailability(available ? "available" : "taken");
        setTakenReason(
          reason === "overlap"
            ? conflict
              ? `Not available: already allocated ${formatPeriod(conflict.dateDebut, conflict.dateFin)}`
              : "Not available: already allocated during this period"
            : reason === "not-registered"
              ? isAdmin
                ? "Not available: this item isn't on the blockchain yet. Register it in Blockchain setup below."
                : "Not available: this item isn't on the blockchain yet. Ask the admin to register it."
              : reason === "inactive"
                ? "Not available: this item is deactivated on the blockchain"
                : reason === "out-of-order"
                  ? "Not available: this item is out of order on the blockchain"
                  : "Not available: the end must be after the start",
        );
      } else {
        setAvailability("error");
        setAvailabilityError(result.error);
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [complete, validPeriod, materielId, seanceId, debut, fin, isAdmin]);

  const pickSeance = (id: string) => {
    setSeanceId(id);
    const seance = seances.find((s) => s.id === id);
    if (seance) {
      setDebut(toLocalInput(seance.dateDebut));
      setFin(toLocalInput(seance.dateFin));
    }
  };

  const submit = () =>
    startTransition(async () => {
      const input = {
        materielId,
        seanceId,
        dateDebut: new Date(debut).toISOString(),
        dateFin: new Date(fin).toISOString(),
      };
      try {
        setStep("Checking…");
        const prepared = await prepareAllocationAction(input);
        if (!prepared.ok) throw new Error(prepared.error);

        setStep("Confirm in MetaMask…");
        const tx = await requestAllocationTx(config, {
          allocationId: prepared.data.allocationId,
          ...input,
        });

        setStep("Verifying on the blockchain…");
        const saved = await recordAllocationAction({
          allocationId: prepared.data.allocationId,
          txHash: tx.txHash,
          ...input,
        });
        if (!saved.ok) throw new Error(saved.error);

        toast.success("Equipment allocated on the blockchain", {
          description: <TxHash hash={tx.txHash} block={tx.blockNumber} />,
        });
        setMaterielId("");
        setAvailability("idle");
        router.refresh();
      } catch (error) {
        toast.error("Allocation not recorded", { description: walletErrorMessage(error).message });
      } finally {
        setStep(null);
      }
    });

  const shownAvailability = complete && validPeriod ? availability : "idle";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Blocks className="size-4 text-primary" aria-hidden />
          Allocate equipment
        </CardTitle>
        <CardDescription>
          Signed with MetaMask and recorded on the blockchain — nobody can change it afterwards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="alloc-materiel"
              label="Equipment"
              required
              hint={
                materiels.some((m) => m.chain !== null)
                  ? `${bookable} of ${materiels.length} items are on the blockchain and can be booked.${
                      bookable < materiels.length
                        ? isAdmin
                          ? " Register the others in Blockchain setup below."
                          : " The admin registers the others."
                        : ""
                    }`
                  : undefined
              }
            >
              <Select value={materielId} onValueChange={setMaterielId}>
                <SelectTrigger id="alloc-materiel" className="h-10 w-full bg-card">
                  <SelectValue placeholder="Choose an item" />
                </SelectTrigger>
                <SelectContent>
                  {ordered.map(({ materiel: m, chain }) => (
                    <SelectItem key={m.id} value={m.id} disabled={chain !== null && chain !== "ok"}>
                      {m.nom} · {categorieMaterielLabels[m.categorie]}
                      {chain && chain !== "ok" && (
                        <span className="text-muted-foreground"> — {CHAIN_STATE_LABEL[chain]}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              id="alloc-seance"
              label="Session"
              required
              hint={
                hiddenSeances > 0
                  ? `${hiddenSeances} upcoming session${hiddenSeances > 1 ? "s are" : " is"} not listed: still a client request ("Request received") or postponed. Confirm ${hiddenSeances > 1 ? "them" : "it"} in Sessions first.`
                  : undefined
              }
            >
              <Select value={seanceId} onValueChange={pickSeance}>
                <SelectTrigger id="alloc-seance" className="h-10 w-full bg-card">
                  <SelectValue
                    placeholder={seances.length ? "Choose a session" : "No upcoming session"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {seances.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.titre} · {s.clientNom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="alloc-debut" label="Start" required>
              <Input
                id="alloc-debut"
                type="datetime-local"
                className="h-10 bg-card"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
              />
            </FormField>
            <FormField
              id="alloc-fin"
              label="End"
              required
              error={debut && fin && !validPeriod ? "The end must be after the start" : undefined}
            >
              <Input
                id="alloc-fin"
                type="datetime-local"
                className="h-10 bg-card"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm" aria-live="polite">
              {shownAvailability === "checking" && (
                <>
                  <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
                  <span className="text-muted-foreground">Checking the blockchain…</span>
                </>
              )}
              {shownAvailability === "available" && (
                <>
                  <CheckCircle2 className="size-4 text-success" aria-hidden />
                  <span className="text-success-text">Available on the blockchain</span>
                </>
              )}
              {shownAvailability === "taken" && (
                <>
                  <XCircle className="size-4 text-destructive" aria-hidden />
                  <span className="text-destructive-text">{takenReason}</span>
                </>
              )}
              {shownAvailability === "error" && (
                <span className="text-destructive-text">{availabilityError}</span>
              )}
            </p>
            <Button
              type="submit"
              disabled={!ready || !validPeriod || shownAvailability !== "available" || isPending}
            >
              {isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Blocks aria-hidden />
              )}
              {step ?? "Allocate"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
