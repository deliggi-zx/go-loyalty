import { VetComingSoon } from "../vet-coming-soon";

export default function PeluqueriaPage({ params }: { params: { slug: string } }) {
  return <VetComingSoon slug={params.slug} title="Peluquería" />;
}
