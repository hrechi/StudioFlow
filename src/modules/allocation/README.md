# Allocation Blockchain

**Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi**

A photographer allocates studio equipment to a session, and **every step is recorded on a
local Ethereum blockchain** (Ganache) through the `EquipmentAllocation` smart contract, signed
in the browser with **MetaMask**. Result: a tamper-proof history of who used which equipment,
when, and in what condition it came back.

Page: **`/dashboard/allocation`** (sidebar → Equipment → *Blockchain allocation*), detail page
`/dashboard/allocation/<id>`. Staff only (ADMIN + PHOTOGRAPHE).

The contract, its tests and the Ganache setup live in the sibling project
**`../StudioFlow-Blockchain`** (see its README).

---

## Architecture

```
 Browser (React)                     Next.js server                       Ganache :8545
 ───────────────                     ──────────────                       ─────────────
 blockchain.client.ts                allocation.actions.ts                EquipmentAllocation
  · connect MetaMask                  · Zod + requireRole                  (Solidity contract)
  · switch to chain 1337              allocation.service.ts                 · rules: roles,
  · staticCall (dry run)              · business checks                       overlap, statuses
  · MetaMask signs ────────── tx ───────────────────────────────────────►   · events
  · waits for the block              blockchain.server.ts  ◄── read-only ── · views
  · sends txHash ──────────────────►  · verifyTransaction()
                                     MongoDB
                                      · allocations_blockchain (mirror, written AFTER verification)
                                      · wallets_utilisateurs  (user ↔ wallet)
```

| File | Role |
|---|---|
| `allocation.types.ts` | DTOs, labels, `StatusConfig` (statuses/conditions reuse the materiel module's enums) |
| `allocation.rules.ts` | Pure logic: `hashId`, enum ↔ contract mapping, seconds, link message, error texts |
| `allocation.model.ts` | Collection `allocations_blockchain` |
| `wallet-link.model.ts` | Collection `wallets_utilisateurs` (the Utilisateur model is not changed) |
| `allocation.schemas.ts` | Zod schemas |
| `blockchain.server.ts` | Server-only, **read-only** JSON-RPC: `verifyTransaction`, contract reads, events |
| `blockchain.client.ts` | Browser: MetaMask, network switch, signed contract calls, readable errors |
| `allocation.service.ts` | Booking flow, steps, history vs MongoDB comparison, admin tools |
| `allocation.actions.ts` | Server Actions (`ActionResult`) |
| `components/` | Wallet card + context, form, table, admin tools, history timeline |
| `contract/EquipmentAllocation.json` | `{ address, chainId, abi }` written by `npm run export` |
| `tests/` | Unit tests + Ganache integration tests (own vitest config) |

Read-only dependencies on other modules: `Materiel` model and `listMateriels` / `getMaterielById`,
`seChevauchent`-equivalent rule + `peutPasser` / `STATUTS_BLOQUANTS`
(`reservation-materiel.rules.ts`), `getSeanceReservable` / `listSeancesReservables`
(`materiel/seance-source.ts`), `findUtilisateurRefs` / `listPhotographeRefs`. Nothing is written
to another module's collections.

### Key design choices

- **The blockchain enforces the rules, MongoDB is a fast mirror.** The contract refuses an
  overlap, a non-staff wallet or a wrong transition, whatever the app does. MongoDB only stores
  what was **proven** on-chain, for quick lists and names.
- **Never trust a tx hash from the browser.** `verifyTransaction` checks the receipt exists and
  succeeded (`status 1`), was sent to our contract, was signed by the user's **linked** wallet,
  and emitted the expected event with the expected values (allocation id, equipment, session,
  dates, return condition…). Only then is MongoDB written.
- **Id first, save last.** The server issues the future ObjectId; the browser signs
  `requestAllocation(keccak256(id), …)`; the document is created with that same id after
  verification. A rejected or failed transaction leaves nothing behind.
- **No personal data on-chain.** Ids are `keccak256(ObjectId string)`; people are wallet
  addresses; plus Unix-second dates, statuses and conditions.
- **No private key in the app.** The server only reads; every write is signed by MetaMask.
- **Wallet ownership is proven** by signing a free message naming the account and the time
  (valid 10 min), checked with `verifyMessage`.
- **Statuses** follow the materiel module: `EN_ATTENTE → CONFIRMEE → EN_COURS → RETOURNEE`,
  `ANNULEE` from the first two. Confirm/return: admin. Checkout/cancel: admin or the booker.

## Environment variables (`.env.local`, all optional)

| Variable | Default | Used by |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `1337` (from the contract JSON) | browser + server: the chain MetaMask must use |
| `NEXT_PUBLIC_RPC_URL` | `http://127.0.0.1:8545` | browser: RPC URL added to MetaMask |
| `GANACHE_RPC_URL` | `NEXT_PUBLIC_RPC_URL` | server: where it reads the chain (differs only if the server runs elsewhere, e.g. Docker → `http://host.docker.internal:8545`) |

Run the app with `npm run dev` for this feature: inside the Docker `app` container,
`127.0.0.1:8545` is the container itself, not Ganache.

## Run it

```bash
# 1. Blockchain (terminal 1, keep open)
cd ../StudioFlow-Blockchain && npm run ganache
# first time only (terminal 2): deploy + copy address/ABI into the app
npm run deploy && npm run export

# 2. Database + app (terminal 2)
cd ../StudioFlow
docker compose up -d mongo
npm run dev            # with MONGODB_URI pointing at your database
```

MetaMask: add the network (RPC `http://127.0.0.1:8545`, chain id `1337`, symbol ETH — or let
the app's *Switch network* button add it), then **import** Ganache accounts **#0 (Admin, contract
owner)** and **#1 (Photographer)** with their private keys (printed by `npm run ganache`).

## Demo scenario

1. **Admin** signs in, selects the *Admin* account in MetaMask → *Connect MetaMask* →
   *Link this wallet* (sign) → badge **Contract owner**.
2. Admin → *Blockchain setup* → **Register** a few items on-chain (one transaction each).
3. **Photographer** signs in, selects *Photographer* in MetaMask → *Link this wallet*.
   If the badge says "not staff", the admin clicks **Add as staff** next to their name.
4. Photographer → *Allocate equipment*: item, session (dates fill in), check
   **"Available on the blockchain"** → *Allocate* → MetaMask confirm → toast with the tx hash.
   Try the same item on an overlapping period: *Not available*.
5. Admin → **Confirm** → **Mark as taken** → **Record return** (Good / Worn).
6. Open the allocation: **Blockchain history** shows 4 steps (date, wallet, block, tx hash) and
   a green "StudioFlow matches the blockchain" banner.

**Tamper test**: change the allocation's `statut` in MongoDB Compass, reload the detail page →
a yellow banner lists the difference. The blockchain cannot be edited that way.

## Tests

```bash
npx vitest run --config src/modules/allocation/tests/vitest.config.ts   # app module
cd ../StudioFlow-Blockchain && npm test                                 # contract (30 tests)
```

The `blockchain.server` integration tests send real transactions to the running Ganache (random
ids, invisible in the app) and are skipped when Ganache is offline.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Ganache is offline" | `npm run ganache` in StudioFlow-Blockchain |
| "contract is not deployed" | `npm run deploy && npm run export`, restart `npm run dev` |
| Wrong network badge | *Switch network* (adds Ganache to MetaMask if needed) |
| Balance 0 ETH in MetaMask | you are on another network or on a non-Ganache account |
| "not staff" | admin → *Add as staff* (the photographer must have linked a wallet first) |
| Transactions fail after a fresh chain | MetaMask → Settings → Advanced → *Clear activity tab data* |
