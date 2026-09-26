import type {
  ActivityEvent,
  ActivityType,
  DemoAction,
  DemoState,
  DepositPhase,
} from "./deposit-types";

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const DEPOSIT_AMOUNT_LAMPORTS = LAMPORTS_PER_SOL;
export const INITIAL_BALANCE_LAMPORTS = 3_500_000_000;
export const REVIEW_DURATION_MS = 10_000;
export const LEASE_DURATION_MS = 365 * 24 * 60 * 60 * 1_000;
export const DEMO_STORAGE_KEY = "depositlock.demo.v1";
export const MAX_DISPUTE_REASON_LENGTH = 500;

const MAX_DATE_MS = 8_640_000_000_000_000;
const MAX_EVENTS = 20;
const ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  "deposit",
  "review-started",
  "refund",
  "release",
  "dispute",
]);

export function createInitialDemoState(): DemoState {
  return {
    version: 1,
    funded: false,
    settled: false,
    disputed: false,
    amountLamports: DEPOSIT_AMOUNT_LAMPORTS,
    balanceLamports: INITIAL_BALANCE_LAMPORTS,
    leaseEnd: null,
    reviewDeadline: null,
    disputeReason: null,
    activity: [],
  };
}

/** A countdown reaching zero makes a refund available; it never transfers funds. */
export function getDemoPhase(state: DemoState, now: number): DepositPhase {
  if (!state.funded) return "awaiting";
  if (state.settled) return "refunded";
  if (state.disputed) return "disputed";
  if (state.leaseEnd === null || now < state.leaseEnd) return "locked";
  if (state.reviewDeadline !== null && now >= state.reviewDeadline) {
    return "available";
  }
  return "review";
}

function addActivity(
  state: DemoState,
  type: ActivityType,
  now: number,
  title: string,
  description: string,
): DemoState {
  return {
    ...state,
    activity: [
      { id: `${type}-${now}-${state.activity.length}`, type, timestamp: now, title, description },
      ...state.activity,
    ].slice(0, MAX_EVENTS),
  };
}

function assertTimestamp(value: number): void {
  if (!isTimestamp(value)) {
    throw new Error("The demo clock is unavailable. Refresh the page and try again.");
  }
}

/** Pure transitions keep both the UI and its tests on the same lifecycle rules. */
export function transitionDemo(
  state: DemoState,
  action: DemoAction,
  now: number,
): DemoState {
  assertTimestamp(now);
  const phase = getDemoPhase(state, now);

  if (action.type === "start-review") {
    if (phase !== "locked") {
      throw new Error(
        !state.funded
          ? "Pay the demo deposit before starting the review."
          : "The review has already started. Reset the demo to start again.",
      );
    }
    return addActivity(
      { ...state, leaseEnd: now, reviewDeadline: now + REVIEW_DURATION_MS },
      "review-started",
      now,
      "Review window started",
      "The demo lease has ended. The landlord has 10 seconds to review the deposit.",
    );
  }

  const requiredRole = action.type === "deposit" || action.type === "refund" ? "tenant" : "landlord";
  if (action.role !== requiredRole) {
    throw new Error(`Switch to the ${requiredRole} view to complete this demo action.`);
  }

  switch (action.type) {
    case "deposit": {
      if (state.funded) throw new Error("This deposit has already been paid.");
      if (state.balanceLamports < state.amountLamports) {
        throw new Error("Your demo wallet does not have enough SOL. Reset the demo to try again.");
      }
      const leaseEnd = now + LEASE_DURATION_MS;
      return addActivity(
        {
          ...state,
          funded: true,
          balanceLamports: state.balanceLamports - state.amountLamports,
          leaseEnd,
          reviewDeadline: leaseEnd + REVIEW_DURATION_MS,
        },
        "deposit",
        now,
        "Deposit protected",
        "1 SOL moved from the demo wallet into the rental deposit.",
      );
    }
    case "refund": {
      if (state.disputed) {
        throw new Error("This deposit is disputed. Refunds are paused until the dispute is resolved.");
      }
      if (state.settled) throw new Error("This deposit has already been returned.");
      if (!state.funded) throw new Error("There is no deposit to return yet.");
      if (phase !== "available") throw new Error("The review window is still active. Please wait for the countdown to finish.");
      return addActivity(
        { ...state, settled: true, balanceLamports: state.balanceLamports + state.amountLamports },
        "refund",
        now,
        "Deposit returned",
        "1 SOL returned to the demo wallet after the review window ended.",
      );
    }
    case "release": {
      if (phase !== "review") {
        throw new Error("A landlord can approve an early return during an active, undisputed review.");
      }
      return addActivity(
        { ...state, settled: true, balanceLamports: state.balanceLamports + state.amountLamports },
        "release",
        now,
        "Return approved by landlord",
        "The landlord approved the full return. 1 SOL returned to the demo wallet.",
      );
    }
    case "dispute": {
      if (phase !== "review") {
        throw new Error("A dispute can only be submitted during the review window, before it expires.");
      }
      const reason = action.reason.trim();
      if (reason.length < 10) throw new Error("Describe the issue in at least 10 characters.");
      if (reason.length > MAX_DISPUTE_REASON_LENGTH) {
        throw new Error(`Keep the description to ${MAX_DISPUTE_REASON_LENGTH} characters or fewer.`);
      }
      return addActivity(
        { ...state, disputed: true, disputeReason: reason },
        "dispute",
        now,
        "Damage dispute submitted",
        reason,
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= MAX_DATE_MS - LEASE_DURATION_MS - REVIEW_DURATION_MS;
}

function parseActivity(value: unknown): ActivityEvent | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" || value.id.length === 0 || value.id.length > 100 ||
    typeof value.type !== "string" || !ACTIVITY_TYPES.has(value.type) ||
    !isTimestamp(value.timestamp) ||
    typeof value.title !== "string" || value.title.length === 0 || value.title.length > 100 ||
    typeof value.description !== "string" || value.description.length > MAX_DISPUTE_REASON_LENGTH
  ) return null;
  return {
    id: value.id,
    type: value.type as ActivityType,
    timestamp: value.timestamp,
    title: value.title,
    description: value.description,
  };
}

/** Invalid or older saved data falls back to a fresh demo rather than a broken UI. */
export function parseDemoState(raw: string | null): DemoState | null {
  if (!raw || raw.length > 30_000) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (
    !isRecord(value) || value.version !== 1 ||
    typeof value.funded !== "boolean" || typeof value.settled !== "boolean" || typeof value.disputed !== "boolean" ||
    value.amountLamports !== DEPOSIT_AMOUNT_LAMPORTS ||
    typeof value.balanceLamports !== "number" || !Number.isSafeInteger(value.balanceLamports) ||
    !Array.isArray(value.activity) || value.activity.length > MAX_EVENTS
  ) return null;

  const activity = value.activity.map(parseActivity);
  if (activity.some((event) => event === null)) return null;
  const parsedActivity = activity as ActivityEvent[];
  if (new Set(parsedActivity.map((event) => event.id)).size !== parsedActivity.length) return null;

  const expectedBalance = INITIAL_BALANCE_LAMPORTS - (value.funded && !value.settled ? DEPOSIT_AMOUNT_LAMPORTS : 0);
  if (value.balanceLamports !== expectedBalance || (value.settled && value.disputed)) return null;

  if (!value.funded) {
    if (value.settled || value.disputed || value.leaseEnd !== null || value.reviewDeadline !== null || value.disputeReason !== null || parsedActivity.length > 0) return null;
  } else {
    if (!isTimestamp(value.leaseEnd) || !isTimestamp(value.reviewDeadline) || value.reviewDeadline - value.leaseEnd !== REVIEW_DURATION_MS) return null;
    if (parsedActivity.filter((event) => event.type === "deposit").length !== 1) return null;
    if (parsedActivity.at(-1)?.type !== "deposit") return null;
  }

  if (value.disputed) {
    if (typeof value.disputeReason !== "string" || value.disputeReason.trim().length < 10 || value.disputeReason.length > MAX_DISPUTE_REASON_LENGTH || parsedActivity[0]?.type !== "dispute") return null;
  } else if (value.disputeReason !== null) return null;

  const settlementEvents = parsedActivity.filter((event) => event.type === "refund" || event.type === "release");
  if (value.settled ? settlementEvents.length !== 1 || !["refund", "release"].includes(parsedActivity[0]?.type) : settlementEvents.length !== 0) return null;
  if (!value.disputed && parsedActivity.some((event) => event.type === "dispute")) return null;

  return {
    version: 1,
    funded: value.funded,
    settled: value.settled,
    disputed: value.disputed,
    amountLamports: value.amountLamports,
    balanceLamports: value.balanceLamports,
    leaseEnd: value.leaseEnd as number | null,
    reviewDeadline: value.reviewDeadline as number | null,
    disputeReason: value.disputeReason as string | null,
    activity: parsedActivity,
  };
}
