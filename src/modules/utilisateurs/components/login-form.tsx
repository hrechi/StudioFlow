"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField, IconInput, PasswordInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { loginAction } from "../utilisateur.actions";
import { loginSchema, type LoginInput } from "../utilisateur.schemas";

const REASON_MESSAGES: Record<string, { tone: "error" | "info" | "warning"; text: string }> = {
  bloque: { tone: "error", text: "Account blocked, please contact the studio" },
  supprime: { tone: "info", text: "This account no longer exists." },
  role: { tone: "info", text: "Your access has changed: sign in again to continue." },
  session: { tone: "warning", text: "Your session has expired, please sign in again." },
};

export function LoginForm({ callbackUrl, raison }: { callbackUrl?: string; raison?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const reason = raison ? REASON_MESSAGES[raison] : undefined;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", motDePasse: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await loginAction(values, callbackUrl);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        setServerError(result.error);
        return;
      }
      toast.success("Signed in successfully");
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  });

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-charcoal">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to find your sessions, galleries and invoices.
        </p>
      </header>

      {serverError ? (
        <FormAlert>{serverError}</FormAlert>
      ) : (
        reason && <FormAlert tone={reason.tone}>{reason.text}</FormAlert>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormField id="email" label="Email" error={errors.email?.message}>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@example.com"
            invalid={!!errors.email}
            aria-describedby={describedBy("email", errors.email?.message)}
            {...form.register("email")}
          />
        </FormField>

        <FormField id="motDePasse" label="Password" error={errors.motDePasse?.message}>
          <PasswordInput
            id="motDePasse"
            icon={Lock}
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={!!errors.motDePasse}
            aria-describedby={describedBy("motDePasse", errors.motDePasse?.message)}
            {...form.register("motDePasse")}
          />
        </FormField>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary-text hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
