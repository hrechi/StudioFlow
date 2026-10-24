"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const errorMessage = error instanceof globalThis.Error ? error.message : undefined;
  const digest =
    error instanceof globalThis.Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined;

  return <ErrorState errorMessage={errorMessage} digest={digest} retry={retry} />;
}
