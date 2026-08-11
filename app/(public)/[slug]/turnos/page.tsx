import { VetComingSoon } from "../vet-coming-soon";

export default function TurnosPage({ params }: { params: { slug: string } }) {
  return <VetComingSoon slug={params.slug} title="Turnos" />;
}
