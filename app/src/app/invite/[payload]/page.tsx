import { Invitation } from '@/components/mobile/invitation';
export default async function Page({ params }: { params: Promise<{ payload: string }> }) { const { payload } = await params; return <Invitation payload={payload} />; }
