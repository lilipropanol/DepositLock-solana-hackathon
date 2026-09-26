/** All timestamps in this browser demo are Unix milliseconds, like Date.now(). */
export type DepositPhase =
  | "awaiting"
  | "locked"
  | "review"
  | "available"
  | "refunded"
  | "disputed";

export type DemoRole = "tenant" | "landlord";

export type TransactionAction = "deposit" | "refund" | "release" | "dispute";

export type TransactionStatus =
  | "idle"
  | "awaiting-approval"
  | "submitting"
  | "confirmed"
  | "error";

export type ActivityType = TransactionAction | "review-started";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  timestamp: number;
  title: string;
  description: string;
}

export interface DemoState {
  version: 1;
  funded: boolean;
  settled: boolean;
  disputed: boolean;
  /** Lamports are SOL's smallest units. 1 SOL = 1,000,000,000 lamports. */
  amountLamports: number;
  balanceLamports: number;
  leaseEnd: number | null;
  reviewDeadline: number | null;
  disputeReason: string | null;
  /** Most recent event first. These are local demo events, not blockchain records. */
  activity: ActivityEvent[];
}

export interface TransactionState {
  status: TransactionStatus;
  action: TransactionAction | null;
  message: string;
  error: string | null;
}

export type DemoAction =
  | { type: "deposit" | "refund" | "release"; role: DemoRole }
  | { type: "dispute"; role: DemoRole; reason: string }
  | { type: "start-review" };

export interface DepositDemoController {
  state: DemoState;
  phase: DepositPhase;
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  now: number;
  isHydrated: boolean;
  transaction: TransactionState;
  deposit: () => Promise<void>;
  claimRefund: () => Promise<void>;
  release: () => Promise<void>;
  raiseDispute: (reason: string) => Promise<void>;
  startReview: () => void;
  reset: () => void;
  dismissTransaction: () => void;
}
