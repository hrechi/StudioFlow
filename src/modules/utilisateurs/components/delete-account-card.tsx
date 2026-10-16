"use client";

import { Lock, ShieldAlert, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField, PasswordInput } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteOwnAccountAction } from "../utilisateur.actions";

/** Danger zone: delete my account (password required). Disabled for the last active admin. */
export function DeleteAccountCard({ isLastAdmin }: { isLastAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPassword("");
      setError(null);
    }
  };

  const onConfirm = () => {
    setError(null);
    startTransition(async () => {
      // On success the action signs out and redirects to "/".
      const result = await deleteOwnAccountAction({ motDePasse: password });
      if (result && !result.ok) setError(result.fieldErrors?.motDePasse?.[0] ?? result.error);
    });
  };

  return (
    <Card className="ring-destructive/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive-text">
          <ShieldAlert className="size-4" aria-hidden />
          Danger zone
        </CardTitle>
        <CardDescription>
          Deleting your account is permanent: your information and notifications will be erased.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLastAdmin && (
          <p className="rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning-text" role="note">
            You are the studio&apos;s last active administrator. Appoint another administrator first
            (Users → Change role) before deleting your account.
          </p>
        )}
        <Button variant="destructive-soft" disabled={isLastAdmin} onClick={() => setOpen(true)}>
          <Trash2 aria-hidden />
          Delete my account
        </Button>
      </CardContent>

      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        tone="destructive"
        title="Permanently delete your account?"
        description="This action cannot be undone. Enter your password to confirm."
        confirmLabel="Delete my account"
        pending={pending}
        confirmDisabled={!password}
        onConfirm={onConfirm}
      >
        <FormField id="delete-password" label="Password" error={error ?? undefined}>
          <PasswordInput
            id="delete-password"
            icon={Lock}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            invalid={!!error}
            aria-describedby={error ? "delete-password-error" : undefined}
            onKeyDown={(event) => {
              if (event.key === "Enter" && password && !pending) onConfirm();
            }}
          />
        </FormField>
      </ConfirmDialog>
    </Card>
  );
}
