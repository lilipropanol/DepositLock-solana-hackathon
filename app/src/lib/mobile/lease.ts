export type Role = 'landlord' | 'tenant';
export type LeaseStatus = 'awaiting' | 'active' | 'review' | 'disputed' | 'settled';
export type LeaseBackend = 'demo' | 'devnet';
export type Lease = {
  id: string; title: string; address: string; amount: string; rent?: string; endDate: string;
  image: string; status: LeaseStatus; deadline?: number; settledAt?: number;
  tenant?: string; disputeReason?: string;
  backend?: LeaseBackend; chainLeaseId?: string; tenantWallet?: string; landlordWallet?: string;
  escrowAddress?: string; lastSignature?: string; chainLeaseEndTs?: number; reviewWindowSecs?: number;
  metadataMissing?: boolean;
};
export const DEMO_REVIEW_MS = 10_000;
export const STORAGE_KEY = 'depositlock-mobile-v1';
export const formatSol = (amount: string) => new Intl.NumberFormat('en-IE', { maximumFractionDigits: 9 }).format(Number(amount));
export const formatRent = (amount: string) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount));
export function validAmount(value: string): boolean {
  return /^\d+(\.\d{1,9})?$/.test(value) && Number(value) > 0 && Number(value) <= 10000;
}
export function newChainLeaseId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const value = bytes.reduce((result, byte) => (result << 8n) | BigInt(byte), 0n);
  return (value || 1n).toString();
}
export function seedLeases(): Lease[] {
  return [
    { id: 'hanover-4b', title: 'Hanover Quay', address: 'Apt 4B, Hanover Quay, Dublin 2', amount: '1', rent: '2200', endDate: '2026-12-31', image: '/images/apartment.jpg', status: 'active', tenant: 'Alex Morgan' },
    { id: 'portobello-12', title: 'Portobello House', address: '12 Richmond Row, Dublin 8', amount: '1.5', rent: '2500', endDate: '2027-03-01', image: '/images/hero-dublin-evening.webp', status: 'awaiting' },
    { id: 'rathmines-8', title: 'Rathmines Studio', address: '8 Rathmines Road, Dublin 6', amount: '0.8', rent: '1750', endDate: '2026-08-31', image: '/images/apartment.jpg', status: 'settled', tenant: 'Jamie Ryan', settledAt: Date.parse('2026-09-14') },
  ];
}
export type LeaseAction = { type: 'deposit' } | { type: 'review'; now: number } | { type: 'fast-forward'; now: number } | { type: 'refund'; now: number } | { type: 'release'; now: number } | { type: 'dispute'; reason: string; now: number };
// These guards describe the simulation. The Solana program must enforce them independently.
export function transitionLease(lease: Lease, action: LeaseAction): Lease {
  switch (action.type) {
    case 'deposit': if (lease.status === 'awaiting') return { ...lease, status: 'active', tenant: 'Alex Morgan' }; break;
    case 'review': if (lease.status === 'active') return { ...lease, status: 'review', deadline: action.now + DEMO_REVIEW_MS }; break;
    case 'fast-forward': if (lease.status === 'review') return { ...lease, deadline: action.now }; break;
    case 'refund': if (lease.status === 'review' && lease.deadline !== undefined && action.now >= lease.deadline) return { ...lease, status: 'settled', settledAt: action.now }; break;
    case 'release': if (['active', 'review', 'disputed'].includes(lease.status)) return { ...lease, status: 'settled', settledAt: action.now }; break;
    case 'dispute': if (lease.status === 'review' && lease.deadline !== undefined && action.now < lease.deadline && action.reason.trim()) return { ...lease, status: 'disputed', disputeReason: action.reason.trim() }; break;
  }
  throw new Error('This action is no longer available. Please check the deposit status.');
}
export function invitePayload(lease: Lease): string {
  // The link carries the demo terms and the public wallet/program identifiers, never private keys.
  return encodeURIComponent(JSON.stringify({ id: lease.id, title: lease.title, address: lease.address, amount: lease.amount, rent: lease.rent ?? '2200', endDate: lease.endDate, backend: lease.backend ?? 'demo', chainLeaseId: lease.chainLeaseId, landlordWallet: lease.landlordWallet }));
}
export function parseInvite(payload: string): Lease | null {
  try {
    let v;
    try { v = JSON.parse(payload); } catch { v = JSON.parse(decodeURIComponent(payload)); }
    const backend = v?.backend === 'devnet' ? 'devnet' : 'demo';
    if (!v || typeof v.id !== 'string' || !/^[\w-]{1,80}$/.test(v.id) || typeof v.title !== 'string' || v.title.length > 100 || typeof v.address !== 'string' || !v.address.trim() || v.address.length > 200 || typeof v.amount !== 'string' || !validAmount(v.amount) || (v.rent !== undefined && (typeof v.rent !== 'string' || !/^\d{1,6}(\.\d{1,2})?$/.test(v.rent) || Number(v.rent) <= 0)) || typeof v.endDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.endDate) || !Number.isFinite(Date.parse(v.endDate))) return null;
    if (backend === 'devnet' && (typeof v.chainLeaseId !== 'string' || !/^\d{1,20}$/.test(v.chainLeaseId) || BigInt(v.chainLeaseId) < 1n || BigInt(v.chainLeaseId) > 18_446_744_073_709_551_615n || typeof v.landlordWallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.landlordWallet))) return null;
    return { id: v.id, title: v.title, address: v.address, amount: v.amount, rent: v.rent ?? '2200', endDate: v.endDate, image: '/images/apartment.jpg', status: 'awaiting', backend, ...(backend === 'devnet' ? { chainLeaseId: v.chainLeaseId, landlordWallet: v.landlordWallet } : {}) };
  } catch { return null; }
}
export function dateLabel(value: string | number): string {
  return new Date(typeof value === 'string' ? `${value}T12:00:00` : value).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}
