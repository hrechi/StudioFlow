import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

type UserAvatarProps = {
  prenom?: string | null;
  nom?: string | null;
  photoProfil?: string | null;
  size?: "sm" | "default" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "size-7 text-[0.65rem]",
  default: "size-9 text-xs",
  lg: "size-11 text-sm",
  xl: "size-20 text-xl",
} as const;

/** Profile photo with initials fallback (photoProfil is any URL, so a plain <img> is used). */
export function UserAvatar({
  prenom,
  nom,
  photoProfil,
  size = "default",
  className,
}: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {photoProfil && <AvatarImage src={photoProfil} alt="" />}
      <AvatarFallback className="bg-accent font-semibold text-primary-text">
        {initials(prenom, nom)}
      </AvatarFallback>
    </Avatar>
  );
}
