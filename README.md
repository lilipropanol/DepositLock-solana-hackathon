# DepositLock

DepositLock is a mobile-first prototype for rental deposit escrow. The Next.js app lives in [`app/`](app/); the Solana program and Anchor configuration stay at the repository root.

## Demo

https://github.com/user-attachments/assets/700cd18c-1b71-4015-aae2-43a944afbfc7

## Run the mobile app

```bash
cd app
npm ci
npm run dev
```

To preview on a phone, run `ngrok http 3000` in another terminal and open its HTTPS URL. For wallet testing, open the URL inside Phantom’s in-app browser. The app never asks for or stores a recovery phrase or private key.

The default is a browser-only simulation: no wallet transaction or SOL transfer occurs. To opt in to Devnet, copy `app/.env.example` to `app/.env.local`, set `NEXT_PUBLIC_DEPOSITLOCK_MODE=devnet`, and restart Next.js. Devnet transactions are real test-network transactions and require explicit wallet approval.

## Demo flow

1. In the landlord view, create an agreement and share its invite link.
2. Open the invite in a second browser or phone, switch to the tenant view, connect a wallet, and approve the deposit transaction.
3. The landlord can sign to release the full deposit early. Otherwise, after the review timer expires, the tenant can claim a full refund.
4. A confirmed transaction is shown with its Solana Explorer link.

The Devnet demo starts the lease timer shortly after funding and uses a 10-second review window. The chosen lease end date is not enforced on-chain. Use Devnet only; do not connect a wallet with funds you value.

## Program and frontend

The Anchor program is in [`programs/deposit-lock/`](programs/deposit-lock/). Its deployed Devnet address is `43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7`. It holds native SOL in a Program Derived Address (PDA)—an account controlled by the program rather than a human key—and exposes three instructions:

- `initialize_and_fund`: the tenant creates the escrow and deposits SOL.
- `release`: the recorded landlord signs to return the full deposit early.
- `claim_refund`: after the stored lease timestamp and review period, anyone can trigger the full refund to the tenant.

The browser builds instructions from the checked-in IDL in `app/src/lib/solana/idl/`, uses exact lamport values, submits them to Solana Devnet, and asks the connected wallet to sign. The private key stays in the wallet. See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) for account layout, polling, and transaction details.

## Prototype limits

- The tenant supplies the landlord’s public key at funding time; the landlord does not approve the invite beforehand. The invite is not a signed lease.
- Only a full landlord release or full tenant refund is implemented. There is no on-chain dispute, evidence, partial deduction, or arbitration flow.
- The program uses native SOL, not USDC or EURC. Address, rent, and property photos stay in browser storage and the invite link; they are not on-chain data.
- The 10-second timer is for a demo. This contract and UI are not ready for real deposits without a reviewed production design, correct lease-time enforcement, consent and identity rules, dispute handling, and a security audit.

## Checks

From `app/`:

```bash
npm run check
npm test
npm run build
```

Run `anchor build` from the repository root when the Rust, Solana, and Anchor toolchains are installed.
