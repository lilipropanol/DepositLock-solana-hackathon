import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createInitialDemoState,
  DEPOSIT_AMOUNT_LAMPORTS,
  getDemoPhase,
  INITIAL_BALANCE_LAMPORTS,
  LEASE_DURATION_MS,
  parseDemoState,
  REVIEW_DURATION_MS,
  transitionDemo,
} from "./demo-engine";
import type { DemoState } from "./deposit-types";

const START = Date.UTC(2026, 8, 25, 9);
const REVIEW_START = START + 20_000;

function funded(): DemoState {
  return transitionDemo(createInitialDemoState(), { type: "deposit", role: "tenant" }, START);
}

function reviewing(): DemoState {
  return transitionDemo(funded(), { type: "start-review" }, REVIEW_START);
}

function roundTrip(state: DemoState): DemoState | null {
  return parseDemoState(JSON.stringify(state));
}

test("funding locks exactly 1 SOL and leaves 2.5 SOL in the demo wallet", () => {
  const initial = createInitialDemoState();
  const original = structuredClone(initial);
  const state = transitionDemo(initial, { type: "deposit", role: "tenant" }, START);
  assert.deepEqual(initial, original, "the transition must not mutate its input");
  assert.equal(getDemoPhase(state, START), "locked");
  assert.equal(state.amountLamports, DEPOSIT_AMOUNT_LAMPORTS);
  assert.equal(state.balanceLamports, 2_500_000_000);
  assert.equal(state.leaseEnd, START + LEASE_DURATION_MS);
  assert.equal(state.reviewDeadline, START + LEASE_DURATION_MS + REVIEW_DURATION_MS);
  assert.throws(() => transitionDemo(state, { type: "deposit", role: "tenant" }, START + 1), /already been paid/);
});

test("review begins at the lease boundary and refund eligibility begins exactly at the deadline", () => {
  const state = reviewing();
  assert.equal(getDemoPhase(state, REVIEW_START - 1), "locked");
  assert.equal(getDemoPhase(state, REVIEW_START), "review");
  assert.equal(getDemoPhase(state, REVIEW_START + REVIEW_DURATION_MS - 1), "review");
  assert.equal(getDemoPhase(state, REVIEW_START + REVIEW_DURATION_MS), "available");
  assert.equal(state.settled, false, "a countdown cannot execute a refund");
  assert.throws(() => transitionDemo(state, { type: "refund", role: "tenant" }, REVIEW_START + REVIEW_DURATION_MS - 1), /still active/);
});

test("refund restores the original balance once, including after a reload beyond the deadline", () => {
  const restored = roundTrip(reviewing());
  assert.ok(restored);
  assert.equal(getDemoPhase(restored, REVIEW_START + REVIEW_DURATION_MS), "available");
  const returned = transitionDemo(restored, { type: "refund", role: "tenant" }, REVIEW_START + REVIEW_DURATION_MS);
  assert.equal(getDemoPhase(returned, REVIEW_START), "refunded");
  assert.equal(returned.balanceLamports, INITIAL_BALANCE_LAMPORTS);
  assert.equal(returned.activity[0].type, "refund");
  assert.throws(() => transitionDemo(returned, { type: "refund", role: "tenant" }, REVIEW_START + REVIEW_DURATION_MS + 1), /already been returned/);
  assert.deepEqual(roundTrip(returned), returned);
});

test("landlord release only succeeds during an undisputed review", () => {
  assert.throws(() => transitionDemo(funded(), { type: "release", role: "landlord" }, START), /during an active/);
  const state = reviewing();
  const returned = transitionDemo(state, { type: "release", role: "landlord" }, REVIEW_START);
  assert.equal(returned.balanceLamports, INITIAL_BALANCE_LAMPORTS);
  assert.equal(getDemoPhase(returned, REVIEW_START), "refunded");
  assert.throws(() => transitionDemo(state, { type: "release", role: "landlord" }, REVIEW_START + REVIEW_DURATION_MS), /during an active/);
  assert.deepEqual(roundTrip(returned), returned);
});

test("a dispute before expiry remains frozen after the deadline", () => {
  const state = reviewing();
  const disputed = transitionDemo(state, { type: "dispute", role: "landlord", reason: "  Broken bedroom window  " }, REVIEW_START + REVIEW_DURATION_MS - 1);
  assert.equal(disputed.disputeReason, "Broken bedroom window");
  assert.equal(getDemoPhase(disputed, REVIEW_START + REVIEW_DURATION_MS + 60_000), "disputed");
  assert.equal(disputed.balanceLamports, 2_500_000_000);
  assert.throws(() => transitionDemo(disputed, { type: "refund", role: "tenant" }, REVIEW_START + REVIEW_DURATION_MS), /disputed/);
  assert.throws(() => transitionDemo(disputed, { type: "release", role: "landlord" }, REVIEW_START), /undisputed/);
  assert.deepEqual(roundTrip(disputed), disputed);
});

test("a dispute submitted exactly at expiry is rejected and cannot race the refund", () => {
  const state = reviewing();
  assert.throws(() => transitionDemo(state, { type: "dispute", role: "landlord", reason: "Broken bedroom window" }, REVIEW_START + REVIEW_DURATION_MS), /before it expires/);
  assert.equal(state.disputed, false);
});

test("invalid and incomplete damage descriptions are rejected", () => {
  for (const reason of ["", "    ", "damage", "x".repeat(501)]) {
    assert.throws(() => transitionDemo(reviewing(), { type: "dispute", role: "landlord", reason }, REVIEW_START), /characters/);
  }
});

test("demo actions check the selected role", () => {
  assert.throws(() => transitionDemo(createInitialDemoState(), { type: "deposit", role: "landlord" }, START), /tenant view/);
  assert.throws(() => transitionDemo(reviewing(), { type: "refund", role: "landlord" }, REVIEW_START + REVIEW_DURATION_MS), /tenant view/);
  assert.throws(() => transitionDemo(reviewing(), { type: "release", role: "tenant" }, REVIEW_START), /landlord view/);
  assert.throws(() => transitionDemo(reviewing(), { type: "dispute", role: "tenant", reason: "Broken bedroom window" }, REVIEW_START), /landlord view/);
});

test("demo review control requires funding and cannot restart the countdown", () => {
  assert.throws(() => transitionDemo(createInitialDemoState(), { type: "start-review" }, START), /Pay the demo deposit/);
  const state = reviewing();
  assert.throws(() => transitionDemo(state, { type: "start-review" }, REVIEW_START + 1), /already started/);
  assert.throws(() => transitionDemo(state, { type: "start-review" }, REVIEW_START + REVIEW_DURATION_MS), /already started/);
  assert.equal(state.reviewDeadline, REVIEW_START + REVIEW_DURATION_MS);
});

test("fresh and funded demo states survive persistence", () => {
  for (const state of [createInitialDemoState(), funded(), reviewing()]) {
    assert.deepEqual(roundTrip(state), state);
  }
});

test("invalid JSON, old versions and malformed state are rejected safely", () => {
  for (const raw of [null, "", "{broken", "null", "[]", "42", "x".repeat(30_001)]) {
    assert.equal(parseDemoState(raw), null);
  }
  const valid = reviewing();
  const invalidStates = [
    {},
    { ...valid, version: 2 },
    { ...valid, funded: "yes" },
    { ...valid, amountLamports: 100 },
    { ...valid, balanceLamports: -1 },
    { ...valid, balanceLamports: INITIAL_BALANCE_LAMPORTS },
    { ...valid, leaseEnd: "yesterday" },
    { ...valid, reviewDeadline: null },
    { ...valid, reviewDeadline: REVIEW_START - 1 },
    { ...valid, reviewDeadline: REVIEW_START + 1 },
    { ...valid, leaseEnd: -1 },
    { ...valid, leaseEnd: 1.5 },
    { ...valid, settled: true, disputed: true },
    { ...valid, disputeReason: "Unrecorded dispute" },
    { ...valid, activity: [] },
    { ...valid, activity: [null] },
    { ...valid, activity: [...valid.activity, ...valid.activity] },
    { ...createInitialDemoState(), leaseEnd: START },
    { ...createInitialDemoState(), settled: true },
  ];
  for (const state of invalidStates) assert.equal(roundTrip(state as DemoState), null);
});

test("impossible clocks are rejected without changing the current state", () => {
  const state = createInitialDemoState();
  for (const now of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => transitionDemo(state, { type: "deposit", role: "tenant" }, now), /clock is unavailable/);
  }
  assert.equal(state.funded, false);
});
