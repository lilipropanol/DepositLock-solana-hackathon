import { Receipt } from '@/components/mobile/receipt';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <Receipt id={id} />; }
