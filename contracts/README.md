# SnapSeal contracts

Blockchain proof of a Reframe gallery's selection and delivery: only SHA-256 fingerprints go on-chain.

| Contract                | Functions                                                    |
| ----------------------- | ------------------------------------------------------------ |
| `SelectionRegistry.sol` | `createGallery`, `submitSelection`, `getSelection`           |
| `DeliveryReceipt.sol`   | `publishDelivery`, `confirmReception`, `getDelivery`         |

This folder is a separate project with its own dependencies. The Reframe app only uses the ABIs
in `src/modules/snapseal/abi` and the addresses in its environment.

## Run the tests

```bash
cd contracts
npm install
npm test
```

After changing a contract, run `npm run export-abi` to update the ABIs used by the app, then deploy it again.

## Deploy

Choose one network. Ganache is the simplest: it runs on your computer and needs no faucet. Sepolia is a public test network, closer to a real deployment.

### Option A: Ganache (local)

Keep this running in its own terminal:

```bash
cd contracts
npm install
npm run ganache
```

It prints 10 test accounts with their private keys, and keeps its data in `contracts/.ganache-db` between restarts. These keys are public test keys: never send real funds to them.

In a second terminal:

```bash
cd contracts
npm run deploy:ganache
```

The Ganache desktop app also works: start a workspace with its default port (7545) and chain id (1337), instead of `npm run ganache`.

In MetaMask, import two of the printed private keys: **(0)** as the photographer and **(1)** as the client. The app adds the Ganache network to MetaMask on the first connection.

### Option B: Sepolia (public testnet)

1. In MetaMask, create a test wallet that holds no real funds, and get free Sepolia ETH from a faucet.
2. Copy `contracts/.env.example` to `contracts/.env`, and set `SEPOLIA_PRIVATE_KEY` to that wallet's private key. This file is ignored by git: never commit or share it.
3. Deploy:

```bash
cd contracts
npm install
npm run deploy:sepolia
```

The client account also needs a little Sepolia ETH to validate and confirm.

### Then, for both options

The deploy script prints three lines. Add them to `.env.local` in the StudioFlow folder (or `.env` with Docker), then restart the app:

```
SNAPSEAL_NETWORK=ganache
SNAPSEAL_REGISTRY_ADDRESS=0x...
SNAPSEAL_DELIVERY_ADDRESS=0x...
```

Redeploying gives new addresses and empty contracts: galleries must then be sealed again.

### Resetting Ganache

Stop it and delete `contracts/.ganache-db` to start from an empty chain. Then:

- Deleting the folder resets the addresses too, so the first deployment gets the same ones again. Delete the old links with `db.galerie_seals.deleteMany({})` in MongoDB, or those galleries will look sealed with no data behind them.
- If MetaMask reports a nonce error, clear its activity for each account (Settings > Advanced > Clear activity tab data).

## Limits

- A gallery holds at most 300 distinct photos in one transaction (about 7.2M gas). Use a small gallery for the demo: gas is paid in test ETH.
- Sealing covers the photos visible at that moment. Photos added later cannot be selected on-chain.
- A delivery's fingerprint belongs to one exact file. The gallery's "Download all" zip is rebuilt on each download, so it never matches: send the client the file you published.
