import { LeaseDetail } from '@/components/mobile/lease-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <LeaseDetail id={id} />; }
