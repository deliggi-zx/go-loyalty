export default function TenantPage({ params }: { params: { slug: string } }) {
  return <div>{params.slug}</div>;
}
