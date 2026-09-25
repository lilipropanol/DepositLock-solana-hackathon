# DepositLock

**A rental security deposit held by a Solana program instead of by the landlord.**

Built for BUILD IRL Vol. 1 — Superteam Ireland × Claude Builder Club, Dogpatch Labs.

Live on devnet: [`43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7`](https://explorer.solana.com/address/43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7?cluster=devnet)

---

## The idea in one paragraph

An Irish tenant hands over €1,500–€3,000 and it sits in the landlord's personal
bank account. Getting it back depends entirely on the landlord choosing to act.
If they stall, deduct arbitrarily, or simply stop replying, the tenant's only
recourse is the RTB — a process measured in months, for an amount most people
won't fight for.

DepositLock inverts the default. The deposit goes into a Solana program that
nobody can withdraw from early. When the lease ends, the landlord gets a review
window to raise a claim. **If they do nothing, the refund becomes claimable by
anyone, and can only ever pay the tenant.** Silence stops working as a tactic.

## Quick start

```bash
npm install                 # root: Anchor program + scripts
npm run fund-demo           # top up the two demo wallets on devnet
cd app && npm install && npm run dev
```

Open http://localhost:3000.

## How it works

Three instructions, one account, about 120 lines of Rust.

| Instruction | Who can call it | Gate | Result |
|---|---|---|---|
| `initialize_and_fund` | tenant | amount > 0 | deposit moves into the escrow PDA |
| `release` | landlord only | must be the recorded landlord | 100% to tenant, immediately |
| `claim_refund` | **anyone at all** | clock ≥ lease end + review window | 100% to tenant |

### Why `claim_refund` takes no identity check

That's the product. There is deliberately no signer constraint on it — a
stranger, a bot, or the tenant can all call it. The caller cannot redirect the
money, because the destination is pinned to the tenant recorded when the escrow
was created. So the only power a caller has is to *make the refund happen*.

The tenant never has to persuade anyone. Once the clock runs out, the refund is
simply a fact waiting to be triggered.

### A few Solana terms, in plain English

- **Program** — a deployed piece of code. It has no memory of its own; all state
  is passed in as accounts.
- **PDA (Program Derived Address)** — an account whose address is computed from
  seeds plus the program's ID, and which **has no private key**. No human can
  ever sign for it. That's what makes the escrow genuinely neutral: not "we
  promise not to touch the money," but "there is no key to touch it with."
- **Lamport** — the smallest unit of SOL (1 SOL = 1,000,000,000 lamports).
- **CPI** — one program calling another. We use one, to the System Program, to
  move the deposit in.
- **Clock sysvar** — the cluster's own consensus time. The refund gate reads it,
  so neither party can lie about what time it is.

### Why the review window is a parameter, not a constant

`dispute_window_secs` is passed in at creation. Production would be `1_209_600`
(14 days). The demo passes `10`. Same instruction, same guard, same code path —
the contract judges watch is the real one, just on a shorter clock. There is no
"demo mode" branch anywhere in the program.

### Why no stored status field

The `Escrow` account has no `status`. A Solana program only runs when someone
sends it a transaction — nothing wakes it when a deadline passes. So "the review
window is open" can never be a stored fact, only a computed one. Both the
program and the UI derive it from the clock the same way (`derivePhase` in
`app/src/lib/escrowClient.ts`).

## Repo layout

```
programs/deposit-lock/src/lib.rs   the entire program
tests/deposit-lock.ts              5 tests, including both negative cases
scripts/fund-demo.ts               top up the demo wallets
scripts/verify-demo.ts             full cycle against devnet, exits non-zero on failure
app/src/lib/escrowClient.ts        the mock/real seam
app/src/lib/mockClient.ts          in-memory, no chain
app/src/lib/devnetClient.ts        real transactions
app/src/lib/demoKeypairs.ts        deterministic burner wallets
```

### The mock seam

`NEXT_PUBLIC_USE_MOCK=true` swaps the entire chain layer for an in-memory
implementation. Two uses: frontend work never blocks on the program, and if the
venue wifi dies mid-pitch the demo still runs. Say so honestly if it happens.

### Burner wallets

The tenant and landlord are two keypairs derived from fixed seeds in
`demoKeypairs.ts`, so the browser and `fund-demo.ts` independently agree on the
same addresses. They hold only worthless devnet SOL.

This is not faking the chain — they are two genuinely distinct addresses sending
genuinely separate signed transactions. The only shortcut is where the keys
live. Production would use Phantom via wallet-adapter.

## Verifying it end to end

```bash
anchor build                                          # compiles
anchor test --skip-local-validator --provider.cluster devnet   # 5 tests
npm run verify-demo                                   # full cycle, real devnet
```

`verify-demo` asserts the thing that matters: an early withdrawal is **rejected**
with `WindowStillOpen`, and after the window expires the same call succeeds and
closes the account.

## Demo runbook

1. Tenant → **Deposit & Start Lease**. Status: LOCKED.
2. Switch to **Landlord**. Point at "Approve Return". Don't click it.
3. Switch back. Watch the countdown reach zero — the Withdraw button unlocks itself.
4. **Withdraw Deposit.** Funds land.
5. **View transaction on Solana Explorer.** Escrow → 0, tenant made whole, fee ≈ ◎0.00001.
6. **Reset Demo** before the next judge.

## Known limits

- Escrows hold **SOL**, not USDC. Production would use a stablecoin; that's an
  SPL-token swap localised to the transfer calls, not a redesign.
- The dispute / RTB arbitration flow is **designed but not built** — the UI shows
  the mockup and labels it as roadmap.
- Burner keypairs rather than a real wallet, as above.

## Roadmap

Stablecoin deposits · itemised claims with IPFS evidence · tenant accept/reject ·
RTB arbitrator key agreed at signing and capped at the amount claimed ·
both-signatures mutual settlement · yield on escrowed deposits (Kamino/MarginFi).
