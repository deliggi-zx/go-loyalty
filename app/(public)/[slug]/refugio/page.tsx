import { VetComingSoon } from "../vet-coming-soon";

export default function RefugioPage({ params }: { params: { slug: string } }) {
  return <VetComingSoon slug={params.slug} title="Refugio" />;
}
