'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, House, KeyRound, LockKeyhole, UserRound, Plus, Check, Clock3, CircleAlert, ChevronRight } from 'lucide-react';
import type { Lease, LeaseStatus } from '@/lib/mobile/lease';
import { dateLabel, formatSol, formatRent } from '@/lib/mobile/lease';
import { DEPOSITLOCK_MODE } from '@/lib/solana/config';
import { useApp } from './app-provider';
import type { ReactNode } from 'react';

export function Logo({ light = false }: { light?: boolean }) {
  return <span className={`m-logo ${light ? 'm-logo-light' : ''}`}><span className="m-logo-mark"><LockKeyhole size={15} strokeWidth={2.3} /></span>depositlock<span className="m-logo-dot">.</span></span>;
}
export function DevnetPill() { return <span className="m-devnet"><span aria-hidden="true" />{DEPOSITLOCK_MODE === 'devnet' ? 'SOLANA DEVNET' : 'DEMO MODE'}</span>; }
export function Shell({ children, nav = true, className = '' }: { children: ReactNode; nav?: boolean; className?: string }) {
  return <div className={`m-shell ${className}`}><div className="m-shell-inner">{children}</div>{nav && <BottomNav />}</div>;
}
export function TopBar({ back, title, right }: { back?: string; title?: string; right?: ReactNode }) {
  return <header className="m-topbar">{back ? <Link className="m-icon-button" href={back} aria-label="Go back"><ArrowLeft size={22} /></Link> : <Logo />}{title && <span className="m-topbar-title">{title}</span>}{right || <span className="m-topbar-spacer" />}</header>;
}
function BottomNav() {
  const { role } = useApp();
  const pathname = usePathname();
  const list = role === 'landlord' ? '/properties' : '/my-leases';
  return <nav className="m-bottom-nav" aria-label="Main navigation"><Link href={list} className={pathname === list ? 'is-current' : ''} aria-current={pathname === list ? 'page' : undefined}><House size={22} /><span>{role === 'landlord' ? 'Properties' : 'My leases'}</span></Link>{role === 'landlord' && <Link href="/create" className="m-nav-add" aria-label="Create agreement"><Plus size={26} /></Link>}<Link href="/account" className={pathname === '/account' ? 'is-current' : ''} aria-current={pathname === '/account' ? 'page' : undefined}><UserRound size={22} /><span>Account</span></Link></nav>;
}
export const statusCopy: Record<LeaseStatus, string> = { awaiting: 'Awaiting deposit', active: 'Secured', review: 'In review', disputed: 'Issue reported', settled: 'Completed' };
export function StatusPill({ status, deadline }: { status: LeaseStatus; deadline?: number }) {
  const available = status === 'review' && deadline !== undefined && Date.now() >= deadline;
  return <span className={`m-status m-status-${available ? 'available' : status}`}>{available ? <Check size={14} /> : status === 'active' ? <LockKeyhole size={14} /> : status === 'settled' ? <Check size={14} /> : status === 'disputed' ? <CircleAlert size={14} /> : <Clock3 size={14} />}{available ? 'Refund available' : statusCopy[status]}</span>;
}
export function PropertyCard({ lease, priority = false }: { lease: Lease; priority?: boolean }) {
  return <Link href={`/lease/${lease.id}`} className="m-property-card">
    <div className="m-property-photo">
      <Image src={lease.image} alt={`Property at ${lease.address}`} fill priority={priority} sizes="(max-width: 420px) 100vw, 420px" />
      <div className="m-property-status"><StatusPill status={lease.status} deadline={lease.deadline} /></div>
      <div className="m-property-overlay">
        <div className="m-property-copy"><h2>{lease.title}</h2><p>{lease.address}</p><span>{formatSol(lease.amount)} SOL deposit</span></div>
        <div className="m-property-rent"><strong>{lease.rent ? formatRent(lease.rent) : '—'}</strong><span>{lease.rent ? 'per month' : 'rent not stored'}</span></div>
      </div>
    </div>
  </Link>;
}
export function PrimaryButton({ children, onClick, disabled, busy, className = '', type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; className?: string; type?: 'button' | 'submit' }) {
  return <button type={type} className={`m-primary ${className}`} onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined}>{busy ? <><span className="m-spinner" /> Working…</> : children}</button>;
}
export function InlineLink({ href, children }: { href: string; children: ReactNode }) { return <Link className="m-inline-link" href={href}>{children}<ArrowRight size={17} /></Link>; }
export function LeaseFacts({ lease }: { lease: Lease }) { return <div className="m-facts"><div><span>Deposit</span><strong>{formatSol(lease.amount)} SOL</strong></div><div><span>Lease ends</span><strong>{dateLabel(lease.endDate)}</strong></div></div>; }
export { Image, Link, KeyRound, ArrowRight };
