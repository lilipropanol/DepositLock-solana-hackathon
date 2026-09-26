'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { type Lease, type LeaseAction, type Role, STORAGE_KEY, seedLeases, transitionLease, validAmount } from '@/lib/mobile/lease';
import { type ChainEscrow, claimEscrowRefund, explainChainError, fetchEscrowsForLandlord, fetchEscrowsForTenant, initializeAndFundEscrow, releaseEscrow } from '@/lib/solana/escrow';
import { DEPOSITLOCK_MODE, DEVNET_REVIEW_WINDOW_SECONDS } from '@/lib/solana/config';

const TRANSACTION_DELAY_MS = 600;

function statusFromChain(leaseEndTs: number, nowMs: number): Lease['status'] {
  return nowMs < leaseEndTs * 1000 ? 'active' : 'review';
}

function recordKey(tenant: string, landlord: string, leaseId: string) {
  return `${tenant}:${landlord}:${leaseId}`;
}

export function useMobileEscrow(openWalletPicker: () => void = () => undefined) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, disconnect: disconnectWallet } = useWallet();
  const chainMode = DEPOSITLOCK_MODE === 'devnet';
  const walletAddress = publicKey?.toBase58() ?? null;
  const [leases, setLeases] = useState<Lease[]>(() => chainMode ? [] : seedLeases());
  const [role, setRole] = useState<Role>('landlord');
  const [demoConnected, setDemoConnected] = useState(false);
  const connected = chainMode ? Boolean(walletAddress) : demoConnected;
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const latest = useRef(leases);
  latest.current = leases;
  const [storageError, setStorageError] = useState(false);
  const [chainError, setChainError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.leases)) {
          const saved = data.leases.filter((l: Lease) => l && typeof l.id === 'string' && typeof l.amount === 'string' && validAmount(l.amount) && typeof l.address === 'string' && typeof l.endDate === 'string' && ['awaiting','active','review','disputed','settled'].includes(l.status) && (chainMode ? l.backend === 'devnet' : (l.backend ?? 'demo') === 'demo'));
          setLeases(saved);
        }
        if (data.role === 'tenant' || data.role === 'landlord') setRole(data.role);
        if (!chainMode) setDemoConnected(data.connected === true);
      }
    } catch { setStorageError(true); }
    setReady(true);
  }, [chainMode]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ leases, role, connected: demoConnected })); }
    catch { setStorageError(true); }
  }, [leases, role, demoConnected, ready]);

  const updateLease = useCallback((id: string, patch: Partial<Lease>) => {
    const next = latest.current.map(lease => lease.id === id ? { ...lease, ...patch } : lease);
    latest.current = next;
    setLeases(next);
  }, []);

  function handleCreateLease(lease: Lease) {
    const created = chainMode ? { ...lease, backend: 'devnet' as const, landlordWallet: walletAddress ?? undefined } : { ...lease, backend: 'demo' as const };
    const next = [created, ...latest.current];
    latest.current = next;
    setLeases(next);
  }

  function importLease(lease: Lease) {
    if (latest.current.some(existing => existing.id === lease.id)) return;
    const next = [lease, ...latest.current];
    latest.current = next;
    setLeases(next);
  }

  async function transact(id: string, action: () => LeaseAction) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY_MS));
      const lease = latest.current.find(item => item.id === id);
      if (!lease) throw new Error('Agreement not found.');
      updateLease(id, transitionLease(lease, action()));
    } finally { lock.current = false; setBusy(false); }
  }

  function requireRole(expected: Role) {
    if (role !== expected) throw new Error(`Switch to the ${expected} view to continue.`);
    if (chainMode) {
      if (!walletAddress) throw new Error('Connect a Devnet wallet to continue.');
    } else if (!demoConnected) throw new Error(`Connect as ${expected} to continue this demo.`);
  }

  async function runChain<T>(action: () => Promise<T>) {
    if (lock.current) throw new Error('Another wallet request is still in progress.');
    lock.current = true;
    setBusy(true);
    setChainError('');
    try { return await action(); }
    catch (cause) {
      const message = explainChainError(cause);
      setChainError(message);
      throw new Error(message);
    } finally { lock.current = false; setBusy(false); }
  }

  const handleDepositSol = async (id: string) => {
    requireRole('tenant');
    const lease = latest.current.find(item => item.id === id);
    if (!lease) throw new Error('Agreement not found.');
    if (lease.backend !== 'devnet') return transact(id, () => ({ type: 'deposit' }));
    if (!chainMode || !walletAddress || !lease.landlordWallet || !lease.chainLeaseId) throw new Error('This invitation is missing its Devnet agreement details. Ask the landlord to create a new invitation.');
    if (walletAddress === lease.landlordWallet) throw new Error('Connect the tenant’s wallet. The landlord and tenant must use different wallets.');
    const leaseEndTs = Math.floor(Date.now() / 1000) + 2;
    const result = await runChain(() => initializeAndFundEscrow({
      connection,
      sendTransaction,
      tenant: walletAddress,
      landlord: lease.landlordWallet!,
      leaseId: lease.chainLeaseId!,
      amountSol: lease.amount,
      leaseEndTs,
      reviewWindowSecs: DEVNET_REVIEW_WINDOW_SECONDS,
    }));
    const deadline = (leaseEndTs + DEVNET_REVIEW_WINDOW_SECONDS) * 1000;
    updateLease(id, { status: statusFromChain(leaseEndTs, Date.now()), tenantWallet: walletAddress, tenant: `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`, escrowAddress: result.address, chainLeaseEndTs: leaseEndTs, reviewWindowSecs: DEVNET_REVIEW_WINDOW_SECONDS, deadline, lastSignature: result.signature });
  };

  const handleClaimRefund = async (id: string) => {
    requireRole('tenant');
    const lease = latest.current.find(item => item.id === id);
    if (!lease) throw new Error('Agreement not found.');
    if (lease.backend !== 'devnet') return transact(id, () => ({ type: 'refund', now: Date.now() }));
    if (!walletAddress || !lease.tenantWallet || walletAddress !== lease.tenantWallet || !lease.landlordWallet || !lease.chainLeaseId) throw new Error('Connect the tenant wallet used to fund this deposit.');
    const signature = await runChain(() => claimEscrowRefund({ connection, sendTransaction, caller: walletAddress, tenant: lease.tenantWallet!, landlord: lease.landlordWallet!, leaseId: lease.chainLeaseId! }));
    updateLease(id, { status: 'settled', settledAt: Date.now(), lastSignature: signature });
  };

  const handleRelease = async (id: string) => {
    requireRole('landlord');
    const lease = latest.current.find(item => item.id === id);
    if (!lease) throw new Error('Agreement not found.');
    if (lease.backend !== 'devnet') return transact(id, () => ({ type: 'release', now: Date.now() }));
    if (!walletAddress || walletAddress !== lease.landlordWallet || !lease.tenantWallet || !lease.chainLeaseId) throw new Error('Connect the landlord wallet attached to this agreement. The tenant must fund it first.');
    const signature = await runChain(() => releaseEscrow({ connection, sendTransaction, landlord: walletAddress, tenant: lease.tenantWallet!, leaseId: lease.chainLeaseId! }));
    updateLease(id, { status: 'settled', settledAt: Date.now(), lastSignature: signature });
  };

  const handleDispute = async (id: string, reason: string) => {
    const lease = latest.current.find(item => item.id === id);
    if (lease?.backend === 'devnet') throw new Error('The deployed Devnet program does not include issue reporting yet.');
    requireRole('landlord');
    return transact(id, () => ({ type: 'dispute', reason, now: Date.now() }));
  };

  function demoAction(id: string, type: 'review' | 'fast-forward') {
    const next = latest.current.map(lease => lease.id === id ? transitionLease(lease, { type, now: Date.now() }) : lease);
    latest.current = next;
    setLeases(next);
  }

  useEffect(() => {
    if (!chainMode || !ready || !walletAddress) return;
    let cancelled = false;
    let syncing = false;
    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const records: ChainEscrow[] = role === 'landlord'
          ? await fetchEscrowsForLandlord({ connection, landlord: walletAddress })
          : await fetchEscrowsForTenant({ connection, tenant: walletAddress });
        if (cancelled) return;
        const byId = new Map(records.map(record => [recordKey(record.tenant, record.landlord, record.leaseId), record]));
        const now = Date.now();
        const linkedKeys = new Set<string>();
        const next: Lease[] = latest.current.map((lease): Lease => {
          if (lease.backend !== 'devnet' || !lease.chainLeaseId || !lease.landlordWallet || (role === 'landlord' ? lease.landlordWallet !== walletAddress : lease.tenantWallet && lease.tenantWallet !== walletAddress)) return lease;
          const record = lease.tenantWallet
            ? byId.get(recordKey(lease.tenantWallet, lease.landlordWallet, lease.chainLeaseId))
            : records.find(candidate => candidate.leaseId === lease.chainLeaseId && candidate.landlord === lease.landlordWallet);
          if (!record) return lease.escrowAddress && lease.status !== 'settled' ? { ...lease, status: 'settled', settledAt: now } : lease;
          linkedKeys.add(recordKey(record.tenant, record.landlord, record.leaseId));
          const deadline = (record.leaseEndTs + record.reviewWindowSecs) * 1000;
          return { ...lease, amount: record.amountSol, tenantWallet: record.tenant, tenant: `${record.tenant.slice(0, 4)}…${record.tenant.slice(-4)}`, escrowAddress: record.address, chainLeaseEndTs: record.leaseEndTs, reviewWindowSecs: record.reviewWindowSecs, deadline, status: statusFromChain(record.leaseEndTs, now) };
        });
        const known = new Set([...linkedKeys, ...next.filter(lease => lease.backend === 'devnet' && lease.tenantWallet && lease.landlordWallet && lease.chainLeaseId).map(lease => recordKey(lease.tenantWallet!, lease.landlordWallet!, lease.chainLeaseId!))]);
        for (const record of records) {
          const key = recordKey(record.tenant, record.landlord, record.leaseId);
          if (known.has(key)) continue;
          const endDate = new Date(record.leaseEndTs * 1000).toISOString().slice(0, 10);
          next.unshift({
            id: `escrow-${record.leaseId}-${record.tenant.slice(0, 8)}`,
            title: 'Recovered Devnet escrow',
            address: `Property details are not on-chain · ${record.address.slice(0, 8)}…`,
            amount: record.amountSol,
            endDate,
            image: '/images/apartment.jpg',
            status: statusFromChain(record.leaseEndTs, now),
            tenant: `${record.tenant.slice(0, 4)}…${record.tenant.slice(-4)}`,
            tenantWallet: record.tenant,
            landlordWallet: record.landlord,
            chainLeaseId: record.leaseId,
            chainLeaseEndTs: record.leaseEndTs,
            reviewWindowSecs: record.reviewWindowSecs,
            deadline: (record.leaseEndTs + record.reviewWindowSecs) * 1000,
            escrowAddress: record.address,
            backend: 'devnet',
            metadataMissing: true,
          });
          known.add(key);
        }
        latest.current = next;
        setLeases(next);
        setChainError('');
      } catch (cause) {
        if (!cancelled) setChainError(explainChainError(cause));
      } finally {
        syncing = false;
      }
    };
    void sync();
    const timer = setInterval(() => { void sync(); }, 4_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [chainMode, connection, ready, role, walletAddress]);

  return {
    leases, role, setRole, connected, walletAddress, ready, busy, storageError, chainError,
    chainMode, lastSignature: leases.find(lease => lease.lastSignature)?.lastSignature ?? null,
    handleCreateLease, importLease, handleDepositSol, handleClaimRefund, handleRelease, handleDispute, demoAction,
    connect: () => chainMode ? openWalletPicker() : setDemoConnected(true),
    disconnect: () => chainMode ? void disconnectWallet() : setDemoConnected(false),
  };
}
