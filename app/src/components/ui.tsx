"use client";

import { LAMPORTS_PER_SOL, explorerAddr, explorerTx } from "@/lib/constants";
import { Phase } from "@/lib/escrowClient";

export const sol = (lamports: number) =>
  (lamports / LAMPORTS_PER_SOL).toFixed(4);

export function Card({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 ${
        accent
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const PHASE_LABEL: Record<Phase, { text: string; cls: string }> = {
  none: { text: "NO ACTIVE LEASE", cls: "bg-white/10 text-white/60" },
  active: { text: "LOCKED IN ESCROW", cls: "bg-amber-500/15 text-amber-300" },
  review: {
    text: "LANDLORD REVIEW WINDOW",
    cls: "bg-sky-500/15 text-sky-300",
  },
  expired: {
    text: "WINDOW EXPIRED — REFUND UNLOCKED",
    cls: "bg-emerald-500/15 text-emerald-300",
  },
};

export function StatusBadge({ phase }: { phase: Phase }) {
  const p = PHASE_LABEL[phase];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${p.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {p.text}
    </span>
  );
}

export function Countdown({
  seconds,
  phase,
}: {
  seconds: number;
  phase: Phase;
}) {
  if (phase === "none") return null;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const done = seconds === 0;
  return (
    <div className="text-center">
      <div
        className={`font-mono text-6xl font-bold tabular-nums ${
          done ? "text-emerald-400" : "text-white"
        }`}
      >
        {mm}:{ss}
      </div>
      <p className="mt-2 text-sm text-white/50">
        {done
          ? "The landlord did not respond. The refund is now claimable by anyone."
          : "Time left for the landlord to raise a claim"}
      </p>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  title?: string;
}) {
  const styles = {
    primary:
      "bg-emerald-500 text-black hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/30",
    ghost:
      "border border-white/15 text-white hover:bg-white/5 disabled:text-white/25",
    danger:
      "border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:text-white/25",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${styles}`}
    >
      {children}
    </button>
  );
}

export function Addr({ value, label }: { value: string; label: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-white/40">{label}</span>
      <a
        href={explorerAddr(value)}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-white/70 underline-offset-2 hover:underline"
      >
        {value.slice(0, 4)}…{value.slice(-4)}
      </a>
    </div>
  );
}

export function ExplorerLink({ sig }: { sig: string | null }) {
  if (!sig) return null;
  return (
    <a
      href={explorerTx(sig)}
      target="_blank"
      rel="noreferrer"
      className="mt-4 block rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-center text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
    >
      View transaction on Solana Explorer →
    </a>
  );
}
