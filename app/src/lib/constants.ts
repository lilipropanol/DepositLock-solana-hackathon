// The deployed DepositLock program on Solana devnet.
export const PROGRAM_ID = "43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7";

// Public devnet RPC works, but is rate-limited and will be under heavy load at
// the venue. Set NEXT_PUBLIC_RPC_URL to a Helius devnet URL before the demo.
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

// When true the UI runs entirely in-memory with no chain calls at all.
// Two uses: the frontend lane builds against this from minute one, and it is
// the fallback if venue wifi or the RPC dies mid-pitch.
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const LAMPORTS_PER_SOL = 1_000_000_000;

// Production would be 1_209_600 (14 days, per Irish RTB practice).
// The contract takes this as a parameter, so the demo runs the real code path.
export const DEMO_WINDOW_SECS = 10;
export const PRODUCTION_WINDOW_SECS = 1_209_600;

export const DEFAULT_DEPOSIT_SOL = 0.05;
export const DEMO_PROPERTY = "42 Ranelagh Road, Dublin 6";

export const explorerTx = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const explorerAddr = (addr: string) =>
  `https://explorer.solana.com/address/${addr}?cluster=devnet`;
