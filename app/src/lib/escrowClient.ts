// The seam between the UI and the chain.
//
// Two implementations satisfy this interface: mockClient (in-memory, instant)
// and devnetClient (real transactions against the deployed program). The UI
// imports only this file and never knows which one it is talking to.

export type Role = "tenant" | "landlord";

/** Lifecycle phase. Derived from the clock -- never stored on chain. */
export type Phase = "none" | "active" | "review" | "expired";

export interface EscrowState {
  tenant: string;
  landlord: string;
  arbitrator: string;
  amountLamports: number;
  claimedAmountLamports: number;
  evidenceHash: string;
  status: "active" | "claimed" | "rejected";
  leaseEndTs: number;
  disputeWindowSecs: number;
  leaseId: number;
}

export interface Balances {
  tenant: number;
  landlord: number;
  escrow: number;
}

export interface CreateParams {
  amountSol: number;
  leaseEndTs: number;
  disputeWindowSecs: number;
  arbitrator: string;
}

export interface EscrowClient {
  readonly isMock: boolean;
  tenantAddress(): string;
  landlordAddress(): string;
  arbitratorAddress(): string;
  fetchEscrow(): Promise<EscrowState | null>;
  fetchBalances(): Promise<Balances>;
  createAndFund(p: CreateParams): Promise<string>;
  release(): Promise<string>;
  claimRefund(): Promise<string>;
  submitClaim(amountLamports: number, evidenceHash: Uint8Array): Promise<string>;
  acceptDeduction(): Promise<string>;
  rejectDeduction(): Promise<string>;
  arbitrate(awardLamports: number): Promise<string>;
  settleMutually(splitLamports: number): Promise<string>;
  /** Fresh actors and a fresh lease id, so the demo can be run again. */
  resetDemo(): Promise<void>;
}

/**
 * The one piece of business logic shared by the program and the UI.
 *
 * A Solana program cannot wake itself up when a deadline passes -- it only runs
 * when someone sends it a transaction. So "the review window is open" can never
 * be a stored flag; it is always computed by comparing the clock to the lease
 * terms. This function is the TypeScript half of that, and mirrors the guard in
 * `claim_refund`.
 */
export function derivePhase(escrow: EscrowState | null, nowSecs: number): Phase {
  if (!escrow) return "none";
  const deadline = escrow.leaseEndTs + escrow.disputeWindowSecs;
  if (nowSecs < escrow.leaseEndTs) return "active";
  if (nowSecs < deadline) return "review";
  return "expired";
}

export function secondsUntilRefund(
  escrow: EscrowState | null,
  nowSecs: number
): number {
  if (!escrow) return 0;
  return Math.max(0, escrow.leaseEndTs + escrow.disputeWindowSecs - nowSecs);
}
