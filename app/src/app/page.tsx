"use client";
import "@/lib/polyfills";

import { useState } from "react";
import { useEscrow } from "@/hooks/useEscrow";
import { TenantView } from "@/components/TenantView";
import { LandlordView } from "@/components/LandlordView";
import { Addr, Button } from "@/components/ui";
import { Role } from "@/lib/escrowClient";
import { DEMO_WINDOW_SECS, PROGRAM_ID, explorerAddr } from "@/lib/constants";

export default function Home() {
  const e = useEscrow();
  const [role, setRole] = useState<Role>("tenant");

  if (!e.ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0b] text-white/40">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0b] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">DepositLock</h1>
            {e.isMock && (
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
                MOCK MODE
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-white/50">
            A rental deposit held by a Solana program instead of a landlord. If
            the landlord raises no claim before the review window closes, the
            refund becomes claimable — by anyone — and can only ever pay the
            tenant.
          </p>
        </header>

        {/* Role switcher. Flips both the view and which burner keypair signs. */}
        <div className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {(["tenant", "landlord"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold capitalize transition ${
                role === r
                  ? "bg-white text-black"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {role === "tenant" ? <TenantView {...e} /> : <LandlordView {...e} />}

        {e.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-300">
            <span className="font-semibold">Error: </span>
            {e.error}
          </div>
        )}

        <footer className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Demo controls
            </span>
            <span className="text-xs text-white/40">
              review window: {DEMO_WINDOW_SECS}s (14 days in production)
            </span>
          </div>
          <div className="space-y-2">
            <Addr label="Tenant" value={e.addresses.tenant} />
            <Addr label="Landlord" value={e.addresses.landlord} />
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-white/40">Program</span>
              <a
                href={explorerAddr(PROGRAM_ID)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-white/70 underline-offset-2 hover:underline"
              >
                {PROGRAM_ID.slice(0, 4)}…{PROGRAM_ID.slice(-4)}
              </a>
            </div>
          </div>
          <Button onClick={e.resetDemo} variant="ghost" disabled={!!e.busy}>
            Reset Demo (new lease)
          </Button>
        </footer>
      </div>
    </main>
  );
}
