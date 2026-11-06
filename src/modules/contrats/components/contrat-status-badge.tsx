import { StatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { statutAncrageConfig, statutContratConfig } from "../contrat.types";
import type { StatutAncrage, StatutContrat } from "../contrat.types";

export function ContratStatusBadge({ statut }: { statut: StatutContrat }) {
  return <StatusBadge value={statut} config={statutContratConfig} />;
}

export function AncrageStatusBadge({ statut }: { statut: StatutAncrage }) {
  const cfg = statutAncrageConfig[statut];
  return <ToneBadge tone={cfg.tone} label={cfg.label} />;
}
