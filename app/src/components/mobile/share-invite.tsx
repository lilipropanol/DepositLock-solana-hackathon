'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, MessageCircle, Clock3 } from 'lucide-react';
import { useApp } from './app-provider';
import { invitePayload, formatSol } from '@/lib/mobile/lease';
import { InlineLink, Link, PrimaryButton, Shell, TopBar } from './ui';
export function ShareInvite({ id }: { id: string }) {
  const { leases, ready, setRole } = useApp();
  const router = useRouter();
  const lease = leases.find(l => l.id === id);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (lease) setUrl(`${window.location.origin}/invite/${invitePayload(lease)}`); }, [lease]);
  if (!ready) return <Shell nav={false}><div className="m-loading">Loading invitation…</div></Shell>;
  if (!lease) return <Shell nav={false}><TopBar back="/properties" /><main className="m-page"><h1>Agreement not found</h1><InlineLink href="/properties">Back to properties</InlineLink></main></Shell>;
  async function copy() { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } }
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${lease.backend === 'devnet' ? 'Review my DepositLock rental agreement' : 'Review my DepositLock demo agreement'}: ${url}`)}`;
  return <Shell nav={false}><TopBar back={`/lease/${id}`} title="Share invitation" /><main className="m-page m-share-page"><div className="m-success-icon"><Check size={28} /></div><span className="m-kicker">02 / INVITE</span><h1>Agreement ready<br />for your tenant.</h1><p>Send the link or let them scan the code to review the deposit terms.</p><div className="m-share-card"><div className="m-qr">{url && <QRCodeSVG value={url} size={180} level="M" marginSize={0} title="Scan to open tenant invitation" />}</div><h2>{lease.title}</h2><p>{lease.address}</p><div className="m-share-amount">{formatSol(lease.amount)} SOL <span>deposit</span></div></div><div className="m-copy-row"><input aria-label="Invitation link" readOnly value={url} onFocus={e => e.currentTarget.select()} /><button aria-label="Copy invitation link" onClick={copy}>{copied ? <Check size={19} /> : <Copy size={19} />}</button></div>{copied && <p role="status" className="m-copied">Link copied</p>}<div className="m-share-actions"><PrimaryButton onClick={copy}><Copy size={18} /> Copy link</PrimaryButton><a className="m-outline-button" href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Share via WhatsApp</a></div><div className="m-waiting"><Clock3 size={18} /> Waiting for tenant to deposit</div><p className="m-share-caption">{lease.backend === 'devnet' ? 'The deposit and review timer run on Devnet. Property address and rent remain in this invite link.' : 'This is a browser-only demo link. Changes made on another phone will not sync back to this one.'}</p><button className="m-inline-link m-demo-switch" onClick={() => { setRole('tenant'); router.push(`/invite/${invitePayload(lease)}`); }}>Open tenant view →</button><Link className="m-back-link" href="/properties">Back to properties</Link></main></Shell>;
}
