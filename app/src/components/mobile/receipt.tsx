'use client';
import { Check, ArrowRight } from 'lucide-react';
import { useApp } from './app-provider';
import { dateLabel, formatSol } from '@/lib/mobile/lease';
import { explorerAddress, explorerTx } from '@/lib/solana/config';
import { Link, PrimaryButton, Shell, TopBar } from './ui';
export function Receipt({ id }: { id: string }) {
  const { leases, role, ready } = useApp();
  const lease = leases.find(l => l.id === id);
  const list = role === 'landlord' ? '/properties' : '/my-leases';
  const isDevnet = lease?.backend === 'devnet';
  const devnetSignature = lease?.backend === 'devnet' ? lease.lastSignature : undefined;
  if (!ready) return <Shell nav={false}><div className="m-loading">Loading receipt…</div></Shell>;
  if (!lease || lease.status !== 'settled') return <Shell nav={false}><TopBar back={list} /><main className="m-page"><h1>Receipt unavailable</h1><p>This deposit has not been returned yet.</p><Link className="m-inline-link" href={list}>Back to your leases</Link></main></Shell>;
  return <Shell nav={false}><TopBar back={`/lease/${id}`} title="Receipt" /><main className="m-page m-receipt"><div className="m-receipt-art"><div><Check size={36} /></div></div><span className="m-kicker">DEPOSIT RETURNED</span><h1>A clean<br />finish.</h1><p>{devnetSignature ? 'The full deposit was returned by the DepositLock program on Devnet.' : isDevnet ? 'The escrow closed on Devnet and returned its balance to the tenant.' : 'The full deposit is marked as returned in this browser simulation.'}</p><div className="m-receipt-amount"><span>Returned to tenant</span><strong className="m-number">{formatSol(lease.amount)} SOL</strong></div><div className="m-receipt-lines"><div><span>Property</span><strong>{lease.address}</strong></div><div><span>{isDevnet && !devnetSignature ? 'Observed' : 'Date'}</span><strong>{dateLabel(lease.settledAt || Date.now())}</strong></div><div><span>Result</span><strong>Full refund</strong></div></div>{devnetSignature ? <a className="m-outline-button" href={explorerTx(devnetSignature)} target="_blank" rel="noreferrer">View transaction on Solana Explorer <ArrowRight size={18} /></a> : isDevnet && lease.escrowAddress ? <a className="m-outline-button" href={explorerAddress(lease.escrowAddress)} target="_blank" rel="noreferrer">View escrow history on Solana Explorer <ArrowRight size={18} /></a> : <div className="m-simulation-box">This is a demo receipt. No SOL moved, so there is no Solana Explorer transaction to show.</div>}<PrimaryButton onClick={() => window.location.assign(list)}>{role === 'landlord' ? 'Back to properties' : 'Back to my leases'} <ArrowRight size={18} /></PrimaryButton></main></Shell>;
}
