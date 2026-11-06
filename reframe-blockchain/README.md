# ReFrame × Blockchain — intégrité et traçabilité des contrats

## 1. Idée en une phrase
À l'acceptation d'un devis/contrat, ReFrame **fige** le PDF, calcule son **SHA-256** et **enregistre cette empreinte** dans un smart contract.
Des mois plus tard, quiconque dépose le PDF sur `/verifier-contrat` sait s'il est **identique** à celui validé (au bit près).

## 2. Ce que j'ai constaté dans votre code (et qui a guidé la conception)
| Constat | Conséquence |
|---|---|
| Le « contrat » = le **PDF du devis** (`renderDevisPdf`), validé quand le client **accepte** (`answerDevis`). | L'ancrage se déclenche à l'acceptation. |
| Le PDF est **régénéré à chaque téléchargement** (et pdf-lib y inscrit la date du jour, le statut change…). | Deux téléchargements donnent deux hash différents → on **fige le PDF une fois** (GridFS `contratsFiges`) et on sert toujours ce fichier. |
| Les clients ne signent pas dans l'app ; la signature/cachet du studio est ajoutée au PDF. | La « validation du client » = l'acceptation tracée dans `historique` ; en option, **co-signature MetaMask**. |
| Les conditions d'annulation/livraison **ne figurent pas** dans le PDF. | À ajouter (PATCHES.md §4) : sinon la blockchain certifie un contrat incomplet. |
| Vous utilisez déjà SHA-256 (preuves de paiement) et GridFS. | Même style de code, aucune nouvelle base. |

## 3. Architecture
```
Client accepte le devis ──► answerDevis (existant)
                              │
                              ▼
                    figerEtAncrerContrat
        1. renderDevisPdf → PDF figé (GridFS)      ──► MongoDB : sha256, statut
        2. SHA-256 du PDF
        3. ContractNotary.register(hash, "DEV-2026-0001", walletClient?) ──► Ganache
                              │
Vérification publique : PDF → SHA-256 (navigateur) → GET /api/contrats/verifier → ContractNotary.verify(hash)
```
- **On-chain** : uniquement l'empreinte + référence du devis + dates/statut (**aucune donnée personnelle** : RGPD, une blockchain ne s'efface pas).
- **Off-chain** : le PDF reste dans MongoDB. La blockchain prouve l'intégrité, elle ne stocke pas le fichier.
- **Clé privée du studio** : côté serveur seulement. **Lecture** : publique, sans wallet.

## 4. Smart contract `ContractNotary` (OpenZeppelin AccessControl)
| Fonction | Qui | Rôle |
|---|---|---|
| `register(hash, reference, client)` | STUDIO_ROLE | enregistre l'empreinte du contrat validé |
| `clientSign(hash)` | wallet client désigné | co-signature optionnelle (MetaMask) |
| `amend(old, new, reference, client)` | STUDIO_ROLE | avenant : ancienne version « remplacée », historique conservé |
| `revoke(hash, reason)` | STUDIO_ROLE | annulation tracée |
| `verify(hash)` / `versionsOf(reference)` | tout le monde | lecture |

Événements : `ContractRegistered`, `ContractSigned`, `ContractAmended`, `ContractRevoked` (traçabilité complète).

## 5. Mise en route (Ganache + MetaMask)
1. **Ganache** : lancer un workspace (RPC `http://127.0.0.1:7545`). Le 1er compte = compte du studio ; copier sa clé privée (icône clé).
2. Dans ce dossier : `cp .env.example .env`, renseigner `STUDIO_PRIVATE_KEY`, puis
   `npm install && npm test && npm run deploy:ganache` → noter l'adresse affichée dans `NOTARY_ADDRESS`.
3. Dans ReFrame : `npm i ethers`, copier `integration/src/` dans `src/`, appliquer `integration/PATCHES.md`, ajouter les variables d'env.
4. **MetaMask** (uniquement pour la co-signature client / démonstration) : Ajouter un réseau → RPC `http://127.0.0.1:7545`, chain ID `1337`, symbole ETH ; importer un compte Ganache (2e compte) = « wallet du client ».
5. Démo : (a) admin envoie un devis → (b) client l'accepte → (c) l'admin voit « Ancré » + hash + tx (visible aussi dans l'onglet *Transactions* de Ganache) → (d) `/verifier-contrat` avec le PDF ✅ → (e) modifier un seul caractère du PDF ❌ → (f) avenant ⚠️ « remplacé ».

**MetaMask est-il nécessaire ?** Pas pour le cœur du projet (le serveur ancre, la vérification est publique). Il sert à la **co-signature du client** (« validations ou signatures des parties ») : le client connecte MetaMask et appelle `clientSign(hash)`. Pour cela, `register` reçoit l'adresse du wallet client (aujourd'hui `ZeroAddress`) : il faudrait un champ « adresse wallet » dans le profil utilisateur. Je le propose en extension plutôt qu'en obligation, car imposer un wallet à des clients de studio photo est peu réaliste.

## 6. Limites à mentionner dans le rapport
- **Hash ≠ identité** : on prouve *quel document* et *quand* ; pas *qui* l'a lu, sauf co-signature wallet.
- **Ganache est un réseau local** : démonstration/pédagogie. En production : testnet (Sepolia) puis réseau public ou L2.
- **Ganache est abandonné** : si le déploiement échoue, utiliser `npx hardhat node` (même config, port 8545). Le compilateur est réglé sur `evmVersion: paris` pour éviter l'erreur PUSH0.
- Si la blockchain est indisponible à l'acceptation, le contrat reste valide dans ReFrame (statut `ECHEC`, reprise par l'admin) : la blockchain ne doit pas bloquer l'activité.
- **Non testé ici** : je n'ai pas pu installer les dépendances (pas d'accès réseau dans mon environnement) ; le contrat, les tests et le code d'intégration n'ont donc été ni compilés ni exécutés. Lancez `npm test` en premier et dites-moi les erreurs éventuelles.

## 7. Pistes d'extension
Co-signature MetaMask du client · événements `ContractAmended` affichés dans l'historique du devis · QR code sur le PDF vers `/verifier-contrat?hash=…` · déploiement Sepolia.
