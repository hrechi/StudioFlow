"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + inline error (or hint). The control should set aria-describedby via `describedBy(id)`. */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-slate">
        {label}
        {required && (
          <span aria-hidden className="text-destructive-text">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive-text">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hasHint = false): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

type IconInputProps = ComponentProps<typeof Input> & { icon?: LucideIcon; invalid?: boolean };

/** Input with an optional leading icon; `invalid` sets aria-invalid for the error ring. */
export function IconInput({ icon: Icon, invalid, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      )}
      <Input
        aria-invalid={invalid || undefined}
        className={cn("h-10 bg-white", Icon && "pl-9", className)}
        {...props}
      />
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordInput({ className, ...props }: Omit<IconInputProps, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <IconInput
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
