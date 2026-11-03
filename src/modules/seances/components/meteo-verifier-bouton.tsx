"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { verifierMeteoAction } from "../meteo.actions";

/** Runs the forecast check now (same job as the scheduled one). It only opens alerts. */
export function MeteoVerifierBouton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const verifier = () =>
    startTransition(async () => {
      const result = await verifierMeteoAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const r = result.data;
      if (r.desactive) {
        toast.info("The weather watch is turned off in the settings.");
        return;
      }
      const parts = [
        `${r.seancesVerifiees} session${r.seancesVerifiees === 1 ? "" : "s"} checked`,
        r.alertesCreees > 0 ? `${r.alertesCreees} new alert${r.alertesCreees === 1 ? "" : "s"}` : null,
        r.erreurs > 0 ? `${r.erreurs} forecast${r.erreurs === 1 ? "" : "s"} unavailable` : null,
        r.sansCoordonnees > 0 ? `${r.sansCoordonnees} without coordinates` : null,
      ].filter(Boolean);
      (r.erreurs > 0 ? toast.warning : toast.success)(parts.join(" · "));
      router.refresh();
    });

  return (
    <Button type="button" variant="outline" onClick={verifier} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
      Check forecasts now
    </Button>
  );
}
