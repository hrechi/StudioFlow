# Putting ReFrame online (Vercel + MongoDB Atlas + Sepolia) — free

What you end up with:

| Piece | Locally (today) | Online |
|---|---|---|
| Website | Docker / `npm run dev` | **Vercel** (free Hobby plan) |
| Database + photos (GridFS) | Docker MongoDB | **MongoDB Atlas** (free M0, 512 MB) |
| Blockchain (3 modules) | Ganache on your PC | **Sepolia** (free Ethereum test network) |
| Portfolio search | Elasticsearch | MongoDB (built-in fallback, nothing to do) |

Ganache only lives on your PC, so the online site can't use it. Sepolia is a public test
network: it works like the real Ethereum but its ETH is free (from "faucets") and worth nothing.

Total time: about 1 hour. Do the parts **in order**.

---

## Part 1 — The database (MongoDB Atlas)

1. Go to <https://www.mongodb.com/cloud/atlas/register> and sign up (free).
2. **Create a cluster** → choose **M0 (Free)** → provider **AWS**, region **Frankfurt (eu-central-1)**
   (close to Tunisia) → *Create Deployment*.
3. It asks you to create a database user: user `reframe`, click **Autogenerate Secure Password**,
   **copy the password somewhere safe**, then *Create Database User*.
4. Left menu → **Security → Network Access** → *Add IP Address* → **Allow access from anywhere**
   (`0.0.0.0/0`) → *Confirm*. (Vercel has no fixed IP, so this is required.)
5. Left menu → **Database → Clusters** → *Connect* → **Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://reframe:<db_password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
6. Make it yours: replace `<db_password>` with the password from step 3, and add the database
   name **`reframe`** right after `.net/`:
   ```
   mongodb+srv://reframe:YOUR_PASSWORD@cluster0.abcde.mongodb.net/reframe?retryWrites=true&w=majority&appName=Cluster0
   ```
   This is your **Atlas URI**. Keep it for Part 4.

### Create the first admin account in Atlas
On your PC, in PowerShell, in the StudioFlow folder (it uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`
from your `.env.local`):

```powershell
$env:MONGODB_URI="PASTE_YOUR_ATLAS_URI_HERE"; npm run seed:admin
```

It prints that the admin was created. Clients don't need anything: they sign up on the site.

> Start with an **empty** database online (recommended). Your local data has photos (heavy for
> the 512 MB limit) and blockchain proofs that point to Ganache, which won't verify on Sepolia.

---

## Part 2 — Wallets and free test ETH (Sepolia)

You need **3 MetaMask accounts**. In MetaMask: click the account name at the top →
*Add account or hardware wallet* → *Add a new account*. Name them:

| Account | Used for | Needs test ETH |
|---|---|---|
| **ReFrame Admin** | the admin's wallet: seals galleries, owns the allocation contract, deploys 2 contracts | ~0.05 |
| **ReFrame Studio Server** | the website itself signs contract records with it (its key goes to Vercel) | ~0.03 |
| **ReFrame Client** | a test client: signs the gallery selection | ~0.01 |

(A photographer testing allocation can use a 4th account with ~0.01.)

> ⚠️ These accounts are for the **test network only**. Never send real money to them: their
> private keys will be in files and on Vercel.

**Switch MetaMask to Sepolia:** network menu (top-left) → turn on **Show test networks** →
pick **Sepolia**.

**Get free test ETH:**
1. Open <https://cloud.google.com/application/web3/faucet/ethereum/sepolia> (sign in with Google).
2. Paste the **ReFrame Admin** address → *Receive 0.05 Sepolia ETH*. (Once per day per account.)
3. Do the same for **Studio Server** (or come back tomorrow).
4. To give some to the Client: in MetaMask, from Admin → *Send* → Client's address → `0.01`.

If that faucet is busy, another free one: <https://sepolia-faucet.pk910.de> (it "mines" for a few
minutes in your browser, then sends the ETH).

---

## Part 3 — Deploy the 3 blockchain modules to Sepolia (from your PC, once)

### 3.1 Put the deploy keys in your `.env` (StudioFlow folder)

Get each private key in MetaMask: select the account → **⋮ → Account details → Show private key**
(enter your MetaMask password) → copy. Add these lines at the end of `.env` (they don't touch
your Ganache settings, so local work keeps working):

```env
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=0x...the ReFrame Admin key...
SEPOLIA_STUDIO_PRIVATE_KEY=0x...the ReFrame Studio Server key...
```

(`SEPOLIA_RPC_URL` empty = the free public Sepolia node. `.env` is never committed to git.)

### 3.2 Run the 3 deployments

Each takes ~30 seconds (Sepolia is slower than Ganache). **Copy what each one prints.**

**a) Gallery blockchain proof (SnapSeal)**
```powershell
cd contracts; npm install; npm run deploy:sepolia; cd ..
```
Prints `SNAPSEAL_NETWORK=sepolia`, `SNAPSEAL_REGISTRY_ADDRESS=0x…`, `SNAPSEAL_DELIVERY_ADDRESS=0x…`

**b) Contracts (notary)**
```powershell
cd reframe-blockchain; npm install; npm run deploy:sepolia
```
Prints `BLOCKCHAIN_RPC_URL=…` and `NOTARY_ADDRESS=0x…`

**c) Equipment allocation** (still in `reframe-blockchain`)
```powershell
npm run deploy:allocation:sepolia; cd ..
```
Prints `ALLOCATION_CONTRACT_ADDRESS=0x…` and `NEXT_PUBLIC_CHAIN_ID=11155111`

If one says *"no Sepolia ETH"*, that account needs the faucet (Part 2) first.

---

## Part 4 — Put the site on Vercel

### 4.1 Push the code to GitHub
Vercel builds from GitHub, not from your PC: **everything must be committed**, including the new
folders (`src/modules/tutorial/`, `src/lib/streams.ts`, `src/lib/site-url.ts`, `vercel.json`),
or the build fails. In VS Code / GitHub Desktop, commit all changes (`.env*` files are ignored
automatically: they never leave your PC). Then get it onto **`main`** (Vercel publishes `main`
by default):
```powershell
git checkout main; git merge integration; git push origin main
```
(Or keep `integration`: after step 4.2, Vercel → *Settings → Environments → Production* →
set the branch to `integration`.)

### 4.2 Import the project
1. <https://vercel.com/signup> → **Continue with GitHub**.
2. **Add New… → Project** → import **hrechi/StudioFlow** (give Vercel access to it if asked).
3. Framework: **Next.js** (detected). Root directory: **leave as is** (`./`). Don't change the
   build settings.
4. Open **Environment Variables** before clicking Deploy (next step).

### 4.3 Environment variables — import `.env.vercel` (NOT `.env`)

Your `.env` is for your PC (local MongoDB, Ganache, `localhost`): imported into Vercel, the site
would try to reach your computer and fail. The ready-made **`.env.vercel`** (StudioFlow folder,
git-ignored) has everything the live site needs: your real API keys copied from `.env`, a new
`AUTH_SECRET`, a `CRON_SECRET`, and the Sepolia settings.

1. Open `.env.vercel` and replace the **6 `FILL_ME_…` values**:

   | Line | Where it comes from |
   |---|---|
   | `MONGODB_URI` | your Atlas URI (Part 1) |
   | `STUDIO_PRIVATE_KEY` | the **ReFrame Studio Server** private key (Part 3.1) |
   | `NOTARY_ADDRESS` | printed by Part 3.2 **b** |
   | `SNAPSEAL_REGISTRY_ADDRESS`, `SNAPSEAL_DELIVERY_ADDRESS` | printed by Part 3.2 **a** |
   | `ALLOCATION_CONTRACT_ADDRESS` | printed by Part 3.2 **c** |

2. On Vercel, in **Environment Variables**: click **Import .env** and pick `.env.vercel`
   (or select all its text and paste it into the first *Key* box).

Nothing else to set: the site detects its own Vercel address (payment return links, portfolio
share links), and lines starting with `#` are ignored.

### 4.4 Deploy
Click **Deploy** and wait ~3–5 minutes. You get a URL like `https://studio-flow.vercel.app`.

> Changed a variable later? *Deployments* → **⋯ on the latest → Redeploy** (needed for every
> change, and `NEXT_PUBLIC_*` values are built into the pages).

Check in *Settings → Functions*: **Fluid compute** is **on** (default for new projects): the
blockchain steps wait ~15 s for Sepolia, and the ZIP downloads stream for a while.
Optional, same page: *Function Region* → **Frankfurt (fra1)**, next to Atlas = faster pages.

Automatic: **weather alerts** run every morning at 06:00 UTC (`vercel.json`, Vercel Cron).

### Using your own domain (optional)
*Settings → Domains* → add it, then add `APP_URL=https://your-domain` and Redeploy.

---

## Part 5 — Test everything live

1. **Admin:** sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` → create your catalogue, a session,
   a gallery, import photos.
2. **Client:** open the site in a private window → **Sign up** → book, receive quote/invoice,
   pay (test checkout), etc. Everything is saved in Atlas (*Atlas → Browse Collections*).
3. **Link wallets** (each user, in **My profile → Wallet**), with MetaMask on **Sepolia**:
   admin → *ReFrame Admin*, client → *ReFrame Client*.
4. **Contracts:** create a contract for the client and anchor it on the blockchain → the site
   writes it on Sepolia with the Studio Server account (no MetaMask needed for the admin) → the
   client signs it → anyone can check it on `/verifier-contrat`.
5. **Gallery blockchain proof:** a gallery with *Blockchain proof* on → admin seals it
   (MetaMask) → client signs the selection (MetaMask) → admin picks the delivery photos and
   publishes it → client downloads. The proof page links each step to Sepolia Etherscan.
6. **Equipment allocation:** admin opens **Allocation** → *registers the equipment* and *adds
   staff* (the photographer's wallet) → photographer requests → admin confirms → checkout →
   return.

Each MetaMask confirmation takes ~10–20 seconds on Sepolia (Ganache was instant): that's normal.

---

## Good to know (free-plan limits)

- **Upload size:** Vercel refuses requests over **4.5 MB**. Photos, videos and files bigger
  than that fail to upload online (they work locally). Use photos under ~4 MB for the live demo.
- **Storage:** Atlas free = **512 MB** total, photos included (~100–150 normal photos).
- **Gallery "Download all" ZIP:** fine for normal galleries; a very large one can be cut off by
  Vercel's time limit.
- **Search** uses MongoDB online (no Elasticsearch): same results, slightly simpler ranking.
- **Test ETH runs out:** each blockchain action costs a little. If an account is empty, use the
  faucet again.
- **Updating the site:** just `git push` to `main`: Vercel redeploys by itself in a few minutes.
- **Local work is unchanged:** your `.env` still points to Docker MongoDB and Ganache.

## If something goes wrong

| You see | Fix |
|---|---|
| Can't sign in / "server error" on every page | `MONGODB_URI` wrong, or Atlas **Network Access** missing `0.0.0.0/0`. Check password and `/reframe` in the URI. |
| `MongoServerError: bad auth` | Wrong Atlas password in the URI (special characters must be URL-encoded; easier: regenerate a password with letters/digits only). |
| Blockchain button says the network can't be reached | `NEXT_PUBLIC_RPC_URL` / `BLOCKCHAIN_RPC_URL` missing → add them, **Redeploy**. |
| Build fails: "Module not found" | A new file wasn't committed/pushed (step 4.1). |
| A feature says "not configured" | Its line in `.env.vercel` still says `FILL_ME` or is commented → fill it on Vercel, **Redeploy**. |
| "Contract not deployed" on Allocation | `ALLOCATION_CONTRACT_ADDRESS` missing or `NEXT_PUBLIC_CHAIN_ID` not `11155111` → fix, **Redeploy**. |
| MetaMask "insufficient funds" | That account needs Sepolia ETH (Part 2). |
| Contract registration fails | The **Studio Server** account (`STUDIO_PRIVATE_KEY` on Vercel) is out of Sepolia ETH. |
| Upload fails for a big photo | Over 4.5 MB (see limits above). |
| Logs | Vercel → your project → **Logs** shows every server error. |
