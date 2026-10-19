import {
  BookImage,
  CalendarClock,
  CalendarDays,
  Camera,
  FileText,
  GalleryHorizontalEnd,
  Images,
  LayoutDashboard,
  MapPin,
  MessageSquareWarning,
  Receipt,
  ScanSearch,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, type Area, type Role } from "@/lib/rbac";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  area: Area;
  /** AI feature: shown with the purple "AI" chip. */
  ai?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

/** Backoffice sidebar — one group per module, filtered by the permission matrix (lib/rbac.ts). */
export const BACKOFFICE_NAV: NavGroup[] = [
  {
    label: "General",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, area: "dashboard" }],
  },
  {
    label: "Sessions",
    items: [
      { label: "Sessions", href: "/dashboard/seances", icon: CalendarDays, area: "seances" },
      { label: "Locations", href: "/dashboard/lieux", icon: MapPin, area: "seances" },
    ],
  },
  {
    label: "Photos & Galleries",
    items: [
      { label: "Photo Library", href: "/dashboard/photos", icon: Images, area: "photos-galeries" },
      {
        label: "AI Search",
        href: "/dashboard/photos/recherche",
        icon: ScanSearch,
        area: "photos-galeries",
        ai: true,
      },
      {
        label: "Galleries",
        href: "/dashboard/galeries",
        icon: GalleryHorizontalEnd,
        area: "photos-galeries",
      },
    ],
  },
  {
    label: "Equipment",
    items: [
      { label: "Inventory", href: "/dashboard/materiel", icon: Camera, area: "materiel" },
      {
        label: "Reservations",
        href: "/dashboard/materiel/reservations",
        icon: CalendarClock,
        area: "materiel",
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        label: "Quotes",
        href: "/dashboard/facturation/devis",
        icon: FileText,
        area: "facturation",
      },
      {
        label: "Invoices",
        href: "/dashboard/facturation/factures",
        icon: Receipt,
        area: "facturation",
      },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { label: "Collections", href: "/dashboard/portfolio", icon: BookImage, area: "portfolio" },
    ],
  },
  {
    label: "Reviews & Complaints",
    items: [
      { label: "Client reviews", href: "/dashboard/avis", icon: Star, area: "avis-reclamations" },
      {
        label: "Complaints",
        href: "/dashboard/reclamations",
        icon: MessageSquareWarning,
        area: "avis-reclamations",
      },
    ],
  },
  {
    label: "Administration",
    items: [{ label: "Users", href: "/dashboard/utilisateurs", icon: Users, area: "utilisateurs" }],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return BACKOFFICE_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(role, item.area)),
  })).filter((group) => group.items.length > 0);
}

/**
 * The active item is the longest href that prefixes the current path.
 * Area roots ("/dashboard", "/espace-client") only match exactly, so the
 * overview item is not highlighted on /dashboard/profil.
 */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((href) => {
      const isRoot = href.split("/").filter(Boolean).length === 1;
      return pathname === href || (!isRoot && pathname.startsWith(`${href}/`));
    })
    .sort((a, b) => b.length - a.length)[0];
}

/** Breadcrumb labels for backoffice / client-area path segments. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "espace-client": "My account",
  seances: "Sessions",
  nouvelle: "New",
  nouveau: "New",
  reserver: "Book",
  lieux: "Locations",
  photos: "Photo Library",
  recherche: "AI Search",
  galeries: "Galleries",
  materiel: "Equipment",
  reservations: "Reservations",
  facturation: "Billing",
  devis: "Quotes",
  factures: "Invoices",
  portfolio: "Portfolio",
  avis: "Reviews",
  reclamations: "Complaints",
  utilisateurs: "Users",
  profil: "My profile",
  notifications: "Notifications",
  "acces-refuse": "Access denied",
};

/** Public site navigation (header + footer). */
export const PUBLIC_LINKS = [
  { label: "Home", href: "/" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Shared gallery", href: "/galerie" },
  { label: "Services", href: "/#services" },
  { label: "Reviews", href: "/#avis" },
  { label: "Contact", href: "/#contact" },
] as const;
