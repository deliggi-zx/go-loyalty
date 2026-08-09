import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600"] });

// Placeholder de marca para las secciones de Veterinaria que todavía no
// tienen contenido propio (Nosotros, Peluquería, Refugio, Perdidos,
// Consejos — ver NAV_BUTTONS en huellitas-home.tsx). Se reemplaza fase a
// fase por la página real de cada sección; hasta entonces evita un 404 y
// mantiene la estética marfil/pastel de la home.
export function VetComingSoon({ slug, title }: { slug: string; title: string }) {
  return (
    <div className="min-h-screen bg-[#faf6ef] flex flex-col items-center justify-center px-6 text-center">
      <svg viewBox="0 0 64 64" className="w-14 h-14 mb-6 opacity-30" aria-hidden="true">
        <ellipse cx="32" cy="43" rx="16" ry="13" fill="#c9ae8c" />
        <ellipse cx="13" cy="21" rx="7.5" ry="9.5" fill="#c9ae8c" transform="rotate(-24 13 21)" />
        <ellipse cx="25" cy="9" rx="7" ry="9" fill="#c9ae8c" transform="rotate(-8 25 9)" />
        <ellipse cx="39" cy="9" rx="7" ry="9" fill="#c9ae8c" transform="rotate(8 39 9)" />
        <ellipse cx="51" cy="21" rx="7.5" ry="9.5" fill="#c9ae8c" transform="rotate(24 51 21)" />
      </svg>

      <h1 className={`${playfair.className} text-2xl sm:text-3xl text-stone-800 mb-2`}>
        {title}
      </h1>
      <p className="text-sm text-stone-500 tracking-wide uppercase mb-8">Muy pronto</p>

      <Link
        href={`/${slug}`}
        className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        ‹ Volver al inicio
      </Link>
    </div>
  );
}
