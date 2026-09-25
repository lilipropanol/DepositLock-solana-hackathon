"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getClient } from "@/lib/client";
import {
  Balances,
  EscrowState,
  Phase,
  derivePhase,
  secondsUntilRefund,
} from "@/lib/escrowClient";
import { DEMO_WINDOW_SECS, DEFAULT_DEPOSIT_SOL } from "@/lib/constants";

export function useEscrow() {
  const [ready, setReady] = useState(false);
  const [escrow, setEscrow] = useState<EscrowState | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [nowSecs, setNowSecs] = useState(() => Math.floor(Date.now() / 1000));
  const [busy, setBusy] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState({ tenant: "", landlord: "" });

  // The client touches localStorage and generates keypairs, so it must only be
  // constructed in the browser -- never during server rendering.
  const clientRef = useRef<ReturnType<typeof getClient> | null>(null);
  const client = () => {
    if (!clientRef.current) clientRef.current = getClient();
    return clientRef.current;
  };

  const refresh = useCallback(async () => {
    try {
      const c = client();
      const [e, b] = await Promise.all([c.fetchEscrow(), c.fetchBalances()]);
      setEscrow(e);
      setBalances(b);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    }
  }, []);

  useEffect(() => {
    const c = client();
    setAddresses({ tenant: c.tenantAddress(), landlord: c.landlordAddress() });
    setReady(true);
    refresh();
  }, [refresh]);

  // One second tick drives the countdown. The deadline itself comes from the
  // escrow's on-chain terms -- this only re-reads the clock.
  useEffect(() => {
    const t = setInterval(() => setNowSecs(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll chain state while an escrow is live.
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [ready, refresh]);

  const run = useCallback(
    async (label: string, fn: () => Promise<string>) => {
      setBusy(label);
      setError(null);
      try {
        const sig = await fn();
        setLastSig(sig);
        await refresh();
        return sig;
      } catch (err: any) {
        setError(err?.message ?? String(err));
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [refresh]
  );

  const createLease = useCallback(
    (amountSol = DEFAULT_DEPOSIT_SOL, windowSecs = DEMO_WINDOW_SECS) =>
      run("Funding escrow", () =>
        client().createAndFund({
          amountSol,
          // Lease ends immediately so the review window opens at once -- this
          // is the "Simulate Lease End" step from the demo script.
          leaseEndTs: Math.floor(Date.now() / 1000),
          disputeWindowSecs: windowSecs,
        })
      ),
    [run]
  );

  const release = useCallback(
    () => run("Releasing deposit", () => client().release()),
    [run]
  );

  const claimRefund = useCallback(
    () => run("Claiming refund", () => client().claimRefund()),
    [run]
  );

  const resetDemo = useCallback(async () => {
    setBusy("Resetting");
    await client().resetDemo();
    setLastSig(null);
    setError(null);
    await refresh();
    setBusy(null);
  }, [refresh]);

  const phase: Phase = derivePhase(escrow, nowSecs);
  const secondsLeft = secondsUntilRefund(escrow, nowSecs);

  return {
    ready,
    escrow,
    balances,
    phase,
    secondsLeft,
    busy,
    lastSig,
    error,
    addresses,
    isMock: clientRef.current?.isMock ?? false,
    createLease,
    release,
    claimRefund,
    resetDemo,
    refresh,
  };
}
