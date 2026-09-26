// Burner keypairs for the demo.
//
// WHY NOT A REAL WALLET?
// The story needs two people -- a tenant and a landlord -- acting on the same
// escrow. In a 3-minute pitch you cannot juggle two browser extensions, and
// every action would fire an approval popup.
//
// So the app signs with two throwaway keypairs directly. "Burner" = disposable,
// holds only worthless devnet SOL, safe to commit.
//
// This is NOT faking the chain. Tenant and landlord are genuinely two distinct
// addresses sending genuinely separate signed transactions to devnet. The only
// shortcut is where the private keys live. In production this would be Phantom.
//
// WHY FIXED SEEDS RATHER THAN RANDOM?
// The keypairs are derived from the constants below, so the browser and
// `scripts/fund-demo.ts` independently arrive at the same two addresses. That
// means the funding script can top them up without anyone copying addresses
// out of localStorage, and the funding survives a browser reset.
import { Keypair } from "@solana/web3.js";

// Devnet-only throwaway seeds. Never put anything of value behind these.
const TENANT_SEED = Uint8Array.from([
  169, 34, 27, 41, 149, 17, 43, 206, 67, 16, 179, 110, 33, 129, 76, 13, 237,
  127, 17, 167, 55, 51, 109, 199, 202, 90, 93, 110, 13, 250, 246, 25,
]);
const LANDLORD_SEED = Uint8Array.from([
  185, 119, 183, 221, 196, 169, 238, 84, 11, 24, 206, 162, 35, 238, 222, 225,
  255, 35, 103, 100, 63, 249, 243, 55, 220, 158, 193, 77, 155, 193, 186, 107,
]);

export const TENANT = Keypair.fromSeed(TENANT_SEED);
export const LANDLORD = Keypair.fromSeed(LANDLORD_SEED);
export const ARBITRATOR = Keypair.fromSeed(
  Uint8Array.from(Array.from({ length: 32 }, (_, i) => (i * 73 + 19) % 256))
);

const LEASE_KEY = "depositlock.leaseId.v1";

export interface DemoActors {
  tenant: Keypair;
  landlord: Keypair;
  arbitrator: Keypair;
  leaseId: number;
}

function readLeaseId(): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = window.localStorage.getItem(LEASE_KEY);
    return raw ? parseInt(raw, 10) : 1;
  } catch {
    return 1;
  }
}

function writeLeaseId(id: number) {
  try {
    window.localStorage.setItem(LEASE_KEY, String(id));
  } catch {
    /* private browsing -- the lease id just won't persist across reloads */
  }
}

export function loadActors(): DemoActors {
  return { tenant: TENANT, landlord: LANDLORD, arbitrator: ARBITRATOR, leaseId: readLeaseId() };
}

/**
 * Bump the lease id so the next escrow lands on a fresh PDA.
 *
 * A PDA's address is derived from its seeds, and one of ours is `leaseId`.
 * Bumping it is what makes the demo repeatable between judges without
 * colliding with an escrow that is still open.
 */
export function nextLease(): DemoActors {
  const id = readLeaseId() + 1;
  writeLeaseId(id);
  return loadActors();
}

export function resetLeaseCounter(): DemoActors {
  writeLeaseId(1);
  return loadActors();
}
