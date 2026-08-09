import { VetComingSoon } from "../vet-coming-soon";

export default function ConsejosPage({ params }: { params: { slug: string } }) {
  return <VetComingSoon slug={params.slug} title="Consejos" />;
}
