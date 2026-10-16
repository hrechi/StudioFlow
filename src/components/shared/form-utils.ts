import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { FieldErrors } from "@/lib/action-result";

/** Shows Server Action field errors inline in a react-hook-form form. */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: FieldErrors | undefined,
): boolean {
  if (!fieldErrors) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.length && field !== "_form") {
      setError(field as Path<T>, { type: "server", message: messages[0] });
      applied = true;
    }
  }
  return applied;
}
