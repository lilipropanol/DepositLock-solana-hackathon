# DepositLock — pitch working doc

Fields follow the organizers' deck template in the BUILD IRL Solana Starter Pack.
**Their instruction, twice: "verified features only… do not invent facts,
statistics, traction, users, partners, technical claims, or completed features.
Mark missing information as TBD or an assumption."** Anything unverified below is
marked `[TBD]` — leave it marked or delete it. Do not promote it.

---

## Project name

**DepositLock** — the rental deposit that returns itself.

## Context and problem

An Irish tenant pays a security deposit of roughly one to two months' rent and it
sits in the landlord's personal bank account for the length of the tenancy. At
the end, getting it back depends entirely on the landlord choosing to act.

When they stall, deduct arbitrarily, or stop replying, the tenant's only recourse
is the Residential Tenancies Board — a process measured in months, over an amount
most people decide isn't worth the fight. The asymmetry isn't really about money;
it's that **doing nothing is a winning move for whoever holds the funds.**

> Speaker note: the strongest version of this is a real story. If anyone on the
> team has actually lost a deposit, open with thirty seconds of that instead of
> this paragraph. `[TBD — do we have one?]`

## Solution

The deposit goes into a Solana program that neither party can withdraw from
early. At lease end the landlord gets a review window to raise a claim. If they
raise nothing, the refund becomes claimable **by anyone**, and can only ever pay
the tenant.

Silence stops being a tactic. The default flips from "landlord keeps it until
challenged" to "tenant gets it back unless challenged."

## How the product works

1. Tenant deposits into an escrow account controlled by the program, not a person.
2. Funds are locked for the duration of the lease. Neither side can touch them.
3. At lease end, a review window opens (14 days in production).
4. Three ways it ends:
   - Landlord approves the return → 100% to tenant, instantly.
   - Landlord does nothing → window expires → anyone can trigger the refund → 100% to tenant.
   - Landlord raises a claim → itemised deduction and evidence. `[Roadmap — not built]`

## How Solana is integrated

The escrow is an **Anchor program deployed to devnet**, not a database row.

- **Custody elimination.** Funds sit in a Program Derived Address — an account
  with no private key. Not the landlord's, not the tenant's, not ours. A company
  holding deposits is an unlicensed bank; code holding them is not.
- **Deterministic time-locks.** The refund gate reads Solana's Clock sysvar, the
  cluster's own consensus time. No bank rail can natively enforce "if no claim
  is filed within 14 days, reverse the transfer."
- **Permissionless execution.** `claim_refund` has no signer check by design, so
  the tenant never has to persuade anyone. The destination is pinned to the
  tenant recorded at creation, so a caller can only *make the refund happen*.
- **Cost.** The refund transaction cost ◎0.00001 — about a fifth of a cent.
  The same escrow on Ethereum would cost $10–$50 in gas, which makes a €1,500
  deposit uneconomic to protect.

Program: `43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7` (devnet)

## What we built today

**Verified — deployed to devnet and covered by passing tests:**

- [x] Anchor program, live on devnet
- [x] `initialize_and_fund` — tenant locks the deposit into a PDA
- [x] `release` — landlord returns it early; rejects any other signer
- [x] `claim_refund` — permissionless; **rejected** before the deadline with
      `WindowStillOpen`, succeeds after, and closes the account
- [x] 5 passing tests including both negative cases
- [x] Next.js dashboard with tenant/landlord views and a live countdown
- [x] End-to-end refund executed on devnet, viewable on Explorer

**Built as UI mockup, explicitly not implemented:**

- [ ] Dispute flow — landlord claim, tenant accept/reject, RTB arbitration

**Not built:**

- [ ] Stablecoin (USDC/EURC) deposits — demo escrows SOL
- [ ] Real wallet connection — demo uses burner keypairs

> Tick these off against what actually runs at 15:30. Do not tick anything you
> haven't watched work.

## Demo material

Live local demo plus a devnet Explorer link. `[TBD — record a 30s screen capture
as backup in case the venue wifi fails.]`

## Intended users or customers

Renters in Ireland, starting with Dublin — the sharpest version of the problem
is a student or young professional in a shared tenancy whose landlord is an
individual rather than an agency.

Second user is the **good landlord**, who currently looks identical to a bad one
at signing time. DepositLock lets them prove up front that they can't hold the
deposit hostage — which is a genuine letting advantage in a competitive market.

Longer term the buyer is a letting agency or the RTB itself. `[TBD — no customer
conversations yet. Say so if asked.]`

## Possible business model

- **Yield on escrowed deposits.** Deposits sit idle for ~12 months. With both
  parties' consent, routed into low-risk Solana yield (e.g. Kamino, MarginFi).
  Neither party pays a fee; the float is the revenue. `[Assumption: 4–6% APY,
  not something we've measured.]`
- **Flat creation fee** at lease signing as a simpler alternative.

> Judges will ask who pays. Honest answer: the landlord or agency sets up the
> lease, so they're the payer — but the yield model means nobody has to.

## Future potential

Deposits are one instance of a general pattern: **money held by an interested
party, released by their goodwill.** The same escrow shape covers contractor
retainers, equipment deposits, and event bonds.

The regulatory angle is the real prize. Ireland already tried a central deposit
scheme and shelved it on cost. A neutral program costs a fraction of a cent per
escrow to run. `[TBD — verify the history of that scheme before claiming it on
stage.]`

## What we would build next

1. Stablecoin deposits (USDC/EURC) — removes volatility, localised change.
2. The dispute path: itemised claims, IPFS evidence, tenant accept/reject.
3. RTB arbitration — arbitrator key agreed by both parties at signing, capped so
   it can award the landlord no more than the amount actually claimed.
4. Mutual settlement — both signatures can split the funds at any time, so a
   stalled arbitration never bricks a deposit.
5. Real wallet connection and a lease-signing flow.

## Team

`[TBD — names, roles, relevant strengths]`

## Visual direction

Dark, restrained, financial-utility. The countdown is the hero element — it is
the moment the product's argument becomes visible.

---

## Prepared answers

**"Why not just a database and bank transfers?"**
Whoever holds the money decides when to release it. A company doing that at
scale is an unlicensed bank — licensing, capital requirements, custody risk. A
PDA has no private key, so there is no one to trust and no one to regulate as a
custodian. And no bank rail natively enforces "if no claim in 14 days, reverse."

**"Isn't the landlord just going to file a bogus claim on day 13?"**
That's the honest limit of v1 and where arbitration comes in. But it already
changes the game: today inaction costs the landlord nothing, and under
DepositLock a claim has to be filed, itemised, and evidenced within a deadline.

**"Why would a landlord ever agree to this?"**
Good landlords already return deposits. This costs them nothing and makes them
provably trustworthy at signing — which wins tenants in a tight market. It also
removes their admin burden entirely.

**"What if the RTB never rules?"**
Funds stay locked, because a live dispute means nobody has earned them yet.
The escape hatch is mutual settlement: tenant and landlord can jointly agree a
split at any time, with no arbitrator. Takes both signatures, so neither can be
robbed.

**"Is this actually on-chain?"**
Yes — here's the program on Explorer, and here's the refund transaction. The
dispute UI is a mockup and we've labelled it as one.
