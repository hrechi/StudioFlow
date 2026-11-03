"use client";

import { Ban, CheckCircle2, MoreHorizontal, Pencil, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActionResult } from "@/lib/action-result";
import { changeRoleAction, changeStatutAction, deleteUserAction } from "../utilisateur.actions";
import { ROLES, roleConfig, type Role, type UtilisateurDTO } from "../utilisateur.types";

type Pending = null | "block" | "delete";

/** Row actions in /dashboard/utilisateurs: edit, change role, block/unblock, delete. */
export function UserRowMenu({ user, isSelf }: { user: UtilisateurDTO; isSelf: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Pending>(null);
  const [pending, startTransition] = useTransition();
  const fullName = `${user.prenom} ${user.nom}`;

  const run = (action: () => Promise<ActionResult<unknown>>, message: string) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success(message);
        router.refresh();
      }
      setConfirm(null);
    });
  };

  const onRoleChange = (value: string) => {
    const role = value as Role;
    if (role === user.role) return;
    run(
      () => changeRoleAction({ id: user.id, role }),
      `${fullName}'s role: ${roleConfig[role].label}`,
    );
  };

  const blocked = user.statut === "BLOQUE";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${fullName}`}
            disabled={pending}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
            {fullName}
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/utilisateurs/${user.id}`}>
              <Pencil aria-hidden />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isSelf}>
              <Shield aria-hidden />
              Change role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuRadioGroup value={user.role} onValueChange={onRoleChange}>
                {ROLES.map((role) => (
                  <DropdownMenuRadioItem key={role} value={role}>
                    {roleConfig[role].label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {blocked ? (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={() =>
                run(
                  () => changeStatutAction({ id: user.id, statut: "ACTIF" }),
                  `${fullName}'s account unblocked`,
                )
              }
            >
              <CheckCircle2 aria-hidden />
              Unblock
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled={isSelf} onSelect={() => setConfirm("block")}>
              <Ban aria-hidden />
              Block
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isSelf}
            onSelect={() => setConfirm("delete")}
            className="text-destructive-text focus:bg-destructive/10 focus:text-destructive-text"
          >
            <Trash2 aria-hidden />
            Delete
          </DropdownMenuItem>
          {isSelf && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Manage your own account from “My profile”.
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirm === "block"}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone="destructive"
        title={`Block ${fullName}?`}
        description="This person won't be able to sign in while their account is blocked. You can unblock it at any time."
        confirmLabel="Block"
        pending={pending}
        onConfirm={() =>
          run(
            () => changeStatutAction({ id: user.id, statut: "BLOQUE" }),
            `${fullName}'s account blocked`,
          )
        }
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone="destructive"
        title={`Delete ${fullName}?`}
        description="The account and its notifications will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete permanently"
        pending={pending}
        onConfirm={() => run(() => deleteUserAction(user.id), `${fullName}'s account deleted`)}
      />
    </>
  );
}
