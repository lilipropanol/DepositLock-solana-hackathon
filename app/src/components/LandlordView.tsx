"use client";

import { useState } from "react";
import { DEMO_PROPERTY } from "@/lib/constants";
import { Button, Card, Countdown, StatusBadge, sol } from "./ui";

export function LandlordView(
  e: ReturnType<typeof import("@/hooks/useEscrow").useEscrow>
) {
  const { escrow, phase, secondsLeft, busy } = e;
  const [showClaim, setShowClaim] = useState(false);

  return (
    <Card title="Landlord" subtitle={DEMO_PROPERTY}>
      <div className="space-y-6">
        <StatusBadge phase={phase} />

        {!escrow ? (
          <p className="text-sm text-white/60">
            No active lease. The tenant funds the escrow to begin.
          </p>
        ) : (
          <>
            <div className="rounded-xl bg-black/30 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-white/50">Deposit in escrow</span>
                <span className="font-mono text-2xl font-bold text-white">
                  ◎{sol(escrow.amountLamports)}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/40">
                You cannot withdraw this. Your only options are to return it, or
                to raise a claim before the window closes.
              </p>
            </div>

            <Countdown seconds={secondsLeft} phase={phase} />

            <div className="space-y-3">
              <Button onClick={e.release} disabled={!!busy} variant="ghost">
                {busy === "Releasing deposit"
                  ? "Releasing…"
                  : "Approve Return (100% to tenant)"}
              </Button>
              <Button
                onClick={() => setShowClaim((s) => !s)}
                variant="danger"
              >
                File a Damage Claim
              </Button>
            </div>

            {showClaim && (
              <div className="rounded-xl border border-dashed border-white/20 bg-black/20 p-4 text-sm">
                <p className="font-semibold text-white/80">
                  Not built — roadmap
                </p>
                <p className="mt-2 text-xs leading-relaxed text-white/50">
                  Designed: the landlord submits an itemised deduction plus an
                  IPFS hash of photos and receipts. The uncontested balance
                  returns to the tenant immediately; only the disputed amount
                  stays locked. If the tenant accepts, it settles on chain with
                  no third party. If they reject, an RTB adjudicator key —
                  agreed by both sides at signing — rules, and is capped at
                  awarding no more than the amount claimed.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
