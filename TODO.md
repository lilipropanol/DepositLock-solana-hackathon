# DepositLock — who does what

**Saturday 26 Sept · Dogpatch Labs · build 11:00 → submit 16:30**

Repo: `/Users/rachelranjith/DepositLock` · Program (devnet): `43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7`

---

## Rules for the day

1. **Do not touch the deployed program.** It works, it's tested, it's live. The
   dispute work goes into a **separate program with its own ID**. If that work
   lands, we switch one constant. If it doesn't, the demo is unaffected.
2. **15:30 is the freeze.** Stop building. Rehearse. Submit at 16:00.
3. **Nothing goes in the deck that nobody has watched work.** The organizers say
   "verified features only" twice.

---

## Everyone, 11:00 — 10 minutes

```bash
git clone <repo-url> && cd DepositLock
npm install
cd app && npm install && cd ..
npm run verify-demo     # ~30s. If this passes, the chain works.
cd app && npm run dev   # http://localhost:3000
```

Read `README.md`. Then split.

---

## Lane 1 — Pitch & demo (you)

Owns `PITCH.md`, the deck, and the live demo. **No code.**

- [ ] Fill in `PITCH.md`. Every heading is from the organizers' template — it's
      effectively the judging rubric.
- [ ] Open with a real story if anyone on the team has actually lost a deposit.
      Beats any statistic.
- [ ] Build the deck — gamma.app is fastest. One idea per slide.
- [ ] Write the "what we built today" list against what is **actually running**
      at 15:30. Check with Lanes 2–4 before ticking anything.
- [ ] Be explicit that the deposit is SOL (not euro-stablecoin) and say which
      parts are mockups. Own it rather than being caught.
- [ ] Write the prepared answers at the bottom of `PITCH.md`.
- [ ] **Rehearse out loud twice.** Time it. 3 minutes goes faster than you think.
- [ ] Record a 30-second screen capture as backup in case the wifi dies.
- [ ] Submit to `tally.so/r/rj7oqN` by 16:00.

**Demo running order**
1. Tenant deposits → status LOCKED
2. Switch to Landlord — they *could* approve the return. Don't click it.
3. Switch back. Countdown hits zero. Withdraw unlocks itself.
4. Withdraw. Funds land.
5. Solana Explorer — escrow drained, tenant made whole, fee ≈ ◎0.00001
6. Reset Demo before the next judge

---

## Lane 2 — Frontend

Owns `app/src/components/` and `app/src/app/page.tsx`. The UI is a working
skeleton (~540 lines); make it something judges lean toward.

- [ ] **The countdown is the hero.** It hitting zero *is* the pitch. Make it big,
      make it shift colour, make the Withdraw button visibly unlock. Everything
      else is secondary to this.
- [ ] Lease setup form — deposit amount, lease end, window length. Currently
      `createLease()` takes no arguments and everything is hardcoded
      (`TenantView.tsx:25`).
- [ ] Show euros. "◎0.05" means nothing to a judge; "€2,000 (◎0.05 on devnet)"
      tells the story.
- [ ] A lease details card — tenant, landlord, property, dates. Make it look
      like a real tenancy, not a test harness.
- [ ] Human-readable errors. Raw Solana error text on a projector is a bad look.
- [ ] Make the landlord's *inaction* visible — it's the conceptual heart and the
      UI currently does nothing with it.
- [ ] Activity log: "Deposited → Window opened → Refund claimed." Carries the
      story while the pitch is being delivered.
- [ ] **Check it at 1920×1080 and read it from across the room.** Projector
      contrast is worse than your laptop.

Work against mocks if the chain is ever in the way: `NEXT_PUBLIC_USE_MOCK=true`
in `app/.env.local`.

---

## Lane 3 — Dispute logic (on-chain)

The gap: there's no tie-break. A landlord can't claim for real damage, and the
RTB can't rule. This is the first thing a judge will ask about.

**Build as a NEW program with its own ID. Do not redeploy the existing one.**

```bash
# new program alongside the working one
anchor new deposit-lock-v2
```

Copy `programs/deposit-lock/src/lib.rs` as the starting point — it's heavily
commented. Add to the `Escrow` struct: `arbitrator: Pubkey`, `claimed_amount:
u64`, `evidence_hash: [u8; 32]`, `status`.

Ship in this order, stop wherever you are at 15:00:

- [ ] **1. `submit_claim(amount, evidence_hash)`** — landlord only, only during
      the review window, `amount <= deposit`.
- [ ] **2. `accept_deduction()`** — tenant signs. Claim → landlord, remainder →
      tenant. Settles with no arbitrator. *This alone transforms the pitch.*
- [ ] **3. `reject_deduction()`** — tenant signs. Uncontested balance returns to
      the tenant **immediately**; only the contested amount stays locked.
- [ ] **4. `arbitrate(award)`** — arbitrator key only. **Cap it: the award must
      be ≤ the amount claimed, and the remainder must go to the tenant.** Means
      even the regulator can't invent a deduction or redirect funds. Judges
      notice this.
- [ ] **5. Counter-offer / mutual settlement** — either party proposes a split,
      the other signs. Needs both signatures, so neither side can be robbed.
      Also answers "what if the RTB never rules?"

- [ ] Tests for each path — copy the pattern in `tests/deposit-lock.ts`,
      including the **negative** cases (wrong signer, wrong window, over-cap).
- [ ] Deploy to devnet, note the new program ID, hand it to Lane 4.

---

## Lane 4 — Dispute UI

Builds the dispute screens against the **mock client**, so you are never blocked
waiting on Lane 3. Coordinate with Lane 2 on styling.

- [ ] Add a third role to the switcher: **RTB Adjudicator**. Flipping to a
      regulator's view is a strong demo moment.
- [ ] Landlord claim form — amount + photo upload. Compute the photo's SHA-256
      **in the browser** and send only the hash on-chain. Honest, verifiable, and
      needs no IPFS account: "the photo stays off-chain, only its fingerprint is
      recorded."
- [ ] Tenant view of a filed claim — itemised amount, evidence, Accept / Reject.
- [ ] Show the split clearly on accept: "€200 → landlord, €1,800 → you."
- [ ] RTB panel — see the claim and the evidence hash, issue a ruling within the
      cap.
- [ ] Extend `mockClient.ts` with the dispute methods first, then wire the real
      ones when Lane 3 deploys.
- [ ] Replace the placeholder in `LandlordView.tsx` (the "Not built — roadmap"
      box) once it's real.

---

## Timeline

| Time | |
|---|---|
| 11:00 | Setup, `verify-demo`, split into lanes |
| 13:00 | Lunch. Lane 1 keeps writing |
| 15:00 | Dispute cut line — whatever is green gets merged, the rest is dropped |
| **15:30** | **Freeze.** No new code. Rehearse end to end |
| 16:00 | Submit |
| 16:30 | Submissions close |

## If something breaks live

`NEXT_PUBLIC_USE_MOCK=true` runs the whole demo with no chain at all. Say so
honestly if you use it — judges are fine with it.
