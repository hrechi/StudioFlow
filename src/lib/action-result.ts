/**
 * Every Server Action returns an ActionResult so forms can show a toast
 * (`error`) and inline field errors (`fieldErrors`) the same way.
 */
import type { ZodError } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

export function success<T>(data: T): ActionResult<T>;
export function success(): ActionResult<undefined>;
export function success<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function failure(
  error: string,
  fieldErrors?: FieldErrors,
): { ok: false; error: string; fieldErrors?: FieldErrors } {
  return { ok: false, error, fieldErrors };
}

export function validationFailure(error: ZodError): {
  ok: false;
  error: string;
  fieldErrors: FieldErrors;
} {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Some fields are invalid.", fieldErrors };
}

/** Expected business-rule failure thrown by services (shown to the user as-is). */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** Converts a thrown error into an ActionResult; unexpected errors are logged, not leaked. */
export function toFailure(error: unknown): { ok: false; error: string; fieldErrors?: FieldErrors } {
  if (error instanceof ServiceError) {
    return failure(error.message, error.field ? { [error.field]: [error.message] } : undefined);
  }
  console.error(error);
  return failure("An unexpected error occurred. Please try again.");
}
