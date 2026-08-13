import Link from "next/link";
import { getTenantOrg } from "../data";

// Fase 5 Huellitas, punto 2: reemplaza el placeholder VetComingSoon.
// Solo lectura, contenido FIJO por ahora (pedido explícito: sin gestión,
// a diferencia de Refugio/Perdidos que sí tienen alta/edición) — mismo
// patrón visual (foto + texto), pero sin ningún botón de "+"/editar/
// borrar en esta página. Placeholder de stock (Pexels) para la foto,
// mismo criterio que VET_HOME_VIDEOS en page.tsx, hasta que se suba
// material real de la marca.
const PLACEHOLDER_PHOTO =
  "https://images.pexels.com/photos/6816861/pexels-photo-6816861.jpeg?auto=compress&cs=tinysrgb&w=1200";

export default async function PeluqueriaPage({ params }: { params: { slug: string } }) {
  const org = await getTenantOrg(params.slug);
  if (!org) return null;

  const primary = org.primary_color ?? "#b98a72";

  return (
    <div className="min-h-screen bg-[#faf6ef] px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <Link
          href={`/${params.slug}`}
          className="inline-block text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ‹ Volver
        </Link>

        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Huellitas</p>
          <h1 className="text-2xl font-semibold text-stone-900 mt-1">Peluquería</h1>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PLACEHOLDER_PHOTO}
          alt="Peluquería Huellitas"
          className="w-full aspect-[4/3] rounded-2xl object-cover"
        />

        <p className="text-stone-600 leading-relaxed">
          Baño, corte y deslanado con productos hipoalergénicos, pensados para la piel de cada
          mascota. Nuestro equipo trabaja con calma y mucha paciencia, sin sedación, para que la
          visita sea una buena experiencia — no un trámite.
        </p>

        {/* Turno preseleccionado con motivo "Peluquería" — reusa el wizard
            de Turnos ya existente vía query param en vez de duplicar la
            lógica de reserva acá (pedido explícito, ver turnos/page.tsx +
            vet-turnos-booking.tsx). El dueño igual puede cambiarlo en el
            paso 2 si se equivocó de sección. */}
        <Link
          href={`/${params.slug}/turnos?motivo=peluqueria`}
          className="block w-full h-12 rounded-lg text-sm font-semibold text-white text-center leading-[3rem] transition-opacity hover:opacity-90"
          style={{ backgroundColor: primary }}
        >
          Pedí tu turno de peluquería
        </Link>
      </div>
    </div>
  );
}
