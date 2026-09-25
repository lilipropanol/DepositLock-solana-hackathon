"use client";

import { Phase } from "@/lib/escrowClient";
import { DEMO_PROPERTY } from "@/lib/constants";
import { Button, Card, Countdown, ExplorerLink, StatusBadge, sol } from "./ui";

export function TenantView(e: ReturnType<typeof import("@/hooks/useEscrow").useEscrow>) {
  const { escrow, phase, secondsLeft, busy, lastSig, balances } = e;
  const canWithdraw = phase === "expired" && !busy;

  return (
    <Card
      title="Tenant"
      subtitle={DEMO_PROPERTY}
      accent={phase === "expired"}
    >
      <div className="space-y-6">
        <StatusBadge phase={phase} />

        {!escrow ? (
          <div className="space-y-4">
            <p className="text-sm text-white/60">
              No active lease. Fund a deposit to lock it into the escrow program.
            </p>
            <Button onClick={() => e.createLease()} disabled={!!busy}>
              {busy === "Funding escrow" ? "Funding…" : "Deposit & Start Lease"}
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-black/30 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-white/50">Deposit held</span>
                <span className="font-mono text-2xl font-bold text-white">
                  ◎{sol(escrow.amountLamports)}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/40">
                Held by the program itself. No private key exists that can move
                it early — not the landlord&apos;s, not ours.
              </p>
            </div>

            <Countdown seconds={secondsLeft} phase={phase} />

            <Button onClick={e.claimRefund} disabled={!canWithdraw}>
              {busy === "Claiming refund"
                ? "Claiming…"
                : canWithdraw
                ? "Withdraw Deposit"
                : "Withdraw Deposit (locked)"}
            </Button>
            {!canWithdraw && phase !== "none" && (
              <p className="-mt-3 text-center text-xs text-white/40">
                The contract will reject this until the window expires.
              </p>
            )}
          </>
        )}

        {balances && (
          <div className="border-t border-white/10 pt-4 text-xs text-white/40">
            Wallet balance:{" "}
            <span className="font-mono text-white/70">
              ◎{sol(balances.tenant)}
            </span>
          </div>
        )}

        <ExplorerLink sig={lastSig} />
      </div>
    </Card>
  );
}
