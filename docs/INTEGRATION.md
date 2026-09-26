# Solana Devnet integration

This app connects directly from the browser to the deployed DepositLock program. Simulation remains the default; set `NEXT_PUBLIC_DEPOSITLOCK_MODE=devnet` in `.env.local` to enable wallet prompts and Devnet transactions. Never add a seed phrase or private key to an environment variable or frontend file.

## Files

| File | Responsibility |
| --- | --- |
| `programs/deposit-lock/src/lib.rs` | Anchor program source copied from the backend repository. |
| `src/lib/solana/idl/deposit_lock.json` | Program IDL used to get instruction discriminators and the account discriminator. |
| `src/lib/solana/escrow.ts` | PDA derivation, exact SOL/lamport conversion, instruction construction, account decoding, and Devnet reads. |
| `src/components/mobile/solana-provider.tsx` | Wallet Standard provider and Devnet connection. Wallets sign; the app never receives their private keys. |
| `src/hooks/use-mobile-escrow.ts` | Joins the mobile flow to chain reads/actions and keeps property presentation data in browser storage. |
| `src/lib/solana/config.ts` | Program mode, RPC endpoint, demo review period, and Explorer links. |

## On-chain instructions

The program address is `43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7`.

- `initialize_and_fund(lease_id, amount, lease_end_ts, dispute_window_secs)` records participants and timing, then transfers native SOL from the tenant to a Program Derived Address (PDA). A PDA is a predictable program-owned account with no private key.
- `release()` requires the recorded landlord to sign and closes the escrow to the tenant, returning the full balance.
- `claim_refund()` checks Solana’s Clock against `lease_end_ts + dispute_window_secs`. It is permissionless after the deadline, but the program always sends the funds to the recorded tenant.

The frontend serializes the instruction discriminator and little-endian integers from the IDL. Escrow data is decoded as: 8-byte Anchor discriminator, 32-byte tenant, 32-byte landlord, 8-byte lamport amount, 8-byte lease timestamp, 8-byte review duration, 8-byte agreement number, and 1-byte PDA bump. For landlord lists, the program-account query filters by landlord at byte offset 40; tenant lists filter by tenant at byte offset 8.

## Demo timing and metadata

The Devnet flow deliberately passes a lease timestamp roughly two seconds after the tenant starts funding and a 10-second review window. That gives the live pitch a short timer, but the user-selected lease end date is not enforced on-chain. The UI explains this wherever it matters.

The program contains no property address, rent, or photo. The app stores those terms in each browser and includes them in the invite link. Wallets can still rediscover existing escrows by querying the program. If local terms are missing, the app shows a recovered escrow and clearly marks property details as unavailable instead of inventing them.

There is no dispute instruction in the deployed program, so the Devnet interface does not pretend that a landlord can freeze a claim or submit evidence. The prototype uses native SOL, not an SPL stablecoin.

## Transaction lifecycle

1. A wallet connection exposes its public key; the app checks that it matches the expected landlord or tenant for role-restricted actions.
2. The frontend builds a transaction from the IDL and asks the wallet to sign it. The wallet alone holds the signing key.
3. The app submits the transaction to Devnet, waits for confirmation, and only then updates the status and saves the signature.
4. Escrow accounts are polled every four seconds while the app is open. If a previously observed account is closed, the interface treats it as settled.

No Devnet transaction was submitted as part of this integration. The program address was checked with a read-only RPC account lookup; it returned an executable program account. Rust/Anchor compilation and wallet-signed end-to-end tests still need to be run in an environment with the Anchor and Solana toolchains installed.
