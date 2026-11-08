/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { Skeleton } from "@/components/ui/skeleton";

export default function Chargement() {
  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-busy="true" aria-label="Loading my day">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}
