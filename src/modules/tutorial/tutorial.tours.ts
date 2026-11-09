/**
 * Guided tour — what each user is walked through, by order of priority for their role, plus the
 * short tours triggered by an important notification (something the user has to do).
 *
 * Pure data, shared by the browser engine. Targets are CSS selectors (tried in order, the first
 * VISIBLE match wins), mostly the real navigation links, so other modules need no changes.
 */
import { can, type Area, type Role } from "@/lib/rbac";

export type TourTarget = {
  /** Candidates, in order: the first visible match is highlighted. */
  selectors?: string[];
  /** Or: a button / link whose text contains this (case-insensitive). */
  text?: string;
};

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** Nothing to point at: the card shows in the middle of the screen. */
  target?: TourTarget;
  /**
   * Page this step lives on. "Next" brings the user there first. A trailing "/*" accepts any
   * sub-page (e.g. one gallery): the user gets there by clicking the previous step's target.
   */
  path?: string;
  /** "Next" clicks the highlighted link/button for the user (the hand taps it). */
  click?: boolean;
  /** Staff tours: only for roles allowed in this area (lib/rbac.ts). */
  area?: Area;
};

export type Tour = { id: string; label: string; steps: TourStep[] };

// ── Targets shared by several steps ─────────────────────────────────────────

const nav = (href: string): TourTarget => ({
  // Sidebar (desktop), icon rail (tablet), client header: whichever is visible.
  selectors: [`aside a[href="${href}"]`, `header a[href="${href}"]`, `nav a[href="${href}"]`, `a[href="${href}"]`],
});
const BELL: TourTarget = { selectors: ['button[aria-label^="Notifications"]'] };
const PAGE_TITLE: TourTarget = { selectors: ["main h1", "h1"] };

// ── Client ──────────────────────────────────────────────────────────────────

const CLIENT_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to ReFrame 👋",
    body: "This short tour shows you the essentials of your account. Follow the hand: click where it points, or press Next and I'll do it for you.",
  },
  {
    id: "book",
    path: "/espace-client",
    target: { selectors: ['main a[href="/espace-client/seances/reserver"]', 'a[href="/espace-client/seances/reserver"]'] },
    title: "1. Book a session",
    body: "Everything starts here: choose a pack and a date, and the studio confirms your booking.",
  },
  {
    id: "sessions",
    target: nav("/espace-client/seances"),
    click: true,
    title: "2. Your sessions",
    body: "Follow each session: its date, its status and the weather forecast for outdoor shoots.",
  },
  {
    id: "galleries",
    target: nav("/espace-client/galeries"),
    click: true,
    title: "3. Your galleries",
    body: "After your session, your photos arrive here.",
  },
  {
    id: "gallery-open",
    path: "/espace-client/galeries",
    target: { selectors: ['main a[href^="/espace-client/galeries/"]'] },
    title: "Choose your photos",
    body: "Open a gallery, select your favourite photos and click Approve my selection. On galleries with a blockchain proof, you approve with MetaMask and the originals unlock.",
  },
  {
    id: "billing",
    target: nav("/espace-client/factures"),
    click: true,
    title: "4. Quotes & invoices",
    body: "Accept your quote, then pay your invoices online or upload a proof of payment.",
  },
  {
    id: "contracts",
    target: nav("/espace-client/contrats"),
    click: true,
    title: "5. Contracts",
    body: "Read and sign your contract. Its fingerprint is recorded on the blockchain, so nobody can change it afterwards.",
  },
  {
    id: "invitations",
    target: nav("/espace-client/invitations"),
    click: true,
    title: "6. Invitations",
    body: "Design and share invitations for your event once your invoice is paid.",
  },
  {
    id: "reviews",
    target: nav("/espace-client/avis"),
    click: true,
    title: "7. Reviews & complaints",
    body: "Tell the studio how it went, or report a problem: you can follow the answer here.",
  },
  {
    id: "bell",
    target: BELL,
    title: "8. Notifications",
    body: "The studio's news land here: gallery ready, quote to accept, delivery available… I'll also guide you when one of them needs an action from you.",
  },
  {
    id: "profile",
    // The profile link lives in the account menu (top right).
    target: { selectors: ['button[aria-label="Account menu"]', ...(nav("/espace-client/profil").selectors ?? [])] },
    title: "9. Your profile",
    body: "Your profile is in this menu: your details, your password and your blockchain wallet. Press Next to open it.",
  },
  {
    id: "wallet",
    path: "/espace-client/profil",
    target: { selectors: ['[data-tour="wallet-link"]'] },
    title: "Link your MetaMask wallet",
    body: "Galleries and contracts with a blockchain proof are signed with this wallet. Link it once with a free signature.",
  },
  {
    id: "toggle",
    path: "/espace-client/profil",
    target: { selectors: ['[data-tour="tutorial-toggle"]'] },
    title: "Replay this tour anytime",
    body: "The tour switches itself off now. Turn it back on here whenever you want to see it again.",
  },
];

// ── Staff (photographer, admin) — filtered by role ──────────────────────────

const STAFF_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to ReFrame 👋",
    body: "This tour walks you through the studio's main tools, in the order you'll use them. Follow the hand: click where it points, or press Next and I'll do it for you.",
  },
  {
    id: "dashboard",
    path: "/dashboard",
    target: nav("/dashboard"),
    title: "1. Dashboard",
    body: "Today at a glance: upcoming sessions, tasks and what needs your attention.",
  },
  {
    id: "sessions",
    area: "seances",
    target: nav("/dashboard/seances"),
    click: true,
    title: "2. Sessions",
    body: "Every shoot: client booking requests, confirmations, the team and the location.",
  },
  {
    id: "new-session",
    area: "catalogue", // admins create sessions
    path: "/dashboard/seances",
    target: { selectors: ['a[href="/dashboard/seances/nouveau"]'] },
    title: "Create a session",
    body: "Plan a session for a client, or review the requests clients send from their account.",
  },
  {
    id: "planning",
    area: "seances",
    target: nav("/dashboard/planning"),
    click: true,
    title: "3. Planning & tasks",
    body: "The calendar of the team, and the tasks to prepare each session (also under Tasks).",
  },
  {
    id: "galleries",
    area: "photos-galeries",
    target: nav("/dashboard/galeries"),
    click: true,
    title: "4. Galleries",
    body: "Import the photos, cull them (the AI helps), then share the gallery with the client.",
  },
  {
    id: "gallery-open",
    area: "photos-galeries",
    path: "/dashboard/galeries",
    target: { selectors: ['main a[href^="/dashboard/galeries/"]'] },
    title: "Inside a gallery",
    body: "Open a gallery to import photos, keep or reject them, and share it. Its Blockchain proof button seals the photos, then follows the client's selection and your delivery on-chain.",
  },
  {
    id: "editing",
    area: "photos-galeries",
    target: nav("/dashboard/photos/editeur"),
    click: true,
    title: "5. Photo Editing",
    body: "Retouch photos with filters, colors, crop and text, compare before / after, and apply the same edits to several photos at once.",
  },
  {
    id: "equipment",
    area: "materiel",
    target: nav("/dashboard/materiel/reservations"),
    click: true,
    title: "6. Equipment",
    body: "Reserve cameras, lenses and lights for your sessions, and record their return.",
  },
  {
    id: "allocation",
    area: "dashboard",
    target: nav("/dashboard/allocation"),
    click: true,
    title: "7. Blockchain allocation",
    body: "The same bookings, signed with MetaMask and recorded on a smart contract: a tamper-proof history of who used which equipment.",
  },
  {
    id: "allocation-wallet",
    area: "dashboard",
    path: "/dashboard/allocation",
    target: { text: "Connect MetaMask" },
    title: "Connect your wallet",
    body: "Connect MetaMask and link your wallet once. The admin registers the equipment and adds photographers as staff; then you allocate items to your sessions.",
  },
  {
    id: "billing",
    area: "facturation",
    target: nav("/dashboard/facturation/devis"),
    click: true,
    title: "8. Quotes & invoices",
    body: "Send quotes, turn accepted ones into invoices, and follow payments.",
  },
  {
    id: "contracts",
    area: "contrats",
    target: nav("/dashboard/contrats"),
    click: true,
    title: "9. Contracts",
    body: "Contracts are signed by the client and anchored on the blockchain, so anyone can verify them later.",
  },
  {
    id: "portfolio",
    area: "portfolio",
    target: nav("/dashboard/portfolio"),
    click: true,
    title: "10. Portfolio",
    body: "Publish your best work on the public site, with the clients' consent.",
  },
  {
    id: "reviews",
    area: "avis-reclamations",
    target: nav("/dashboard/avis"),
    click: true,
    title: "11. Reviews & complaints",
    body: "Answer client reviews and handle complaints (Complaints, just below).",
  },
  {
    id: "users",
    area: "utilisateurs",
    target: nav("/dashboard/utilisateurs"),
    click: true,
    title: "12. Users",
    body: "Create staff and client accounts, change roles, block an account.",
  },
  {
    id: "bell",
    target: BELL,
    title: "Notifications",
    body: "Booking requests, equipment returns, client replies… When one needs an action from you, I'll guide you to it.",
  },
  {
    id: "profile",
    target: { selectors: ['aside a[href="/dashboard/profil"]', 'a[href="/dashboard/profil"]'] },
    click: true,
    title: "Your profile",
    body: "Your details, your password and your blockchain wallet.",
  },
  {
    id: "toggle",
    path: "/dashboard/profil",
    target: { selectors: ['[data-tour="tutorial-toggle"]'] },
    title: "Replay this tour anytime",
    body: "The tour switches itself off now. Turn it back on here whenever you want to see it again.",
  },
];

/** "1. Sessions", "2. …": numbered after filtering, so a role never sees gaps. */
function numbered(steps: TourStep[]): TourStep[] {
  let n = 0;
  return steps.map((s) =>
    /^\d+\.\s/.test(s.title) ? { ...s, title: s.title.replace(/^\d+\./, `${++n}.`) } : s,
  );
}

export function tourForRole(role: Role): Tour {
  if (role === "CLIENT") return { id: "main", label: "Your account", steps: numbered(CLIENT_STEPS) };
  return {
    id: "main",
    label: role === "ADMIN" ? "The studio" : "Your studio tools",
    steps: numbered(STAFF_STEPS.filter((s) => !s.area || can(role, s.area))),
  };
}

// ── Notification-triggered tours ─────────────────────────────────────────────

export type TourNotification = { id: string; titre: string; message: string; lienCible?: string };

/**
 * An unread notification that asks the user to DO something starts a short tour to that action,
 * even when the main tour is off. Each notification is guided once.
 */
export function tourForNotification(n: TourNotification): Tour | null {
  const link = n.lienCible ?? "";
  const intro = (title: string): TourStep => ({
    id: "intro",
    title,
    body: `${n.message} Let me show you where to go.`,
  });
  const open = (title: string, body: string): TourStep => ({
    id: "open",
    target: { selectors: ['button[aria-label^="Notifications"]'] },
    title,
    body,
  });

  if (n.titre === "Link your wallet") {
    return {
      id: `notif:${n.id}`,
      label: "Action needed",
      steps: [
        intro("The studio needs your wallet 🔗"),
        { id: "go", path: "/espace-client/profil", target: { selectors: ['[data-tour="wallet-link"]'] }, title: "Link your MetaMask wallet", body: "Click Link my MetaMask wallet and sign the message (free, no transaction). Your gallery is then sealed for this wallet." },
      ],
    };
  }
  if (n.titre === "Your gallery is ready" && link) {
    return {
      id: `notif:${n.id}`,
      label: "Action needed",
      steps: [
        intro("Your gallery is ready 📸"),
        { id: "go", path: link, target: { text: "Approve my selection" }, title: "Choose, then approve", body: "Browse the photos, click Select on the ones you want, then Approve my selection. On a gallery with a blockchain proof, MetaMask asks you to sign." },
      ],
    };
  }
  if (n.titre === "Your photos are delivered" && link) {
    return {
      id: `notif:${n.id}`,
      label: "Action needed",
      steps: [
        intro("Your photos are delivered 🎉"),
        { id: "go", path: link, target: { text: "Download all" }, title: "Download your delivery", body: "Download the photos one by one or all at once. Then verify the file and confirm the reception below." },
      ],
    };
  }
  if (n.titre === "New quote") {
    return {
      id: `notif:${n.id}`,
      label: "Action needed",
      steps: [
        intro("A quote is waiting for you 📄"),
        { id: "go", path: link || "/espace-client/factures", target: { text: "Accept" }, title: "Accept your quote", body: "Check the details, then accept the quote: the studio then prepares your invoices." },
      ],
    };
  }
  if (n.titre === "Your invoices are ready") {
    return {
      id: `notif:${n.id}`,
      label: "Action needed",
      steps: [
        intro("Your invoice is ready 💳"),
        { id: "go", path: link || "/espace-client/factures", target: { text: "Pay" }, title: "Pay your invoice", body: "Pay online, or upload a proof if you paid by transfer, cheque or cash." },
      ],
    };
  }
  if (n.titre === "The studio replied to your complaint" && link) {
    return {
      id: `notif:${n.id}`,
      label: "Update",
      steps: [
        intro("The studio replied 💬"),
        { id: "go", path: link, target: PAGE_TITLE, title: "Read the answer", body: "The studio's reply is on this page. You can answer it here too." },
      ],
    };
  }
  if (n.titre === "Equipment return reminder") {
    return {
      id: `notif:${n.id}`,
      label: "Action needed",
      steps: [
        open("Equipment to bring back 📦", "An item is due back. Its reservation is in Equipment → Reservations."),
        { id: "go", path: "/dashboard/materiel/reservations", target: PAGE_TITLE, title: "Record the return", body: "Find the reservation and record the return, with the condition the item came back in." },
      ],
    };
  }
  return null;
}
