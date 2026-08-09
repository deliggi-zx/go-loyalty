import { VetComingSoon } from "../vet-coming-soon";

export default function NosotrosPage({ params }: { params: { slug: string } }) {
  return <VetComingSoon slug={params.slug} title="Nosotros" />;
}
