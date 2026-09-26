'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { useApp } from './app-provider';
import { newChainLeaseId, type Lease, validAmount } from '@/lib/mobile/lease';
import { PrimaryButton, Shell, TopBar } from './ui';
export function CreateAgreement() {
  const router = useRouter();
  const { handleCreateLease, chainMode, walletAddress, connect } = useApp();
  const [address, setAddress] = useState('Apt 4B, Hanover Quay, Dublin 2');
  const [amount, setAmount] = useState('1');
  const [rent, setRent] = useState('2200');
  const [endDate, setEndDate] = useState('2027-06-30');
  const [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!address.trim() || address.trim().length > 200) { setError('Add an address under 200 characters.'); return; }
    if (!validAmount(amount)) { setError('Enter a deposit above 0 SOL, with up to 9 decimal places.'); return; }
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(rent) || Number(rent) <= 0) { setError('Enter a monthly rent above €0.'); return; }
    const parsed = Date.parse(`${endDate}T12:00:00`);
    if (!endDate || !Number.isFinite(parsed) || parsed <= Date.now()) { setError('Choose a future lease end date.'); return; }
    if (chainMode && !walletAddress) { connect(); setError('Connect the landlord wallet, then create the agreement.'); return; }
    const chainLeaseId = chainMode ? newChainLeaseId() : undefined;
    const id = chainLeaseId ? `lease-${chainLeaseId}` : globalThis.crypto?.randomUUID?.() ?? `lease-${Date.now()}`;
    const lease: Lease = { id, title: address.trim().split(',')[1]?.trim() || address.trim(), address: address.trim(), amount, rent, endDate, image: '/images/apartment.jpg', status: 'awaiting', backend: chainMode ? 'devnet' : 'demo', chainLeaseId, landlordWallet: walletAddress ?? undefined };
    handleCreateLease(lease); router.push(`/share/${id}`);
  }
  return <Shell nav={false}><TopBar back="/properties" title="New agreement" /><main className="m-page m-form-page"><span className="m-kicker">01 / CREATE</span><h1>Set up your<br />deposit agreement.</h1><p className="m-intro">Add the basic lease details. Your tenant will review them before making a deposit.</p><form onSubmit={submit} noValidate><label className="m-field" htmlFor="address"><span>Property address</span><input id="address" autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Apt 4B, Hanover Quay, Dublin 2" /></label><label className="m-field" htmlFor="rent"><span>Monthly rent</span><div className="m-input-unit"><input id="rent" type="text" inputMode="decimal" value={rent} onChange={e => setRent(e.target.value)} /><b>EUR</b></div></label><label className="m-field" htmlFor="amount"><span>Deposit amount</span><div className="m-input-unit"><input id="amount" type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} aria-describedby="amount-help" /><b>SOL</b></div><small id="amount-help">Devnet test SOL only</small></label><label className="m-field" htmlFor="end-date"><span>Lease end date</span><div className="m-input-unit"><input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div></label>{error && <p className="m-form-error" role="alert">{error}</p>}<div className="m-rule-note"><LockKeyhole size={20} /><p>{chainMode ? 'Devnet demo: the contract starts a 10-second review when the tenant funds this agreement. It does not wait for the lease date above.' : 'After the lease ends, the landlord has 14 days to raise an issue. If none is filed, the tenant can claim a full refund.'}</p></div><PrimaryButton type="submit">Create agreement</PrimaryButton></form></main></Shell>;
}
