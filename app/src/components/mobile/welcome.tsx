'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, ShieldCheck, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useApp } from './app-provider';
import { Image, Logo, PrimaryButton, Shell } from './ui';
export function Welcome() {
  const router = useRouter();
  const { connected, connect, setRole, role, chainMode } = useApp();
  const [open, setOpen] = useState(false);
  function enter(next: 'landlord' | 'tenant') { setRole(next); connect(); setOpen(false); router.push(next === 'landlord' ? '/properties' : '/my-leases'); }
  return <Shell nav={false} className="m-welcome-shell"><main className="m-welcome"><div className="m-welcome-photo"><Image src="/images/hero-dublin-evening.webp" alt="Dublin townhouse at dusk" fill priority sizes="(max-width: 420px) 100vw, 420px" /><div className="m-welcome-shade" /><div className="m-welcome-wordmark"><Logo light /><p>Your deposit, on your terms.</p></div></div><div className="m-welcome-panel"><div className="m-welcome-grip" /><span className="m-kicker"><ShieldCheck size={15} /> A clearer way to rent</span><h1>Make deposits<br /><em>feel simple.</em></h1><p>One place to set up, track and return a rental deposit. Both sides can see what happens next.</p><PrimaryButton onClick={() => setOpen(true)}><KeyRound size={18} /> {connected ? `Continue as ${role}` : chainMode ? 'Connect wallet' : 'Connect demo wallet'} <ArrowRight size={18} /></PrimaryButton><div className="m-simulation-note"><span aria-hidden="true" />{chainMode ? 'Solana Devnet · Test SOL only' : 'Browser simulation · No real wallet or funds'}</div></div></main><Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="m-dialog-overlay" /><Dialog.Content className="m-sheet"><div className="m-sheet-handle" /><Dialog.Close className="m-sheet-close" aria-label="Close"><X size={21} /></Dialog.Close><Dialog.Title className="m-sheet-title">How are you renting?</Dialog.Title><Dialog.Description className="m-sheet-description">Choose a view. You can switch roles later in Account.</Dialog.Description><div className="m-role-options"><button onClick={() => enter('landlord')}><span><strong>I’m a landlord</strong><small>Create agreements and manage deposits</small></span><ArrowRight size={19} /></button><button onClick={() => enter('tenant')}><span><strong>I’m a tenant</strong><small>View agreements and claim refunds</small></span><ArrowRight size={19} /></button></div></Dialog.Content></Dialog.Portal></Dialog.Root></Shell>;
}
