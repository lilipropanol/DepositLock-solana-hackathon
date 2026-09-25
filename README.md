# DepositLock

Built for BUILD IRL Vol. 1 — Superteam Ireland × Claude Builder Club, Dogpatch Labs.

Program (devnet): `43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7`

## Quick start

```bash
npm install                 # root: Anchor program + scripts
npm run fund-demo           # top up the demo wallets on devnet
cd app && npm install && npm run dev
```

Open http://localhost:3000

## Checks

```bash
anchor build
anchor test --skip-local-validator --provider.cluster devnet
npm run verify-demo
```

## Layout

```
programs/deposit-lock/src/lib.rs   the escrow program
tests/deposit-lock.ts              tests
scripts/fund-demo.ts               top up demo wallets
scripts/verify-demo.ts             full cycle against devnet
app/src/lib/escrowClient.ts        mock/real seam
app/src/lib/demoKeypairs.ts        demo wallets
```
