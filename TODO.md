# TODO

**Sat 26 Sept · Dogpatch · build 11:00 → submit 16:30 (`tally.so/r/rj7oqN`)**

Program (devnet): `43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7`

## Setup (everyone, 11:00)

```bash
git clone https://github.com/lilipropanol/DepositLock-solana-hackathon.git && cd DepositLock-solana-hackathon
npm install
cd app && npm install && cd ..
npm run check              # tells you exactly what's missing, per lane
npm run verify-demo        # confirms the escrow actually works on devnet
cd app && npm run dev      # localhost:3000
```

`npm run check` is safe to run any time and changes nothing. Lanes A and C only
need Node — Rust, Solana CLI and Anchor are Lane B only.

No `.env.local`? Fine, it falls back to the public devnet RPC. Ask for the Helius
URL if you want your own quota.

---

## A — Frontend

Owns `app/src/components/`, `app/src/app/page.tsx`.

- [ ] Countdown: make it big, colour-shift at zero, Withdraw button visibly unlocks — `components/ui.tsx`
- [ ] Lease setup form: deposit amount, lease end, window length. Currently hardcoded — `components/TenantView.tsx:25`
- [ ] Show euros alongside SOL — `components/ui.tsx`
- [ ] Lease details card: tenant, landlord, property, dates — `components/`
- [ ] Readable error messages instead of raw Solana errors — `app/page.tsx`
- [ ] Dispute screens once B's methods exist: claim form, accept/reject, RTB panel — `components/`
- [ ] Photo upload → SHA-256 hash in browser, send hash only — `components/`
- [ ] Check legibility at 1920×1080

Work offline with `NEXT_PUBLIC_USE_MOCK=true` in `app/.env.local`.

---

## B — Dispute flows

Owns the program. Copy `programs/deposit-lock/src/lib.rs` into a new program so the working one stays deployed.

- [ ] `submit_claim(amount, evidence_hash)` — landlord, during window only
- [ ] `accept_deduction()` — tenant agrees; claim → landlord, rest → tenant
- [ ] `reject_deduction()` — uncontested amount returns to tenant now, contested stays locked
- [ ] `arbitrate(award)` — RTB key only, capped at the amount claimed
- [ ] `settle_mutually(split)` — both signatures, any split
- [ ] Add to `Escrow` struct: `arbitrator`, `claimed_amount`, `evidence_hash`, `status`
- [ ] Tests for each, including wrong signer / wrong window / over-cap — `tests/deposit-lock.ts`
- [ ] Deploy to devnet, give the program ID to A and C
- [ ] Add the matching methods to `app/src/lib/escrowClient.ts` + `mockClient.ts` so A isn't blocked

---

## C — Crank

Owns `scripts/crank.ts` (new file). Nothing else touches it.

- [ ] Fetch all escrows — `program.account.escrow.all()`
- [ ] Filter to those past `lease_end_ts + dispute_window_secs`
- [ ] Send `claim_refund` for each, signed by its own keypair
- [ ] Loop on an interval, log each action
- [ ] `--dry-run` flag
- [ ] Handle: already-closed accounts, RPC failures, low balance
- [ ] Fund the crank wallet — pattern in `scripts/fund-demo.ts`

---

## Timeline

| | |
|---|---|
| 15:00 | Merge whatever is green, drop the rest |
| 15:30 | Freeze. Rehearse |
| 16:00 | Submit |

Fallback if anything breaks live: `NEXT_PUBLIC_USE_MOCK=true` runs the demo with no chain.
