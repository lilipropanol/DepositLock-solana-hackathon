"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { useDepositDemo } from "@/hooks/use-deposit-demo";
import type { ActivityEvent, DemoRole, DepositPhase, TransactionAction } from "@/lib/deposit-types";
import { MAX_DISPUTE_REASON_LENGTH, REVIEW_DURATION_MS } from "@/lib/demo-engine";
import { formatDate, formatSol, formatTime, getCountdown } from "@/lib/format";

type DialogAction = TransactionAction | null;

const phaseDetails: Record<DepositPhase, { label: string; title: string; description: string }> = {
  awaiting: {
    label: "Awaiting deposit",
    title: "The deposit has not been added yet",
    description: "The tenant can add 1 test SOL to start this example lease.",
  },
  locked: {
    label: "Held for this lease",
    title: "Your deposit is held until the tenancy ends",
    description: "The tenant and landlord cannot withdraw it during the tenancy.",
  },
  review: {
    label: "Review period open",
    title: "The landlord is reviewing the deposit",
    description: "The landlord can approve a full return or submit a damage claim before the timer ends.",
  },
  available: {
    label: "Ready to return",
    title: "The full refund is ready",
    description: "The review period ended without a claim. The tenant can now claim the full deposit.",
  },
  refunded: {
    label: "Returned",
    title: "The deposit has been returned",
    description: "The full amount is back in the tenant’s demo wallet.",
  },
  disputed: {
    label: "Claim submitted",
    title: "The return is paused",
    description: "A landlord claim was recorded. This prototype does not decide disputes or move the money.",
  },
};

function activityIcon(event: ActivityEvent) {
  if (event.type === "deposit") return <ArrowUpRight size={16} aria-hidden="true" />;
  if (event.type === "refund" || event.type === "release") return <ArrowDownLeft size={16} aria-hidden="true" />;
  if (event.type === "dispute") return <FileText size={16} aria-hidden="true" />;
  return <Clock3 size={16} aria-hidden="true" />;
}

function Countdown({ deadline, now }: { deadline: number | null; now: number }) {
  const [minutes, seconds] = getCountdown(deadline, now).slice(2);
  return (
    <div className="countdown" role="timer" aria-label={minutes + " minutes and " + seconds + " seconds remaining"}>
      <span className="countdown-value">{minutes}<small>min</small></span>
      <span className="countdown-separator" aria-hidden="true">:</span>
      <span className="countdown-value">{seconds}<small>sec</small></span>
    </div>
  );
}

export function DepositDashboard() {
  const demo = useDepositDemo();
  const [connectedRole, setConnectedRole] = useState<DemoRole | null>(null);
  const [dialog, setDialog] = useState<DialogAction>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const busy = demo.transaction.status === "awaiting-approval" || demo.transaction.status === "submitting";
  const walletReady = connectedRole === demo.role;
  const ready = demo.isHydrated && !busy && walletReady;
  const phase = demo.phase;
  const detail = phaseDetails[phase];
  const reviewSeconds = REVIEW_DURATION_MS / 1_000;

  function chooseRole(role: DemoRole) {
    if (busy || role === demo.role) return;
    demo.setRole(role);
    setConnectedRole(null);
    setDialog(null);
  }

  async function confirmAction() {
    try {
      if (dialog === "deposit") await demo.deposit();
      if (dialog === "refund") await demo.claimRefund();
      if (dialog === "release") await demo.release();
      if (dialog === "dispute") await demo.raiseDispute(disputeReason);
      setDialog(null);
      setDisputeReason("");
    } catch {
      // The demo hook displays a readable error in the feedback banner.
    }
  }

  function startReview() {
    try {
      demo.startReview();
    } catch {
      // The demo hook displays a readable error in the feedback banner.
    }
  }

  function resetDemo() {
    demo.reset();
    setConnectedRole(null);
    setDialog(null);
    setDisputeReason("");
  }

  const dialogTitle =
    dialog === "deposit" ? "Add the demo deposit" :
    dialog === "refund" ? "Claim the full refund" :
    dialog === "release" ? "Approve the full return" :
    "Submit a damage claim";
  const dialogDescription =
    dialog === "deposit" ? "This will move 1 test SOL in the browser simulation." :
    dialog === "refund" ? "This will return the full 1 test SOL to the tenant’s simulated wallet." :
    dialog === "release" ? "This will return the full 1 test SOL to the tenant’s simulated wallet now." :
    "A claim pauses the simulated return. This prototype does not resolve disputes.";

  return (
    <div className="demo-page">
      <header className="demo-header">
        <div className="demo-header-inner">
          <Link className="brand" href="/" aria-label="DepositLock home">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>Deposit<span className="brand-light">Lock</span></span>
          </Link>
          <nav className="demo-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><ChevronRight size={13} aria-hidden="true" /><span>Example lease</span>
          </nav>
          <div className="demo-header-actions">
            <div className="role-control">
              <span className="role-control-label">Demo as</span>
              <div className="segmented" role="group" aria-label="Preview the tenant or landlord account">
                <button type="button" className={demo.role === "tenant" ? "selected" : ""} onClick={() => chooseRole("tenant")} aria-pressed={demo.role === "tenant"} disabled={busy}>Tenant</button>
                <button type="button" className={demo.role === "landlord" ? "selected" : ""} onClick={() => chooseRole("landlord")} aria-pressed={demo.role === "landlord"} disabled={busy}>Landlord</button>
              </div>
            </div>
            <button
              className={"wallet-button" + (walletReady ? " wallet-connected" : "")}
              type="button"
              onClick={() => setConnectedRole(walletReady ? null : demo.role)}
              disabled={busy || !demo.isHydrated}
              aria-label={walletReady ? "Disconnect " + demo.role + " demo wallet" : "Connect " + demo.role + " demo wallet"}
              title={walletReady ? "Demo wallet connected · preview only" : "Connect demo wallet · preview only"}
            >
              <Wallet size={16} aria-hidden="true" />
              <span>{walletReady ? (demo.role === "tenant" ? "Tenant demo wallet" : "Landlord demo wallet") : "Connect demo wallet"}</span>
              {walletReady && <Check size={15} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main className="demo-main" aria-busy={!demo.isHydrated}>
        <div className="lease-heading">
          <p className="eyebrow">SINGLE-LEASE PREVIEW</p>
          <h1>Security deposit</h1>
          <p className="lease-subtitle"><MapPin size={16} aria-hidden="true" /><span>Modern 2-Bed · Grand Canal Dock, Dublin 2</span></p>
        </div>

        <section className="deposit-panel" aria-labelledby="deposit-title">
          <div className="deposit-panel-top">
            <span className="deposit-type"><LockKeyhole size={15} aria-hidden="true" /> DEPOSIT FOR THIS LEASE</span>
            <span className={"status-badge status-" + phase}><span />{detail.label}</span>
          </div>

          <div className="deposit-total"><strong className="number">{formatSol(demo.state.amountLamports)}</strong><span>SOL</span><small>test funds</small></div>
          <div className="deposit-rule" />
          <h2 id="deposit-title">{detail.title}</h2>
          <p className="deposit-description">{detail.description}</p>

          {phase === "locked" && (
            <div className="state-note"><CalendarDays size={17} aria-hidden="true" /><span><small>Tenancy ends</small><strong>{formatDate(demo.state.leaseEnd)}</strong></span></div>
          )}
          {phase === "review" && (
            <div className="review-box"><span><Clock3 size={16} aria-hidden="true" /> TIME LEFT TO REVIEW</span><Countdown deadline={demo.state.reviewDeadline} now={demo.now} /><small>{reviewSeconds}-second demo · the product concept uses a longer review period</small></div>
          )}
          {phase === "available" && <div className="state-message"><CheckCircle2 size={18} aria-hidden="true" /> No claim was submitted before the review timer ended.</div>}
          {phase === "refunded" && <div className="state-message"><CheckCircle2 size={18} aria-hidden="true" /> The full demo deposit has been returned.</div>}
          {phase === "disputed" && demo.state.disputeReason && <div className="claim-box"><span>LANDLORD’S CLAIM</span><p>{demo.state.disputeReason}</p></div>}

          <div className="primary-action">
            {demo.role === "tenant" && phase === "awaiting" && (
              <>
                <button className="button button-dark button-wide" type="button" disabled={!ready} onClick={() => setDialog("deposit")}>Add 1 SOL demo deposit <ArrowRight size={17} aria-hidden="true" /></button>
                {!walletReady && <p className="action-caption">Connect the demo wallet in the top bar to continue.</p>}
              </>
            )}
            {demo.role === "tenant" && phase === "locked" && <button className="button button-disabled button-wide" type="button" disabled><LockKeyhole size={15} aria-hidden="true" /> Refund available after tenancy ends</button>}
            {demo.role === "tenant" && phase === "review" && <button className="button button-disabled button-wide" type="button" disabled><LockKeyhole size={15} aria-hidden="true" /> Refund unlocks when review ends</button>}
            {demo.role === "tenant" && phase === "available" && (
              <>
                <button className="button button-dark button-wide" type="button" disabled={!ready} onClick={() => setDialog("refund")}>Claim full refund <ArrowRight size={17} aria-hidden="true" /></button>
                {!walletReady && <p className="action-caption">Connect the tenant demo wallet in the top bar to continue.</p>}
              </>
            )}
            {demo.role === "landlord" && phase === "review" && (
              <>
                <button className="button button-dark button-wide" type="button" disabled={!ready} onClick={() => setDialog("release")}>Approve full return <ArrowRight size={17} aria-hidden="true" /></button>
                <button className="button button-outline button-wide" type="button" disabled={!ready} onClick={() => setDialog("dispute")}>Submit a damage claim</button>
                {!walletReady && <p className="action-caption">Connect the landlord demo wallet in the top bar to continue.</p>}
              </>
            )}
            {demo.role === "landlord" && phase === "awaiting" && <p className="action-caption action-explain">The tenant has not added a deposit yet.</p>}
            {demo.role === "landlord" && phase === "locked" && <p className="action-caption action-explain">You can review the deposit when the tenancy ends.</p>}
            {demo.role === "landlord" && phase === "available" && <p className="action-caption action-explain">The tenant can now claim the full refund.</p>}
            {phase === "refunded" && <p className="action-caption action-explain">This example lease is settled.</p>}
            {phase === "disputed" && <p className="action-caption action-explain">A real product needs a dispute resolution process before funds can be released.</p>}
          </div>

          <div className="deposit-footnote"><ShieldCheck size={14} aria-hidden="true" /> Browser simulation only · no real funds or blockchain transaction</div>
        </section>

        <dl className="lease-facts" aria-label="Example lease details">
          <div><dt>Property</dt><dd>Modern 2-Bed · Dublin 2</dd></div>
          <div><dt>Tenancy ends</dt><dd>{formatDate(demo.state.leaseEnd)}</dd></div>
          <div><dt>Review period</dt><dd>{reviewSeconds} seconds in this demo</dd></div>
        </dl>

        <details className="demo-tools">
          <summary><span><Clock3 size={15} aria-hidden="true" /> Demo controls</span><small>Skip the tenancy wait or reset this example</small></summary>
          <div className="demo-tools-content">
            <p>In a real tenancy the lease end date controls when review begins. This control skips straight to the short demo timer.</p>
            <button className="button button-outline" type="button" onClick={startReview} disabled={phase !== "locked" || busy || !demo.isHydrated}>Start {reviewSeconds}-second review <ArrowRight size={15} aria-hidden="true" /></button>
            <button className="reset-link" type="button" onClick={resetDemo} disabled={busy || !demo.isHydrated}><RotateCcw size={14} aria-hidden="true" /> Reset example</button>
          </div>
        </details>

        {demo.state.activity.length > 0 && (
          <details className="activity-details">
            <summary><span><FileText size={15} aria-hidden="true" /> Recent activity</span><small>{demo.state.activity.length} local demo {demo.state.activity.length === 1 ? "event" : "events"}</small></summary>
            <ol className="activity-list">
              {demo.state.activity.slice(0, 5).map((event) => (
                <li key={event.id}>
                  <span className="activity-icon">{activityIcon(event)}</span>
                  <span className="activity-copy"><strong>{event.title}</strong><small>{event.description}</small></span>
                  <time dateTime={new Date(event.timestamp).toISOString()}>{formatTime(event.timestamp)}</time>
                </li>
              ))}
            </ol>
          </details>
        )}

        <footer className="demo-footer"><span>DepositLock · hackathon prototype</span><Link href="/">Back to introduction <ArrowRight size={13} aria-hidden="true" /></Link></footer>
      </main>

      {demo.transaction.status !== "idle" && (
        <div className={"transaction-banner transaction-" + demo.transaction.status} role={demo.transaction.status === "error" ? "alert" : "status"} aria-live="polite">
          <span className="transaction-symbol">{demo.transaction.status === "confirmed" ? <CheckCircle2 size={19} aria-hidden="true" /> : <Clock3 size={19} aria-hidden="true" />}</span>
          <span><strong>{demo.transaction.status === "confirmed" ? "Demo step complete" : demo.transaction.status === "error" ? "Could not complete that step" : "Demo step in progress"}</strong><small>{demo.transaction.message}</small></span>
          {!busy && <button type="button" onClick={demo.dismissTransaction} aria-label="Dismiss message"><X size={18} aria-hidden="true" /></button>}
        </div>
      )}

      <Dialog.Root open={dialog !== null} onOpenChange={(open) => { if (!open && !busy) setDialog(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content" aria-describedby="dialog-description">
            <div className="dialog-top"><span className="dialog-symbol">{dialog === "dispute" ? <FileText size={21} aria-hidden="true" /> : <ShieldCheck size={21} aria-hidden="true" />}</span><Dialog.Close className="dialog-close" aria-label="Close dialog" disabled={busy}><X size={18} aria-hidden="true" /></Dialog.Close></div>
            <Dialog.Title>{dialogTitle}</Dialog.Title>
            <Dialog.Description id="dialog-description">{dialogDescription}</Dialog.Description>
            {dialog === "dispute" ? (
              <div className="field">
                <label htmlFor="claim-reason">Briefly describe the issue</label>
                <textarea id="claim-reason" value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} minLength={10} maxLength={MAX_DISPUTE_REASON_LENGTH} rows={4} placeholder="For example: A window is cracked and needs repair…" disabled={busy} />
                <small>{disputeReason.length} / {MAX_DISPUTE_REASON_LENGTH} characters · At least 10 required</small>
              </div>
            ) : (
              <div className="dialog-summary"><span>DEMO DEPOSIT</span><strong className="number">1 SOL <small>test funds</small></strong><span>PROPERTY</span><strong>Modern 2-Bed · Dublin 2</strong></div>
            )}
            <div className="dialog-note"><ShieldCheck size={15} aria-hidden="true" /> This action only changes the browser simulation.</div>
            {demo.transaction.status === "error" && <p className="dialog-error" role="alert">{demo.transaction.error}</p>}
            <div className="dialog-actions"><Dialog.Close asChild><button className="button button-secondary" type="button" disabled={busy}>Cancel</button></Dialog.Close><button className="button button-dark" type="button" disabled={busy || (dialog === "dispute" && disputeReason.trim().length < 10)} onClick={confirmAction}>{busy ? "Processing…" : dialog === "deposit" ? "Add demo deposit" : dialog === "refund" ? "Claim demo refund" : dialog === "release" ? "Approve return" : "Submit demo claim"}</button></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
