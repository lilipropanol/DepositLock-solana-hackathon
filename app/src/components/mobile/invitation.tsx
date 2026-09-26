'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck, LockKeyhole } from 'lucide-react';
import { useApp } from './app-provider';
import { parseInvite, formatSol, formatRent, dateLabel } from '@/lib/mobile/lease';
import { ConfirmSheet } from './confirm-sheet';
import { Image, LeaseFacts, PrimaryButton, Shell, TopBar } from './ui';
export function Invitation({ payload }: { payload: string }) {
  const router = useRouter();
  const { connected, connect, setRole, leases, importLease, handleDepositSol, busy, ready, chainMode } = useApp();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const parsed = parseInvite(payload);
  const lease = parsed && (leases.find(l => l.id === parsed.id) || parsed);
  if (!ready) return <Shell nav={false}><div className="m-loading">Loading invitation…</div></Shell>;
  if (!lease) return <Shell nav={false}><TopBar back="/" /><main className="m-page"><h1>Invalid invitation</h1><p>Ask the landlord for a new link.</p></main></Shell>;
  const selectedLease = lease;
  async function deposit() {
    setError('');
    try { importLease(selectedLease); await handleDepositSol(selectedLease.id); setOpen(false); router.push(`/lease/${selectedLease.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not complete demo deposit.'); }
  }
  return <Shell nav={false}><TopBar back="/" title="Invitation" /><main className="m-invite-page"><div className="m-invite-photo"><Image src={lease.image} alt={`Rental property at ${lease.address}`} fill priority sizes="(max-width: 420px) 100vw, 420px" /></div><div className="m-invite-content"><span className="m-kicker">A RENTAL DEPOSIT, MADE CLEAR</span><h1>You’re invited to<br />{lease.title}.</h1><p>{lease.address}</p><div className="m-invite-landlord"><span className="m-avatar">DL</span><span><strong>Your landlord</strong><small>{lease.landlordWallet ? `${lease.landlordWallet.slice(0, 6)}…${lease.landlordWallet.slice(-6)}` : 'DepositLock demo landlord'}</small></span><Check size={18} /></div><div className="m-deposit-teaser"><LockKeyhole size={23} /><div><strong>{formatSol(lease.amount)} SOL deposit</strong><span>Held under shared escrow rules</span></div></div><LeaseFacts lease={lease} /><div className="m-explainer"><ShieldCheck size={20} /><p>{lease.backend === 'devnet' ? 'The landlord can approve a full return. In this Devnet demo, the tenant can claim after the 10-second review. The program does not include issue claims or require the landlord to approve the invitation first.' : 'The landlord cannot take your deposit. They may approve a full return or raise an issue during the review window. If no issue is raised, you can claim it back after 14 days.'}</p></div>{lease.status === 'awaiting' ? <><PrimaryButton onClick={() => { if (connected) { setRole('tenant'); setOpen(true); } else { setRole('tenant'); connect(); } }}>{connected ? `Review ${formatSol(lease.amount)} SOL deposit` : chainMode ? 'Connect wallet' : 'Connect demo wallet'}</PrimaryButton><p className="m-under-button">{connected ? chainMode ? 'Your wallet will ask you to approve a Devnet transaction.' : 'You will confirm the simulated deposit on the next screen.' : chainMode ? 'Use a Devnet wallet with test SOL.' : 'Simulated connection · No wallet app required'}</p></> : <PrimaryButton onClick={() => router.push(`/lease/${lease.id}`)}>View deposit</PrimaryButton>}</div></main><ConfirmSheet open={open} onOpenChange={setOpen} title={chainMode ? 'Deposit on Devnet' : 'Confirm demo deposit'} description={chainMode ? 'Your wallet will create and fund the escrow on Solana Devnet.' : 'Review the terms before adding a simulated deposit.'} action={chainMode ? `Approve ${formatSol(lease.amount)} SOL deposit` : `Confirm ${formatSol(lease.amount)} SOL demo deposit`} onConfirm={deposit} busy={busy}><div className="m-sheet-facts"><div><span>Property</span><strong>{lease.address}</strong></div><div><span>Deposit</span><strong className="m-number">{formatSol(lease.amount)} SOL</strong></div><div><span>Lease ends</span><strong>{dateLabel(lease.endDate)}</strong></div></div><p className="m-sheet-disclaimer">{chainMode ? 'Devnet only. This uses test SOL, not real funds.' : 'Simulation only. No real SOL or wallet transaction.'}</p>{error && <p role="alert" className="m-form-error">{error}</p>}</ConfirmSheet></Shell>;
}
