import { VetComingSoon } from "../vet-coming-soon";

export default function PerdidosPage({ params }: { params: { slug: string } }) {
  return <VetComingSoon slug={params.slug} title="Perdidos" />;
}
