# StudioFlow: Phase 1 prompt for Claude Code

> **Before running this prompt**, put these files in the empty project folder:
> - `docs/StudioFlow_Cahier_de_Specification.pdf`: the specification document (modules, actors, class diagram, architecture)
> - `docs/StudioFlow_Graphic_Charter_UI_UX.md`: the graphic charter
> - `docs/screens/`: the 4 UI screenshots from page 21 of the cahier (Dashboard, Photo Library, AI Search, Project Manager), as larger separate PNGs (from `StudioFlow_screens.zip`)
> - `public/logo.svg` and `public/logo-icon.svg` if you have the logo files
>
> Then paste everything below the line into Claude Code.

---

You are building **StudioFlow**, an AI-powered management platform for photography studios. It is a university group project (Esprit School of Engineering) with 6 developers. Each developer owns one module. I own the setup and the core module, and I'm starting from an empty folder.

**This session has a limited scope (Phase 1):**
1. Create the whole project foundation.
2. Fully implement **Gestion des Utilisateurs**: authentication, sign up, sign in, profile, account deletion, user CRUD, role management and redirection.
3. Connect the app to my local **MongoDB**, which I inspect with **MongoDB Compass**.
4. Build **UI templates only, with mock data** for every page of the other 6 modules, so each teammate finds their pages ready to wire up.

**Do NOT implement** models, API routes, services or business logic for the other 6 modules. Their pages are visual templates with typed mock data.

## 0. Read the references first

1. Read `docs/StudioFlow_Cahier_de_Specification.pdf`. The important parts are:
   - section 1.5 (the 7 modules)
   - 2.1 (functional requirements)
   - 2.3 (actors)
   - 2.4 (team)
   - 3.1 (graphic charter and UI screenshots)
   - section 04 (stack, architecture, class diagram, MongoDB modeling)
2. Read `docs/StudioFlow_Graphic_Charter_UI_UX.md`. It is the design system: colors, typography, components, layout, AI visual language.
3. Look at every image in `docs/screens/`. They are a **design reference for the backoffice only**:
   - dark sidebar, light content area
   - blue accents, purple only for AI
   - cards with soft borders, status badges
   - spacing and typography

   Reproduce that look, without copying them pixel for pixel.
4. **Important: the screenshots and parts of the graphic charter come from an older version of the project with different modules.** Take only their **visual design** from them, never their content or naming:
   - **Ignore the old names everywhere:** "Projects", "Project Manager", "Clients", "Team", "Team & Resources", "AI Editing Lab", "Employees", "Tasks", "New Project", "Active Projects", "Sunset Studios", and so on. These names must **not** appear anywhere in the project: not in folder or file names, routes, components, types, variables, sidebar labels, page titles or mock data.
   - **Ignore the charter's navigation (§11) and its suggested routes (§13).** Use only the 7 final modules, routes and French labels defined in this prompt.
   - **Reuse only the layout patterns of the screenshots**, applied to the new modules:
     - The **Dashboard** screenshot → the layout of `/dashboard`, filled with this prompt's stat cards and lists (séances, galeries, factures, réclamations).
     - The **Photo Library** screenshot → the layout of `/dashboard/photos`.
     - The **AI Search** screenshot → the layout of `/dashboard/photos/recherche`.
     - The **Project Manager** screenshot (header, stat cards, tabs, table with progress bars) → a layout pattern for list and detail pages such as `/dashboard/seances` and `/dashboard/seances/[id]`. Nothing in the project is called "project".
5. **The screenshots only cover the backoffice.** There is no reference for the **front office**, which includes the public site, the sign-in and sign-up pages, and the client area. Design these yourself (see section 7). Make them elegant and visually distinct from the backoffice, while still following the graphic charter's colors, typography, icons and component rules.

Then show me a short plan (folder tree + list of routes) and wait for my OK before writing code.

## 1. Tech stack (fixed, do not change)

| Concern | Choice |
|---|---|
| Framework | **Next.js** (latest stable, App Router, `src/` directory), React, **TypeScript** (strict). Next.js is both the frontend and the backend. |
| Styling | **Tailwind CSS** + **shadcn/ui**, themed with the charter tokens |
| Icons | **lucide-react** |
| Font | **Plus Jakarta Sans** via `next/font/google` |
| Database | **MongoDB** (local server), accessed through **Mongoose** |
| Validation | **Zod** (shared schemas used by forms and server actions) |
| Forms | react-hook-form + `@hookform/resolvers/zod` |
| Auth | **Auth.js (NextAuth v5)** with the Credentials provider, JWT session strategy, passwords hashed with **bcryptjs** |
| Toasts | sonner (shadcn) |

## 2. Architecture: modular monolith

Use **one Next.js app**, split into one module per gestion. Inside each module, code follows these layers: **UI → Server Actions / Route Handlers → service → Mongoose model**. A page never imports a model directly.

```
src/
├── app/
│   ├── (public)/                  # Front office, visitors
│   │   ├── page.tsx               # Landing page
│   │   └── portfolio/             # Public portfolio (template)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (client)/espace-client/    # Front office, logged-in CLIENT
│   ├── (backoffice)/dashboard/    # Backoffice, ADMIN / PHOTOGRAPHE / RETOUCHEUR
│   ├── api/auth/[...nextauth]/route.ts
│   └── layout.tsx
├── modules/
│   ├── utilisateurs/              # FULLY IMPLEMENTED this session
│   │   ├── utilisateur.model.ts
│   │   ├── notification.model.ts
│   │   ├── utilisateur.service.ts
│   │   ├── utilisateur.schemas.ts # Zod
│   │   ├── utilisateur.actions.ts # Server Actions
│   │   └── components/
│   ├── seances/                   # templates + mock data only
│   ├── photos-galeries/
│   ├── materiel/
│   ├── facturation/
│   ├── portfolio/
│   └── avis-reclamations/
├── lib/
│   ├── db.ts                      # Cached Mongoose connection (safe for dev hot reload)
│   ├── auth.ts                    # Auth.js config
│   ├── rbac.ts                    # Roles, permissions, requireRole(), homeForRole()
│   └── utils.ts
├── components/
│   ├── ui/                        # shadcn components
│   ├── layout/                    # BackofficeShell, FrontofficeHeader, Footer, Sidebar, Topbar
│   └── shared/                    # PageHeader, StatCard, StatusBadge, AIBadge, EmptyState, DataTable, ConfirmDialog
└── types/
```

Each template module folder contains `components/` and a `mock-data.ts` with **TypeScript types that match the class diagram** (section 3 below). That way, my teammates only have to replace the mock data with real services.

## 3. Data model (from the class diagram)

### Implement now (Gestion des Utilisateurs)

**Utilisateur** (collection `utilisateurs`)
- `nom`, `prenom`: string, required
- `email`: string, required, unique, lowercase
- `motDePasse`: string, hashed, `select: false`
- `telephone?`, `adresse?`, `photoProfil?` (URL string)
- `role`: enum `ADMIN | PHOTOGRAPHE | RETOUCHEUR | CLIENT`, default `CLIENT`
- `typeClient?`: enum `PARTICULIER | ENTREPRISE` (clients only)
- `entreprise?`: string (clients only)
- `specialite?`: string (staff only)
- `statut`: enum `ACTIF | BLOQUE`, default `ACTIF`
- `derniereConnexion?`: Date
- timestamps (`createdAt` = dateCreation)

**Notification** (collection `notifications`)
- `utilisateur`: ObjectId → Utilisateur, indexed
- `titre`, `message`
- `type`: enum `SYSTEME | COMPTE | SEANCE | GALERIE | FACTURATION | RECLAMATION`
- `estLue`: boolean, default false
- `lienCible?`
- timestamps

### Types only, for the mock data (do not create Mongoose models)

- `Seance`, `Lieu` (Séances)
- `Photo`, `Galerie` (Photos & Galeries)
- `Materiel`, `Reservation` (Matériel)
- `Devis`, `Facture` with embedded invoices (Facturation)
- `Portfolio`, `ElementPortfolio` with embedded items (Portfolio)
- `Avis`, `Reclamation` (Avis & Réclamations)

Take their attributes and enums from section 4.3/4.4 of the cahier, for example:
- `StatutSeance`: PLANIFIEE / CONFIRMEE / TERMINEE / ANNULEE
- `StatutGalerie`: EN_TRI / PARTAGEE / VALIDEE / LIVREE
- `StatutFacture`: EN_ATTENTE / PARTIELLEMENT_PAYEE / PAYEE / EN_RETARD
- `Sentiment`: POSITIF / NEUTRE / NEGATIF
- `StatutReclamation`: OUVERTE / EN_COURS / RESOLUE / REJETEE

## 4. MongoDB connection (local + Compass)

- Use `.env.local`:
  ```
  MONGODB_URI=mongodb://127.0.0.1:27017/studioflow
  AUTH_SECRET=<generate with: npx auth secret>
  ADMIN_EMAIL=admin@studioflow.tn
  ADMIN_PASSWORD=<choose>
  ```
- Also create `.env.example` without secrets, and make sure `.env.local` is in `.gitignore`.
- `lib/db.ts` caches the connection on `globalThis` so dev hot reload doesn't open new connections.
- Add a seed script, `npm run seed:admin` (with `tsx`), that creates the first ADMIN from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if none exists. Staff accounts are created by the admin, never through public sign-up.
- In the README, explain how to set things up:
  1. MongoDB Community Server must be running locally (Compass is only the viewer).
  2. Connect Compass to `mongodb://127.0.0.1:27017`.
  3. The `studioflow` database and its `utilisateurs` / `notifications` collections appear after the first sign-up or seed.

## 5. Authentication and role-based redirection

### Sign up (`/register`)
- **Fields:** prenom, nom, email, telephone (optional), typeClient (particulier / entreprise; show `entreprise` when ENTREPRISE), password, confirm password, accept terms.
- **Public sign-up always creates a `CLIENT`.** The role is set on the server and never comes from the form.
- **Password rules:** at least 8 characters, with a letter and a digit. Hash it with bcrypt (cost 12).
- Duplicate email → show a clear field error.
- On success: create a welcome Notification, sign the user in, then redirect.

### Sign in (`/login`)
- Email + password, plus a link to sign up.
- Show the error "Email ou mot de passe incorrect" without revealing which part is wrong.
- A `BLOQUE` user cannot sign in. Show "Compte bloqué, contactez le studio".
- Update `derniereConnexion` on every successful sign-in.

### Session
- The JWT/session contains `id`, `role`, `nom`, `prenom`, `photoProfil`.
- Extend the Auth.js types.

### Redirection after login: `homeForRole(role)`
| Role | Goes to |
|---|---|
| ADMIN, PHOTOGRAPHE, RETOUCHEUR | **Backoffice** `/dashboard` |
| CLIENT | **Front office** `/espace-client` |
| Not logged in | Public front office `/` |

If a `callbackUrl` exists and the role is allowed there, go to it instead.

### Route protection
Use the route-protection file convention of the installed Next.js version (`middleware.ts` or `proxy.ts`):
- `/dashboard/**` → staff roles only; a CLIENT is redirected to `/espace-client`.
- `/dashboard/utilisateurs/**` → ADMIN only.
- `/espace-client/**` → CLIENT only; staff are redirected to `/dashboard`.
- `/login` and `/register` → already-logged-in users are redirected to their home.

**Also check roles on the server:** every Server Action and protected page calls `requireRole(...)` from `lib/rbac.ts`. Hiding a button is not security.

### Permissions matrix
Define it in `lib/rbac.ts` and use it to build the sidebar:

| Area | ADMIN | PHOTOGRAPHE | RETOUCHEUR | CLIENT |
|---|---|---|---|---|
| Dashboard overview | ✔ | ✔ | ✔ | |
| Séances, Lieux | ✔ | ✔ (own sessions) | | own (front office) |
| Photos & Galeries | ✔ | ✔ | ✔ | own galleries (front office) |
| Matériel | ✔ | ✔ (reserve) | | |
| Facturation | ✔ | | | own quotes/invoices (front office) |
| Portfolio management | ✔ | ✔ | ✔ | |
| Avis & Réclamations | ✔ | | | own (front office) |
| Utilisateurs & rôles | ✔ | | | |
| Profile | ✔ | ✔ | ✔ | ✔ |

## 6. Gestion des Utilisateurs (implement completely)

### Profile (every role)
- **Backoffice:** `/dashboard/profil`. **Front office:** `/espace-client/profil`. Both use the same shared components.
- **View and edit:** nom, prenom, telephone, adresse, photo (URL field + avatar preview for now; Cloudinary upload comes later). Clients can also edit typeClient and entreprise; staff can edit specialite.
- **Email:** read-only.
- **Change password:** current password + new password + confirmation.
- **Delete my account** (danger zone):
  - Shown in a confirmation dialog where the user must type their password.
  - Deletes the user and their notifications, then signs out and redirects to `/`.
  - The **last remaining ADMIN cannot delete their own account**; show a clear explanation.

### User management, backoffice (ADMIN only): `/dashboard/utilisateurs`
- **Table:** avatar, full name, email, role badge, statut badge, last login, created date.
- Search by name/email, filter by role and statut, pagination (server side).
- **Create a user** (`/dashboard/utilisateurs/nouveau`): the admin chooses any role, so this is how staff accounts are created.
- **Edit a user** (`/dashboard/utilisateurs/[id]`): all profile fields + **role** + **statut**.
- **Change role / block / unblock** directly from the table row menu.
- **Delete a user** with a confirmation dialog.
- **Guards:** an admin cannot block, demote or delete themselves; the last ADMIN cannot be removed or demoted.
- **Notifications:** create one when a user's role or statut changes.

### Notifications (core, minimal)
- Bell icon in the top bar with an unread count and a dropdown of the latest 5 notifications.
- "Mark all as read" button.
- `/dashboard/notifications` and `/espace-client/notifications` list pages.

## 7. Layouts

### Backoffice shell
Follows the screenshots and charter §8:
- **Dark sidebar:**
  - Charcoal `#0B0F14` / slate `#1F2937`.
  - Logo at the top.
  - **Permission-aware** nav items, grouped by module, with lucide icons.
  - Active item in blue `#3B82F6`.
  - User card at the bottom.
- **Top bar:** page title / breadcrumb, global search field (visual only), notification bell, user menu (Profil, Déconnexion).
- **Content:** light background, with a `PageHeader` (title + primary action) and cards.
- **Responsive:** collapsible sidebar on tablet, drawer on mobile.

### Front office: your own design

There is no screenshot for the front office, so **design it yourself**. Aim for an elegant, premium photography-studio website, not a copy of the dashboard. The graphic charter still applies for:
- colors: charcoal/slate neutrals, primary blue for calls to action, purple only for AI
- Plus Jakarta Sans
- lucide icons
- button and form styles
- accessibility

**Direction:**
- **Photography-led:** large, full-bleed imagery; generous whitespace; refined typography with large headings and confident hierarchy. Use a mostly light theme, with charcoal sections for contrast (for example a dark hero or a dark portfolio band).
- **Tasteful motion only:** subtle fade/slide-in on scroll, image hover zoom, smooth transitions. Respect `prefers-reduced-motion`.
- **Mock images:** neutral placeholder photos from a free source, served through `next/image`. Configure `images.remotePatterns` for the chosen source. Also provide a local placeholder fallback.
- **Header:**
  - Transparent over the hero, turning solid on scroll.
  - Logo; links (Accueil, Portfolio, Services, Avis, Contact).
  - "Se connecter" (ghost button) and "Créer un compte" (primary button).
  - When a client is logged in, show "Mon espace" and an avatar menu (Mon espace, Profil, **Se déconnecter**) instead.
  - Mobile: menu drawer.
- **Footer:** charcoal, with logo, short description, links, contact info and social icons.

**Sign-in and sign-up pages (`/login`, `/register`): make them a highlight.**
- Split-screen layout:
  - One side: a large photography image with a dark gradient overlay, the logo, the tagline, and a short line about the studio.
  - Other side: a clean, centered form card.
- Mobile: the image becomes a slim top banner.
- Polished form details:
  - labeled inputs with icons
  - show/hide password toggle
  - password strength hint on sign-up
  - inline Zod error messages
  - loading state on the submit button
  - a link to switch between sign-in and sign-up
  - "Retour au site" link
- **Sign-out:**
  - Available from the avatar menu in both the front office and the backoffice.
  - Asks for confirmation only if needed (keep it one click).
  - Returns to `/` with a toast "Vous êtes déconnecté".

**Client area (`/espace-client`):** a calm, light dashboard that is clearly part of the front office, not the backoffice.
- Light top navigation or a light sidebar: Aperçu, Mes séances, Mes galeries, Devis & factures, Avis & réclamations, Profil.
- Welcoming header ("Bonjour, {prénom}").
- Cards with soft shadows.
- Photo-first gallery cards.

### Design tokens
Map the charter colors to the Tailwind/shadcn CSS variables:
- primary `#3B82F6`, success `#10B981`, warning `#F59E0B`, destructive `#EF4444`, AI `#8B5CF6`.
- Charcoal/Slate/Gray/Light gray as neutrals.

Shared components:
- `StatusBadge`: one color mapping per enum.
- `AIBadge`: purple, sparkles icon, label "IA".
- `EmptyState`, skeleton loaders and `ConfirmDialog`.

Every page must have **loading, empty and error states**.

## 8. Page templates for the other modules (UI + mock data only)

Build each page with realistic French mock data, using the module's types. Mark AI elements with `AIBadge` and purple accents. Put a small "Module : Gestion des … · Responsable : …" note in a code comment at the top of each page so each teammate finds their files. Buttons that would need backend logic show a toast "Fonctionnalité à venir".

### Dashboard home: `/dashboard`
Adapt it to the role:
- **Stat cards:** sessions this week, photos waiting for culling, unpaid invoices, open complaints.
- Upcoming sessions list.
- Recent galleries with status.
- **AI insights panel**, in purple.
- **Quick actions:** "Nouvelle séance", "Importer des photos".

### Gestion des Séances (owner: Yosser Rafrafi)
- **Backoffice:**
  - `/dashboard/seances`: calendar view + list toggle, filters by status/type/photographer.
  - `/dashboard/seances/nouvelle`: form with an **AI-suggested time slot** card.
  - `/dashboard/seances/[id]`: based on the **Project Manager** screenshot. Header with status, client and photographer; tabs Aperçu / Matériel / Galerie / Facturation; timeline.
  - `/dashboard/lieux`: locations table + availability.
- **Front office:**
  - `/espace-client/seances`: my sessions.
  - `/espace-client/seances/reserver`: request a session.

### Gestion des Photos & Galeries (owner: Louay Herichi)
- **Backoffice:**
  - `/dashboard/photos`: based on the **Photo Library** screenshot. Upload button + dropzone, filters (gallery, date, tags, quality, AI status), a responsive grid with selection checkboxes and bulk actions, AI labels (floue, doublon, score), and a detail side panel.
  - `/dashboard/photos/recherche`: based on the **AI Search** screenshot. Natural-language search bar and results grid.
  - `/dashboard/galeries`: galleries list with status EN_TRI → PARTAGEE → VALIDEE → LIVREE.
  - `/dashboard/galeries/[id]`: culling view (kept/rejected/pending), share settings (link, password, expiry), client selection summary.
- **Front office:**
  - `/espace-client/galeries`: my galleries.
  - `/espace-client/galeries/[id]`: the client gallery (charter screen 3). Large preview + thumbnail strip; tabs Galerie / Favoris / Sélection / Commentaires; favorite toggle; comment box; AI recommendations panel; "Valider ma sélection" button and download.

### Gestion du Matériel (owner: Amel Mediouni)
- `/dashboard/materiel`: inventory table (category, brand, model, condition badge, availability), filters.
- `/dashboard/materiel/[id]`: details + reservation history.
- `/dashboard/materiel/reservations`: reservations calendar/list, return form, "signaler une panne", AI-suggested kit card.

### Gestion de la Facturation (owner: Aya Flah)
- **Backoffice:**
  - `/dashboard/facturation/devis`: quotes list.
  - `/dashboard/facturation/devis/nouveau`: services lines, HT/TVA/TTC totals, "Générer avec l'IA" button.
  - `/dashboard/facturation/factures`: invoices (ACOMPTE/SOLDE) with payment status, record a payment dialog, AI late-payment risk badge.
- **Front office:**
  - `/espace-client/factures`: my quotes (accept/refuse) and invoices (amount paid / remaining).

### Gestion du Portfolio (owner: Anas Ben Ibrahim)
- **Backoffice:**
  - `/dashboard/portfolio`: collections grid.
  - `/dashboard/portfolio/[id]`: ordered items with drag handles, featured toggle, caption field with "Légende IA", client consent indicator, publish toggle, "Sélection IA des meilleures photos" panel.
- **Public front office:**
  - `/portfolio`: categories.
  - `/portfolio/[slug]`: masonry gallery and lightbox.

### Gestion des Avis & Réclamations (owner: Mohamed Yessine Nahdi)
- **Backoffice:**
  - `/dashboard/avis`: reviews list with stars, **AI sentiment badge**, reply + publish.
  - `/dashboard/reclamations`: complaints table with category, AI category, priority, status, and a detail drawer to take charge / answer / resolve / reject.
- **Front office:**
  - `/espace-client/avis`: rate a completed session, file a complaint, follow its status.
  - Published reviews are shown on the landing page.

### Front office public pages
- `/`: landing page with:
  - A hero with a photography image and the tagline "AI-Powered Operating System for Photography Studios" (adapted for the studio's clients).
  - Services: mariage, portrait, produit, événement.
  - Portfolio preview.
  - Client reviews.
  - Call to action "Réserver une séance", which goes to `/register` or to `/espace-client/seances/reserver`.
- `/espace-client`: overview with next session, latest gallery, unpaid invoice, and quick links.

## 9. Conventions

- **UI language: French.** Code identifiers in English, except the domain entities, which keep the class diagram names (Utilisateur, Seance, Galerie...).
- **Server Actions** return `{ ok: true, data } | { ok: false, error, fieldErrors? }`.
- **Validation:** Zod on both client and server.
- **Reuse:** no duplicated UI; reuse the shared components.
- **Code quality:** ESLint + Prettier configured; no `any`.
- **Accessibility:** labels on every input, visible focus states, AA contrast.
- **README** covering:
  - setup
  - environment variables
  - MongoDB + Compass
  - seed admin
  - scripts
  - folder structure
  - the module ownership table
  - how a teammate should replace mock data with a real model/service in their module

## 10. Definition of done for this session

1. `npm run dev` starts with no errors or type errors (`npm run build` passes).
2. `npm run seed:admin` creates the admin; I can see it in Compass in `studioflow.utilisateurs`, with a hashed password.
3. **Sign-up flow:** signing up on `/register` creates a CLIENT (visible in Compass) and lands on `/espace-client`.
4. **Staff login:** the admin logs in and lands on `/dashboard`. A PHOTOGRAPHE or RETOUCHEUR created by the admin also lands on `/dashboard`, with a sidebar limited to their permissions.
5. **Route protection:** a CLIENT who types `/dashboard` in the URL is redirected to `/espace-client`; a non-admin typing `/dashboard/utilisateurs` is refused.
6. **Profile:** editing the profile, changing the password, and deleting my own account all work. Deletion is blocked for the last admin.
7. **Admin user CRUD:** list, search, filter, create, edit, change role, block/unblock and delete all work, with all the guards. A blocked user cannot log in.
8. **Notifications:** the bell shows real notifications from MongoDB.
9. **Templates:** every template page listed in section 8 renders with mock data, in both the backoffice and the front office, and looks consistent with the screenshots and the graphic charter.
10. **No old module names:** a project-wide search for `project`, `Project`, `team`, `Team`, `employee`, `task` and `editing-lab` (in code, routes, file names and UI text) returns nothing related to the old modules.
11. **Front office design:** the front office (landing, `/login`, `/register`, client area) has its own polished design, and sign-out works from both the front office and the backoffice.

Work step by step:

| Step | Work |
|---|---|
| 1 | Setup + design tokens |
| 2 | Database + models |
| 3 | Auth + redirection + route protection |
| 4 | Profile + account deletion |
| 5 | Admin user CRUD + notifications |
| 6 | Layout shells |
| 7 | Module templates |
| 8 | README |

After each step, run the type check and tell me what to test.
