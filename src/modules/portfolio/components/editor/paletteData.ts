import {
  BarChart3,
  BookOpen,
  Briefcase,
  Camera,
  Images,
  Mail,
  MessageSquareQuote,
  Package,
  Scaling,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { TypeBloc } from "../../portfolio.types";
import { editorFr } from "./fr";

export type BlockGroup = {
  id: "OPENING" | "STORY" | "WORK" | "TRUST" | "CLOSING";
  name: string;
  types: TypeBloc[];
};

export const PALETTE_GROUPS: BlockGroup[] = [
  { id: "OPENING", name: editorFr.groups.OPENING, types: ["HERO"] },
  { id: "STORY", name: editorFr.groups.STORY, types: ["A_PROPOS"] },
  {
    id: "WORK",
    name: editorFr.groups.WORK,
    types: ["GALERIE", "COLLECTION", "CASE_STUDY", "AVANT_APRES", "VIDEO"],
  },
  {
    id: "TRUST",
    name: editorFr.groups.TRUST,
    types: ["TEMOIGNAGES", "SERVICES", "STATISTIQUES"],
  },
  { id: "CLOSING", name: editorFr.groups.CLOSING, types: ["CONTACT"] },
];

export const BLOCK_ICONS: Record<TypeBloc, LucideIcon> = {
  HERO: Camera,
  A_PROPOS: UserRound,
  GALERIE: Images,
  COLLECTION: Package,
  CASE_STUDY: BookOpen,
  AVANT_APRES: Scaling,
  VIDEO: Video,
  TEMOIGNAGES: MessageSquareQuote,
  SERVICES: Briefcase,
  STATISTIQUES: BarChart3,
  CONTACT: Mail,
};

