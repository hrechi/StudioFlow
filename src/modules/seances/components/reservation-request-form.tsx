"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { formatDateTime } from "@/lib/utils";

/**
 * TEMPORARY placeholder for the client booking form.
 * Step 4 replaces it with a real form (pack choice from the catalogue → pending request).
 */
export function ReservationRequestForm({ creneaux }: { creneaux: string[] }) {
  return (
    <Card className="space-y-4 p-6">
      <p className="text-sm text-muted-foreground">
        Online booking is coming soon. Suggested slots:
      </p>
      <ul className="list-disc pl-5 text-sm text-foreground">
        {creneaux.map((c) => (
          <li key={c}>{formatDateTime(c)}</li>
        ))}
      </ul>
      <Button onClick={() => comingSoon("Booking request")}>Send a request</Button>
    </Card>
  );
}
