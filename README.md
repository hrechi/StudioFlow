# ReFrame

**AI-Powered Operating System for Photography Studios** — university group assignment (Esprit School of Engineering).

One Next.js application is both the **frontend** and the **backend** (pages, Server Actions and Route Handlers), connected to **MongoDB** through Mongoose. There is no separate backend server to start.

| Area | URL | Who |
| --- | --- | --- |
| Public site (front office) | `/`, `/portfolio`, `/galerie` (open a shared gallery) | Everyone |
| Sign in / sign up | `/login`, `/register` | Visitors |
| Client area (front office) | `/espace-client` | `CLIENT` |
| Backoffice | `/dashboard` | `ADMIN`, `PHOTOGRAPHE` |

---

## Quick start with Docker (one command)

Only **Docker Desktop** is needed: no Node.js or MongoDB install.

```bash
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
```

In `.env`, set `AUTH_SECRET` (any long random string, e.g. `openssl rand -base64 32`) and choose `ADMIN_PASSWORD`. Then:

```bash
docker compose up --build
```

This starts three services:

| Service | What it does |
| --- | --- |
| `mongo` | MongoDB 8 with a persistent volume. Compass: `mongodb://127.0.0.1:27018` |
| `seed` | Creates the first ADMIN from `.env` if none exists, then exits |
| `app` | The production build of ReFrame on <http://localhost:3000> |

Useful commands:

| Command | What it does |
| --- | --- |
| `docker compose up -d --build` | Same, in the background |
| `docker compose logs -f app` | Follow the app logs |
| `docker compose down` | Stop (data is kept) |
| `docker compose down -v` | Stop and **delete** the Docker database (the admin is re-seeded on the next `up`) |

**"ports are not available … 3000"** means something else (usually `npm run dev`) already uses port 3000: stop it, or add `APP_PORT=3001` to `.env` and open <http://localhost:3001>.

The Docker database is separate from a local MongoDB on port 27017. For day-to-day coding with hot reload, use `npm run dev` (sections below); use Docker to run the full stack, check a production build before a PR, or demo.

## 1. Prerequisites

- **Node.js 20.9+** (developed with Node 22) and npm.
- **MongoDB Community Server** running locally on `127.0.0.1:27017`.
  MongoDB Compass is only a viewer: the server must be installed and running.
  - Windows: install with the *"Install MongoDB as a Service"* option, then check it runs:
    `Get-Service MongoDB` (PowerShell) → `Running`. Start it with `net start MongoDB` (admin terminal).
  - macOS: `brew services start mongodb-community`.
  - Docker alternative: `docker run -d --name reframe-mongo -p 27017:27017 mongo:8`.

## 2. Setup

```bash
npm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
openssl rand -base64 32        # paste the output as AUTH_SECRET in .env.local
```

Then open `.env.local`, paste `AUTH_SECRET` and choose `ADMIN_PASSWORD` (at least 8 characters, with a letter and a digit).

### Environment variables

| Variable | Example | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/reframe` | Local database (`reframe`) |
| `AUTH_SECRET` | *(generated)* | Signs the Auth.js session cookie (JWT) |
| `ADMIN_EMAIL` | `admin@reframe.tn` | First admin created by the seed |
| `ADMIN_PASSWORD` | *(your choice)* | Its password (hashed with bcrypt before saving) |

`.env.local` is git-ignored; never commit it. `.env.example` is the shared template.

## 3. Create the first admin

```bash
npm run seed:admin
```

It creates the `ADMIN` account if no admin exists (running it again does nothing). Staff accounts (photographers, other admins) are then created by the admin in **Backoffice → Users → New user**. Public sign-up always creates a `CLIENT`.

## 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` → you land on `/dashboard`. Sign up at `/register` → you land on `/espace-client`.

Production build: `npm run build` then `npm run start`.

## 5. MongoDB Compass

1. Open Compass → **New connection** → URI `mongodb://127.0.0.1:27017` → **Connect**.
2. The `reframe` database appears after the first seed or sign-up, with these collections:
   - `utilisateurs` — accounts (`motDePasse` is a bcrypt hash, never the clear password; `email` has a unique index);
   - `notifications` — notifications shown in the top-bar bell;
   - `galeries` — client galleries (`client` → `utilisateurs`, `photoCouverture` → `photos`, optional `motDePasse` is a bcrypt hash);
   - `photos` — photo metadata and culling status (`galerie` → `galeries`);
   - `photoFiles.files` / `photoFiles.chunks` — the image bytes, stored in MongoDB with **GridFS** (an original and a WebP thumbnail per photo). They are served by `/api/photos/[id]/file` and `/api/photos/[id]/miniature`, which check the session (staff, or the client who owns the shared gallery).

**Downloads.** When the studio allows downloads on a gallery, the assigned client can download one photo (`/api/photos/[id]/file?download=1`) or all non-rejected originals as a ZIP (`/api/galeries/[id]/zip`, streamed with `fflate`).

**Guest link.** Each gallery has a random `lienAcces` token. Once the gallery is shared, the client can send `/g/<lienAcces>` to a guest (second opinion, family). The guest opens it, or types the link at `/galerie`, enters the gallery password if one is set, and sees the non-rejected photos **read only**: preview images only, never the original files, no downloads. The unlock is kept in an httpOnly cookie signed with `AUTH_SECRET`; changing or removing the password locks old guests out. Guest previews are served by `/api/g/[token]/photos/[id]`.
3. Refresh Compass (↻) after actions in the app to see new documents.

## 6. Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (frontend + backend) on port 3000 |
| `npm run build` / `npm run start` | Production build / server |
| `npm run seed:admin` | Creates the first ADMIN from `.env.local` |
| `npm run typecheck` | Generates route types and runs `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier |

## 7. Architecture — modular monolith

```
src/
├── proxy.ts                    Route protection (Next.js 16 "proxy", formerly middleware)
├── app/
│   ├── (public)/               Front office: landing, /portfolio
│   ├── (auth)/                 /login, /register (split-screen)
│   ├── (client)/espace-client/ Client area (CLIENT)
│   ├── (backoffice)/dashboard/ Backoffice (staff), one folder per module
│   ├── deconnexion/            Forced sign-out (blocked / deleted / role changed)
│   └── api/auth/[...nextauth]/ Auth.js route handler
├── modules/
│   ├── utilisateurs/           CORE — fully implemented (model, service, schemas, actions, UI)
│   ├── seances/                Template: types + mock-data + components
│   ├── photos-galeries/        Galerie + Photo CRUD (models, services, actions, GridFS storage); AI features still templates
│   ├── materiel/               Template
│   ├── facturation/            Template
│   ├── portfolio/              Template
│   └── avis-reclamations/      Template
├── lib/
│   ├── db.ts                   Cached Mongoose connection
│   ├── auth.config.ts / auth.ts  Auth.js (Credentials + JWT)
│   ├── rbac.ts                 Roles, permission matrix, homeForRole, route rules (pure)
│   ├── guards.ts               requireUser / requireRole / requireArea (server)
│   ├── action-result.ts        ActionResult type + ServiceError
│   ├── mock-images.ts          Curated Unsplash photos for templates
│   └── mock-data-helpers.ts    Shared mock people / dates
├── components/
│   ├── ui/                     shadcn/ui (Radix)
│   ├── layout/                 BackofficeShell, Sidebar, FrontofficeHeader, Footer, ClientShell…
│   └── shared/                 PageHeader, StatCard, StatusBadge, AIBadge, AIPanel, DataTable,
│                               EmptyState, ConfirmDialog, SafeImage, Pagination, filters…
└── types/next-auth.d.ts        Session / JWT typing
```

Layers inside a module: **UI → Server Actions → service → Mongoose model**. A page never imports a model. A module never reads another module's collection: it calls that module's service.

### Security

- `proxy.ts` redirects by role (fast, JWT-based): CLIENT → `/espace-client`, staff → `/dashboard`, missing permission → `/dashboard/acces-refuse`.
- Every protected page, layout and Server Action also calls `requireArea()` / `requireRole()` from `lib/guards.ts`, which reloads the user from MongoDB on each request: a blocked, deleted or re-roled user is signed out immediately.
- The permission matrix lives in `lib/rbac.ts` and also builds the sidebar.

## 8. Module ownership

| Module | Owner | Folder | Backoffice routes | Client / public routes |
| --- | --- | --- | --- | --- |
| Gestion des Utilisateurs (core) | Louay Herichi + équipe | `modules/utilisateurs` | `/dashboard/utilisateurs`, `/dashboard/profil`, `/dashboard/notifications` | `/login`, `/register`, `/espace-client/profil`, `/espace-client/notifications` |
| Gestion des Séances | Yosser Rafrafi | `modules/seances` | `/dashboard/seances`, `/dashboard/seances/nouvelle`, `/dashboard/seances/[id]`, `/dashboard/lieux` | `/espace-client/seances`, `/espace-client/seances/reserver` |
| Gestion des Photos & Galeries | Louay Herichi | `modules/photos-galeries` | `/dashboard/photos`, `/dashboard/photos/recherche`, `/dashboard/galeries`, `/dashboard/galeries/[id]` | `/espace-client/galeries`, `/espace-client/galeries/[id]`, `/galerie`, `/g/[lienAcces]` (guest link) |
| Gestion du Matériel | Amel Mediouni | `modules/materiel` | `/dashboard/materiel`, `/dashboard/materiel/[id]`, `/dashboard/materiel/reservations` | — |
| Gestion de la Facturation | Aya Flah | `modules/facturation` | `/dashboard/facturation/devis`, `/dashboard/facturation/devis/nouveau`, `/dashboard/facturation/factures` | `/espace-client/factures` |
| Gestion du Portfolio | Anas Ben Ibrahim | `modules/portfolio` | `/dashboard/portfolio`, `/dashboard/portfolio/[id]` | `/portfolio`, `/portfolio/[slug]` |
| Gestion des Avis & Réclamations | Mohamed Yessine Nahdi | `modules/avis-reclamations` | `/dashboard/avis`, `/dashboard/reclamations` | `/espace-client/avis` (+ reviews on `/`) |

Each page starts with a `Module : … · Responsable : …` comment so you can find your files.

**Language:** everything the user sees (front office and backoffice) is in **English**. Dates use `en-GB` and amounts use TND through the formatters in `lib/utils.ts` (`formatDate`, `formatCurrency`, `formatNumber`, `formatRelative`). Code identifiers, routes (`/espace-client`, `/dashboard/seances`…), collection names and enum values stay as in the cahier's class diagram; each enum gets its English label in the module's `…Config` / `…Labels` object next to it.

## 9. Replacing mock data with a real model and service (for each module owner)

Your module already has `xxx.types.ts` (types and enums from the class diagram), `mock-data.ts` and `components/`. Follow `modules/utilisateurs` as the reference:

1. **Confirm the types.** Enums marked *"proposé"* in your types file are not in the cahier: agree on them first.
2. **Model** — `modules/<module>/<entity>.model.ts`: a Mongoose schema whose fields match your type, enums from your `as const` arrays, `timestamps: true`, an explicit `collection` name, and `models.X ?? model()` (see `utilisateur.model.ts`). References to users are `Schema.Types.ObjectId` with `ref: "Utilisateur"`.
3. **Service** — `<entity>.service.ts` with `import "server-only"`: call `connectDB()`, query the model, return **DTOs** (plain objects with `id: string` and ISO dates, like `toUtilisateurDTO`). Throw `ServiceError(message, field?)` for business-rule failures. Other modules call your service, never your model.
4. **Validation** — `<entity>.schemas.ts` with Zod, shared by your forms (`zodResolver`) and your actions.
5. **Server Actions** — `<entity>.actions.ts` with `"use server"`: first `await requireArea("<area>")` (or `requireRole(...)`), then `schema.safeParse(input)`, call the service, `revalidatePath(...)`, and return `success(data)` / `validationFailure(error)` / `toFailure(error)` from `lib/action-result.ts`.
6. **Pages** — replace `import { X } from "@/modules/<module>/mock-data"` with `await getX()` from your service. Components already receive typed props, so most of them do not change.
7. **Buttons** — replace each `ComingSoonButton` / `comingSoon("…")` with a real call to your Server Action (`useTransition` + `toast`, as in `modules/utilisateurs/components/user-row-menu.tsx`).
8. **Notifications** — notify users with `createNotification({ utilisateurId, titre, message, type, lienCible })` from `modules/utilisateurs/notification.service.ts`.
9. Delete `mock-data.ts` once nothing imports it.

## 10. Next.js notes

- Next.js **16**: route protection uses `src/proxy.ts`, `params` / `searchParams` are Promises, `error.tsx` receives `retry()`. Read `node_modules/next/dist/docs/` for the exact APIs.
- **Cache Components is disabled** (`next.config.ts`): every page here depends on the session or MongoDB, so pages render on each request. Turning it on later requires wrapping session/database reads in `<Suspense>` (see the "Authentication with Cache Components" guide in the bundled docs).
- Template photos come from `images.unsplash.com` (allowed in `next.config.ts`); `SafeImage` falls back to `/images/placeholder.svg`. Uploaded photos are stored in MongoDB (GridFS) and served by `/api/photos/...`; `SafeImage` loads those `/api/` URLs unoptimized because the image optimizer does not forward the session cookie.
- **PWA** (installable, offline mode, mobile first):
  - `src/app/manifest.ts` → `/manifest.webmanifest` (name, colors, icons in `public/icons/`).
  - `public/sw.js` is the service worker. Public pages already opened stay readable offline; private areas (dashboard, client space) are never stored on the device and show `/offline`. Bump `VERSION` in it to reset every cache.
  - `experimental.useOffline` + `components/pwa/offline-banner.tsx`: banner while offline; navigations and Server Actions wait and retry once back online.
  - The service worker only runs in production: test with `npm run build && npm run start`, then Chrome DevTools → Application (Manifest, Service workers) and Network → Offline.

## 11. Brand and design system

- **Logo** — "RE FRAME" wordmark traced from `docs/screens/logo reframe *.jpg` into vector paths (`src/components/shared/logo-paths.ts`). Use `<Logo />` (off-white, for dark backgrounds) or `<Logo tone="onLight" />` (black); `showWordmark={false}` gives the "RF" monogram. Set only a height (`iconClassName="h-5"`) so the proportions never change. Standalone files: `public/logo-reframe-white.svg`, `public/logo-reframe-black.svg`; favicon `src/app/icon.svg`, `src/app/apple-icon.png`; social preview `src/app/opengraph-image.png`.
- **Light / dark mode** — dark is the default; the sun/moon toggle (header, backoffice top bar, client area, auth pages) switches modes and remembers the choice (`components/theme/theme.tsx`, applied before the first paint, no flash). Light tokens live on `:root`, dark ones on `.dark` in `globals.css`. Sections that put text over a photo add `className="dark"` so they stay legible in both modes. The logo follows the mode by default (black on white in light mode, white on black in dark mode); `tone="onDark"` / `"onLight"` force one version.
- **Tokens** — all colors, radii, shadows, spacing and type settings are CSS variables in `src/app/globals.css` (`:root`). Both modes use the same token names: surfaces (`bg-background`, `bg-surface`, `bg-card`), off-white text (`text-foreground`, `text-bone`), greys (`text-muted-foreground`) and a single accent, champagne gold (`text-gold`, `--ring`), kept for small highlights. Purple stays reserved for AI features. Never hardcode a hex color in a component: use a token.
- **Type** — headings in Outfit (`font-heading`), uppercase with wide tracking; body text in Inter. Showcase helpers: `display-xl`, `display-lg`, `display-md`, `eyebrow`, `section`, `container-wide`, `viewfinder` (gold corner brackets).
- **Buttons** — `variant="cinematic"` / `"cinematic-outline"` with `size="cta"` / `"cta-sm"` on the showcase site; the regular variants in the management area.
- **Motion** — `<Reveal>` (scroll reveal), `<Parallax>`, `ken-burns` (slow zoom), `img-zoom` (hover zoom), `page-enter` (page transition, `(public)/template.tsx`), `film-grain`. Everything is disabled by `prefers-reduced-motion`. Keep the management area to minimal animation.
