import { ShareInvite } from '@/components/mobile/share-invite';
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ShareInvite id={id} />; }
