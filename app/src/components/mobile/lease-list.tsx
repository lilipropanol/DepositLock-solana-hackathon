'use client';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from './app-provider';
import { DevnetPill, Link, PropertyCard, Shell, TopBar } from './ui';
export function LeaseList({ variant }: { variant: 'landlord' | 'tenant' }) {
  const { leases, ready, storageError, walletAddress, chainMode } = useApp();
  const [tab, setTab] = useState<'current' | 'previous'>('current');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => leases.filter(lease => {
    const belongsToView = chainMode
      ? !walletAddress || (variant === 'landlord' ? lease.landlordWallet === walletAddress : lease.tenantWallet === walletAddress)
      : variant === 'landlord' || lease.tenant === 'Alex Morgan';
    return belongsToView && (tab === 'previous' ? lease.status === 'settled' : lease.status !== 'settled') && `${lease.title} ${lease.address}`.toLowerCase().includes(query.toLowerCase());
  }), [leases, variant, tab, query, chainMode, walletAddress]);
  return <Shell><TopBar right={<DevnetPill />} /><main className="m-page m-list-page"><h1 className="visually-hidden">{variant === 'landlord' ? 'Properties' : 'My leases'}</h1>{storageError && <p className="m-inline-alert" role="status">This browser is not saving demo progress. Keep this tab open while testing.</p>}<label className="m-search"><Search size={19} aria-hidden="true" /><span className="sr-only">Search by property or address</span><input type="search" placeholder="Search properties" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="m-tabs" role="group" aria-label="Lease status"><button className={tab === 'current' ? 'is-active' : ''} onClick={() => setTab('current')}>Current</button><button className={tab === 'previous' ? 'is-active' : ''} onClick={() => setTab('previous')}>Previous</button></div><div className="m-card-list">{ready ? rows.length ? rows.map((lease, index) => <PropertyCard key={lease.id} lease={lease} priority={index === 0} />) : <div className="m-empty"><h2>No {tab} {variant === 'landlord' ? 'properties' : 'leases'}</h2><p>{query ? 'Try another search.' : tab === 'previous' ? 'Completed deposits will appear here.' : 'Your agreements will appear here.'}</p>{variant === 'landlord' && tab === 'current' && !query && <Link href="/create" className="m-secondary-link">Create an agreement</Link>}</div> : <div className="m-loading" role="status">Loading your agreements…</div>}</div></main></Shell>;
}
