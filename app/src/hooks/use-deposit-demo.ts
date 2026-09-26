"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialDemoState,
  DEMO_STORAGE_KEY,
  getDemoPhase,
  parseDemoState,
  transitionDemo,
} from "../lib/demo-engine";
import type {
  DemoAction,
  DemoRole,
  DemoState,
  DepositDemoController,
  TransactionAction,
  TransactionState,
} from "../lib/deposit-types";

const IDLE_TRANSACTION: TransactionState = {
  status: "idle",
  action: null,
  message: "",
  error: null,
};

const SUCCESS_MESSAGES: Record<TransactionAction, string> = {
  deposit: "Demo deposit confirmed. Your 1 SOL deposit is now locked.",
  refund: "Demo refund confirmed. 1 SOL has returned to your demo wallet.",
  release: "Demo return approved. 1 SOL has returned to the tenant’s demo wallet.",
  dispute: "Demo dispute submitted. The deposit is paused for review.",
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function readableError(error: unknown): Error {
  return error instanceof Error ? error : new Error("The demo action could not finish. Please try again.");
}

/** Browser simulation only: no wallet connection, signatures, or blockchain calls. */
export function useDepositDemo(): DepositDemoController {
  const [state, setState] = useState<DemoState>(createInitialDemoState);
  const [role, updateRole] = useState<DemoRole>("tenant");
  const [now, setNow] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>(IDLE_TRANSACTION);

  const stateRef = useRef(state);
  const roleRef = useRef(role);
  const mountedRef = useRef(false);
  const hydratedRef = useRef(false);
  const busyRef = useRef(false);
  const operationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    // The server and first client render both use initial values. Read browser
    // storage only after mount so a saved demo never causes hydration mismatch.
    queueMicrotask(() => {
      if (cancelled) return;
      let restored: DemoState | null = null;
      try {
        restored = parseDemoState(window.localStorage.getItem(DEMO_STORAGE_KEY));
      } catch {
        // Private browsing or a full storage quota must not block the demo.
      }
      const initial = restored ?? createInitialDemoState();
      stateRef.current = initial;
      setState(initial);
      setNow(Date.now());
      hydratedRef.current = true;
      setIsHydrated(true);
    });

    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      cancelled = true;
      mountedRef.current = false;
      hydratedRef.current = false;
      busyRef.current = false;
      operationRef.current += 1;
      window.clearInterval(timer);
    };
  }, []);

  const commit = useCallback((next: DemoState) => {
    stateRef.current = next;
    setState(next);
    setNow(Date.now());
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Continue in memory if this browser does not allow local persistence.
    }
  }, []);

  const runTransaction = useCallback(async (action: Exclude<DemoAction, { type: "start-review" }>) => {
    if (busyRef.current) throw new Error("Another demo action is still processing. Please wait.");
    const operation = ++operationRef.current;
    busyRef.current = true;

    try {
      if (!hydratedRef.current) throw new Error("Your demo is still loading. Try again in a moment.");
      // Validate before showing progress, then validate again at completion.
      // A dispute submitted too close to expiry can legitimately be too late.
      transitionDemo(stateRef.current, action, Date.now());
      setTransaction({
        status: "awaiting-approval",
        action: action.type,
        message: "Preparing your demo approval…",
        error: null,
      });
      await delay(350);
      if (!mountedRef.current || operation !== operationRef.current) return;
      setTransaction({
        status: "submitting",
        action: action.type,
        message: "Processing the demo transaction…",
        error: null,
      });
      await delay(650);
      if (!mountedRef.current || operation !== operationRef.current) return;

      const next = transitionDemo(stateRef.current, action, Date.now());
      commit(next);
      setTransaction({
        status: "confirmed",
        action: action.type,
        message: SUCCESS_MESSAGES[action.type],
        error: null,
      });
    } catch (error) {
      const failure = readableError(error);
      if (mountedRef.current && operation === operationRef.current) {
        setTransaction({ status: "error", action: action.type, message: failure.message, error: failure.message });
      }
      throw failure;
    } finally {
      if (operation === operationRef.current) busyRef.current = false;
    }
  }, [commit]);

  const deposit = useCallback(() => runTransaction({ type: "deposit", role: roleRef.current }), [runTransaction]);
  const claimRefund = useCallback(() => runTransaction({ type: "refund", role: roleRef.current }), [runTransaction]);
  const release = useCallback(() => runTransaction({ type: "release", role: roleRef.current }), [runTransaction]);
  const raiseDispute = useCallback((reason: string) => runTransaction({ type: "dispute", role: roleRef.current, reason }), [runTransaction]);

  const startReview = useCallback(() => {
    if (busyRef.current) throw new Error("Wait for the current demo action before starting the review.");
    try {
      if (!hydratedRef.current) throw new Error("Your demo is still loading. Try again in a moment.");
      commit(transitionDemo(stateRef.current, { type: "start-review" }, Date.now()));
      setTransaction(IDLE_TRANSACTION);
    } catch (error) {
      const failure = readableError(error);
      setTransaction({ status: "error", action: null, message: failure.message, error: failure.message });
      throw failure;
    }
  }, [commit]);

  const reset = useCallback(() => {
    if (busyRef.current || !hydratedRef.current) return;
    commit(createInitialDemoState());
    roleRef.current = "tenant";
    updateRole("tenant");
    setTransaction(IDLE_TRANSACTION);
  }, [commit]);

  const setRole = useCallback((next: DemoRole) => {
    if (busyRef.current) return;
    roleRef.current = next;
    updateRole(next);
    setTransaction(IDLE_TRANSACTION);
  }, []);

  const dismissTransaction = useCallback(() => {
    if (!busyRef.current) setTransaction(IDLE_TRANSACTION);
  }, []);

  return {
    state,
    phase: getDemoPhase(state, now),
    role,
    setRole,
    now,
    isHydrated,
    transaction,
    deposit,
    claimRefund,
    release,
    raiseDispute,
    startReview,
    reset,
    dismissTransaction,
  };
}
