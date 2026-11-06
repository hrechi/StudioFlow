import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { ContratListItem } from "../contrat.types";
import { AncrageStatusBadge, ContratStatusBadge } from "./contrat-status-badge";

const MODE_LABELS = { CHAMPS: "Structured", LIBRE: "Free text", UPLOAD: "Uploaded PDF" };

export function ContratsList({
  contrats,
  basePath,
  showCreateButton = false,
}: {
  contrats: ContratListItem[];
  basePath: string;
  showCreateButton?: boolean;
}) {
  if (contrats.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No contracts yet"
        description="Contracts sent to clients will appear here."
        action={
          showCreateButton ? (
            <Button asChild size="sm">
              <Link href={`${basePath}/nouveau`}>
                <Plus className="size-4" aria-hidden />
                New contract
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {showCreateButton && (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`${basePath}/nouveau`}>
              <Plus className="size-4" aria-hidden />
              New contract
            </Link>
          </Button>
        </div>
      )}
      <div className="grid gap-3">
        {contrats.map((c) => (
          <Link key={c.id} href={`${basePath}/${c.id}`}>
            <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/40">
              <div className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                "bg-primary/10 text-primary-text",
              )}>
                <FileText className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{c.titre}</p>
                  <span className="text-xs text-muted-foreground font-mono">{c.reference}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.client.prenom} {c.client.nom} · {c.client.email}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {MODE_LABELS[c.modeCreation]} · {formatDate(new Date(c.createdAt))}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <ContratStatusBadge statut={c.statut} />
                {c.blockchain && (
                  <AncrageStatusBadge statut={c.blockchain.statut} />
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
