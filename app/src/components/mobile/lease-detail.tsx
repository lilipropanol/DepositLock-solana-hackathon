'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, FastForward, LockKeyhole, Share2, X } from 'lucide-react';
import { useApp } from './app-provider';
import { type Lease, dateLabel, formatRent, formatSol, invitePayload } from '@/lib/mobile/lease';
import { ConfirmSheet } from './confirm-sheet';
import { Image, Link, PrimaryButton, Shell, TopBar } from './ui';

function timeParts(remaining: number) {
  const sec = Math.max(0, Math.ceil(remaining / 1000));
  return [Math.floor(sec / 86400), Math.floor(sec % 86400 / 3600), Math.floor(sec % 3600 / 60), sec % 60];
}

function PropertyCover({ lease, onShare, shareNotice, back, showInvite }: { lease: Lease; onShare: () => void; shareNotice: string; back: string; showInvite: boolean }) {
  return <header className="m-detail-cover">
    <div className="m-detail-photo">
      <Image src={lease.image} alt={`Interior of the rental at ${lease.address}`} fill priority sizes="(max-width: 420px) 100vw, 420px" />
      <div className="m-detail-photo-shade" />
      <Link className="m-cover-action m-cover-back" href={back} aria-label="Back to properties"><ArrowLeft size={22} /></Link>
      {showInvite && <button className="m-cover-action m-cover-share" type="button" onClick={onShare} aria-label="Share tenant invitation"><Share2 size={20} /></button>}
      {shareNotice && <span className="m-share-feedback" role="status">{shareNotice}</span>}
    </div>
  </header>;
}

function DepositOverview({ lease, amount, unlocked, countdown }: { lease: Lease; amount: string; unlocked: boolean; countdown: number[] }) {
  const state = lease.status === 'awaiting'
    ? { title: 'Awaiting tenant deposit', detail: 'The tenant needs to accept the agreement and add the deposit.' }
      : lease.status === 'active'
      ? { title: 'Secured for this lease', detail: lease.backend === 'devnet' ? 'This Devnet demo uses a short timer; it does not enforce the selected lease date.' : 'The deposit remains locked until the lease review period.' }
      : lease.status === 'review'
        ? unlocked
          ? { title: 'Refund is available', detail: 'The review period ended without an issue report.' }
          : { title: 'Review in progress', detail: 'The tenant can claim the full deposit when this timer ends.' }
        : lease.status === 'disputed'
          ? { title: 'Return paused', detail: 'An issue was reported, so the deposit cannot be claimed yet.' }
        : { title: 'Deposit returned', detail: lease.backend === 'devnet' ? 'The escrow was closed on Devnet and its balance returned to the tenant.' : 'The full deposit was returned in this simulation.' };

  return <section className="m-detail-section" aria-labelledby="deposit-heading">
    <div className="m-section-title"><h2 id="deposit-heading">Deposit</h2><span>{lease.backend === 'devnet' ? 'Solana Devnet' : 'Demo'}</span></div>
    <article className={`m-deposit-card m-deposit-card-${lease.status}`}>
      <div className="m-deposit-card-top">
        <div className="m-deposit-amount"><span>Security deposit</span><strong>{amount}<small> SOL</small></strong></div>
        <span className={`m-detail-status m-detail-status-${lease.status}`}>{unlocked ? 'Refund available' : ({ awaiting: 'Awaiting deposit', active: 'Secured', review: 'In review', disputed: 'Issue reported', settled: 'Completed' }[lease.status])}</span>
      </div>
      <div className="m-deposit-state">
        <strong>{state.title}</strong><p>{state.detail}</p>
      </div>
      {lease.status === 'review' && <div className={`m-timer ${unlocked ? 'm-timer-done' : ''}`}>
        <div className="m-timer-label">{unlocked ? 'Review period complete' : 'Time left in review'}</div>
        <div className="m-timer-digits" aria-live="off">{countdown.map((value, index) => <div key={index}><strong>{String(value).padStart(2, '0')}</strong><span>{['days', 'hours', 'min', 'sec'][index]}</span></div>)}</div>
        <p>{unlocked ? 'The tenant may claim the full deposit.' : 'In this demo, the review lasts 10 seconds. The intended term is 14 days.'}</p>
      </div>}
      {lease.status === 'disputed' && <p className="m-issue-note"><strong>Reported issue:</strong> {lease.disputeReason}</p>}
    </article>
  </section>;
}

function AgreementSummary({ lease, role, onDemo }: { lease: Lease; role: 'tenant' | 'landlord'; onDemo: () => void }) {
  const personLabel = role === 'landlord' ? 'Tenant' : 'Landlord';
  const personName = role === 'landlord' ? lease.tenant || 'Not joined yet' : lease.landlordWallet ? `${lease.landlordWallet.slice(0, 6)}…${lease.landlordWallet.slice(-6)}` : 'Demo landlord';
  return <section className="m-detail-section m-lease-section" aria-labelledby="lease-heading">
    <div className="m-section-title"><h2 id="lease-heading">Lease details</h2></div>
    <div className="m-lease-rows">
      <div><span>{lease.metadataMissing ? 'Program timer starts' : 'Lease ends'}</span><strong>{dateLabel(lease.metadataMissing && lease.chainLeaseEndTs ? lease.chainLeaseEndTs * 1000 : lease.endDate)}</strong></div>
      <div><span>Monthly rent</span><strong>{lease.rent ? formatRent(lease.rent) : 'Not stored on-chain'}</strong></div>
      <div><span>{personLabel}</span><strong>{personName}{role === 'landlord' && !lease.tenant ? <small>Invitation sent</small> : null}</strong></div>
    </div>
    <details className="m-details"><summary>How the return works <ArrowRight size={16} aria-hidden="true" /></summary><p>{lease.backend === 'devnet' ? 'This Devnet program supports a full landlord release or a full tenant refund after the review timer. The timer is 10 seconds for this demo; the selected lease date and issue claims are not enforced on-chain.' : 'After the lease ends, the landlord has 14 days to report an issue. If none is reported, the tenant can claim the full deposit. This prototype shortens the review period to 10 seconds.'}</p></details>
    {lease.backend !== 'devnet' && (lease.status === 'active' || lease.status === 'review') && <button className="m-demo-control" type="button" onClick={onDemo}><FastForward size={17} aria-hidden="true" /> Demo controls</button>}
  </section>;
}

export function LeaseDetail({ id }: { id: string }) {
  const router = useRouter();
  const store = useApp();
  const { leases, ready, role, busy, demoAction, chainError, chainMode, connected } = store;
  const lease = leases.find(item => item.id === id);
  const [now, setNow] = useState(Date.now());
  const [dialog, setDialog] = useState<'refund' | 'release' | 'dispute' | 'demo' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    const update = () => setNow(Date.now());
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  if (!ready) return <Shell nav={false}><div className="m-loading">Loading deposit…</div></Shell>;
  if (!lease) return <Shell nav={false}><TopBar back={role === 'landlord' ? '/properties' : '/my-leases'} /><main className="m-page"><h1>Lease not found</h1><p>Open an agreement from your list or use the invitation link.</p></main></Shell>;
  const selectedLease = lease;

  const unlocked = lease.status === 'review' && lease.deadline !== undefined && now >= lease.deadline;
  const remaining = lease.deadline ? lease.deadline - now : 0;
  const [days, hours, minutes, seconds] = timeParts(remaining);
  const amount = formatSol(lease.amount);
  const listUrl = role === 'landlord' ? '/properties' : '/my-leases';

  async function shareLease() {
    setShareNotice('');
    try {
      const inviteUrl = `${window.location.origin}/invite/${invitePayload(selectedLease)}`;
      if (navigator.share) await navigator.share({ title: selectedLease.title, text: `Review the rental deposit terms for ${selectedLease.address}`, url: inviteUrl });
      else { await navigator.clipboard.writeText(inviteUrl); setShareNotice('Invitation copied'); }
    } catch (cause) {
      if (cause instanceof Error && cause.name !== 'AbortError') setShareNotice('Could not share link');
    }
  }

  async function act(kind: 'refund' | 'release' | 'dispute') {
    setError('');
    try {
      if (store.chainMode && !store.connected) { store.connect(); setError('Connect the agreement wallet, then try this action again.'); return; }
      if (kind === 'refund') await store.handleClaimRefund(id);
      if (kind === 'release') await store.handleRelease(id);
      if (kind === 'dispute') await store.handleDispute(id, reason);
      setDialog(null);
      if (kind !== 'dispute') router.push(`/receipt/${id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); }
  }

  return <Shell nav={false} className="m-detail-shell">
    <PropertyCover lease={lease} back={listUrl} onShare={shareLease} shareNotice={shareNotice} showInvite={role === 'landlord' && lease.status === 'awaiting'} />
    <main className="m-detail-content">
      <section className="m-detail-property-panel" aria-label="Property summary">
        <h1>{lease.title}</h1>
        <p>{lease.address}</p>
      </section>
      {chainError && <p className="m-chain-error" role="status">{chainError}</p>}
      <DepositOverview lease={lease} amount={amount} unlocked={unlocked} countdown={[days, hours, minutes, seconds]} />
      <AgreementSummary lease={lease} role={role} onDemo={() => setDialog('demo')} />
      <p className="m-detail-footnote">{lease.backend === 'devnet' ? 'Solana Devnet · Transactions use test SOL' : 'Browser simulation · No on-chain transaction or real SOL'}</p>
    </main>

    <div className="m-detail-actions">
      {lease.status === 'awaiting' ? role === 'landlord' ? <PrimaryButton onClick={() => router.push(`/share/${id}`)}>Share tenant invitation <ArrowRight size={18} /></PrimaryButton> : <PrimaryButton onClick={() => router.push(`/invite/${invitePayload(lease)}`)}>Review and deposit <ArrowRight size={18} /></PrimaryButton>
        : lease.status === 'active' ? role === 'landlord' ? <PrimaryButton onClick={() => setDialog('release')}>Release full deposit</PrimaryButton> : <div className="m-wait-message"><LockKeyhole size={18} /> Refund available after review</div>
        : lease.status === 'review' ? role === 'tenant' ? <PrimaryButton disabled={!unlocked} onClick={() => setDialog('refund')}>{unlocked ? <><Check size={19} /> Claim full refund</> : <><LockKeyhole size={18} /> Claim refund after review</>}</PrimaryButton> : <div className="m-action-pair"><PrimaryButton onClick={() => setDialog('release')}>Release deposit</PrimaryButton>{lease.backend === 'devnet' ? <span className="m-action-caption">Issue reporting is not in this program.</span> : <button className="m-quiet-action" disabled={unlocked} onClick={() => setDialog('dispute')}>Report an issue</button>}</div>
        : lease.status === 'disputed' ? role === 'landlord' ? <PrimaryButton onClick={() => setDialog('release')}>Release full deposit</PrimaryButton> : <div className="m-wait-message"><CircleAlert size={18} /> Refund paused while issue is open</div>
        : <PrimaryButton onClick={() => router.push(`/receipt/${id}`)}>View receipt <ArrowRight size={18} /></PrimaryButton>}
    </div>

    <ConfirmSheet open={dialog === 'refund'} onOpenChange={open => setDialog(open ? 'refund' : null)} title="Claim your full refund" description={chainMode ? `Your connected wallet will submit a claim for the ${amount} SOL Devnet deposit.` : `Return the simulated ${amount} SOL deposit to your demo wallet.`} action={`Claim ${amount} SOL refund`} onConfirm={() => act('refund')} busy={busy}>
      <p className="m-sheet-disclaimer">{chainMode ? 'Devnet only · Your wallet will ask you to approve the transaction.' : 'Simulation only · No real SOL will move.'}</p>{error && <p role="alert" className="m-form-error">{error}</p>}
    </ConfirmSheet>
    <ConfirmSheet open={dialog === 'release'} onOpenChange={open => setDialog(open ? 'release' : null)} title="Return the full deposit" description={chainMode ? `The landlord wallet will authorize returning ${amount} SOL to the tenant on Devnet.` : `Approve a simulated return of ${amount} SOL to the tenant.`} action="Release full deposit" onConfirm={() => act('release')} busy={busy}>
      <p className="m-sheet-disclaimer">{chainMode ? 'Devnet only · The transaction cannot be reversed.' : 'Simulation only · No real SOL will move.'}</p>{error && <p role="alert" className="m-form-error">{error}</p>}
    </ConfirmSheet>
    <ConfirmSheet open={dialog === 'dispute'} onOpenChange={open => setDialog(open ? 'dispute' : null)} title="Report an issue" description="Briefly describe the concern. This demo will pause the refund; evidence and resolution are not implemented." action="Submit issue" onConfirm={() => act('dispute')} busy={busy} disabled={!reason.trim()}>
      <label className="m-field" htmlFor="issue-reason"><span>Reason</span><textarea id="issue-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Describe the issue" rows={4} maxLength={500} /></label>{error && <p role="alert" className="m-form-error">{error}</p>}
    </ConfirmSheet>
    <Dialog.Root open={dialog === 'demo'} onOpenChange={open => setDialog(open ? 'demo' : null)}><Dialog.Portal><Dialog.Overlay className="m-dialog-overlay" /><Dialog.Content className="m-sheet"><div className="m-sheet-handle" /><Dialog.Close className="m-sheet-close" aria-label="Close"><X size={21} /></Dialog.Close><Dialog.Title className="m-sheet-title">Demo controls</Dialog.Title><Dialog.Description className="m-sheet-description">Change the simulated timeline to rehearse the refund. These controls are outside the real deposit flow.</Dialog.Description><div className="m-role-options">{lease.status === 'active' && <button onClick={() => { demoAction(id, 'review'); setDialog(null); }}><span><strong>Start 10-second review</strong><small>Simulate the lease ending</small></span><Clock3 size={19} /></button>}{lease.status === 'review' && <button onClick={() => { demoAction(id, 'fast-forward'); setDialog(null); }}><span><strong>Expire review now</strong><small>Unlock the tenant’s refund</small></span><FastForward size={19} /></button>}</div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </Shell>;
}
