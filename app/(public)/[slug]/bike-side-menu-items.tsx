"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  User,
  PackagePlus,
  Star,
  ShoppingBag,
  Users,
  Wrench,
  Phone,
  MessageCircle,
  ChevronDown,
  Tag,
  FileText,
  LogOut,
} from "lucide-react";
import { SocialLinks } from "./social-links";
import type { SideMenuCategory } from "./side-menu";

interface BikeSideMenuItemsProps {
  slug: string;
  isLoggedIn: boolean;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  termsText: string | null;
  catalogType: string | null | undefined;
  productCategories: SideMenuCategory[];
  onClose: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

// Menú lateral de "bike" (Fase 3h) — reemplaza el body del drawer, mismo
// patrón que GymSideMenuItems (ver side-menu.tsx / bikeTheme). Navegación
// pura a las secciones de la home en vez de contenido volcado: el texto de
// "Quiénes Somos" y el bloque de cuenta/historial ya no viven acá, solo
// quedan los links (Mi Perfil → /perfil, el resto → anclas de la home).
export function BikeSideMenuItems({
  slug,
  isLoggedIn,
  phoneNumber,
  whatsappNumber,
  facebookUrl,
  instagramUrl,
  twitterUrl,
  youtubeUrl,
  termsText,
  catalogType,
  productCategories,
  onClose,
  onLogout,
  loggingOut,
}: BikeSideMenuItemsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showTerms, setShowTerms] = useState(false);
  const [tiendaOpen, setTiendaOpen] = useState(false);

  const homePath = `/${slug}`;
  const hasShop = catalogType === "products";
  const hasSocials = facebookUrl || instagramUrl || twitterUrl || youtubeUrl;

  // Mismo mecanismo que goToSection en gym-side-menu-items.tsx: si ya
  // estamos en la home, scroll directo; si venimos de otra ruta (perfil,
  // precios...), navega a la home con el hash y el ancla nativa de Next.js
  // hace el resto al montar.
  function goToSection(targetId: string) {
    onClose();
    if (pathname === homePath) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`${homePath}#${targetId}`);
    }
  }

  return (
    <>
      {isLoggedIn && (
        <Link
          href={`/${slug}/perfil`}
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-medium transition-colors bike-menu-link"
        >
          <User className="w-4 h-4 bike-icon shrink-0" />
          Mi Perfil
        </Link>
      )}

      <button
        type="button"
        onClick={() => goToSection("nuevos-ingresos")}
        className="flex items-center gap-2 text-sm font-medium transition-colors bike-menu-link"
      >
        <PackagePlus className="w-4 h-4 bike-icon shrink-0" />
        Ingresos
      </button>

      <button
        type="button"
        onClick={() => goToSection("imperdibles")}
        className="flex items-center gap-2 text-sm font-medium transition-colors bike-menu-link"
      >
        <Star className="w-4 h-4 bike-icon shrink-0" />
        Destacados
      </button>

      {hasShop && (
        <div>
          {/* A diferencia de Gym2 (fila-link + flecha separadas), acá
              "Tienda" entera solo abre/cierra el árbol de categorías — no
              navega a ningún lado por sí sola. */}
          <button
            type="button"
            onClick={() => setTiendaOpen((v) => !v)}
            aria-expanded={tiendaOpen}
            className="flex items-center gap-2 w-full text-sm font-medium transition-colors bike-menu-link"
          >
            <ShoppingBag className="w-4 h-4 bike-icon shrink-0" />
            <span className="flex-1 text-left">Tienda</span>
            {productCategories.length > 0 && (
              <ChevronDown
                className={`w-4 h-4 bike-icon transition-transform duration-200 ${
                  tiendaOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </button>
          {productCategories.length > 0 && (
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                tiendaOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pl-6 pt-2 space-y-2">
                  {productCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/${slug}/precios?categoria=${cat.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 text-sm transition-colors bike-menu-link"
                    >
                      <Tag className="w-3.5 h-3.5 bike-icon shrink-0" />
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => goToSection("quienes-somos")}
        className="flex items-center gap-2 text-sm font-medium transition-colors bike-menu-link"
      >
        <Users className="w-4 h-4 bike-icon shrink-0" />
        Nosotros
      </button>

      {/* Contacto y redes sociales: mismo contenido/estructura que el menú
          claro de siempre (dos bloques separados, no un acordeón único
          como en Gym2) — solo hereda la estética oscura+naranja. */}
      {(phoneNumber || whatsappNumber) && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">
            Contacto
          </h3>
          {phoneNumber && (
            <div className="flex items-center gap-2 text-sm text-[#d8d6d2]">
              <Phone className="w-4 h-4 bike-icon shrink-0" />
              {phoneNumber}
            </div>
          )}
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors bike-menu-link"
            >
              <MessageCircle className="w-4 h-4 bike-icon shrink-0" />
              WhatsApp
            </a>
          )}
        </div>
      )}

      {hasSocials && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b6965]">
            Redes sociales
          </h3>
          <SocialLinks
            facebookUrl={facebookUrl}
            instagramUrl={instagramUrl}
            twitterUrl={twitterUrl}
            youtubeUrl={youtubeUrl}
          />
        </div>
      )}

      {/* 7° ítem (Fase T2 Taller): reserva de turno de service — mismo
          patrón que Mi Perfil (Link real, gateado por isLoggedIn: la
          página exige login, no tiene sentido ofrecer el link sin
          sesión), mismo ícono llave inglesa que el nav de admin
          (dashboard/taller). */}
      {isLoggedIn && (
        <Link
          href={`/${slug}/taller`}
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-medium transition-colors bike-menu-link"
        >
          <Wrench className="w-4 h-4 bike-icon shrink-0" />
          Taller
        </Link>
      )}

      {termsText && (
        <div className="space-y-1.5">
          <button
            onClick={() => setShowTerms((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide transition-colors text-[#6b6965] hover:text-[#ff6b00]"
          >
            <FileText className="w-3.5 h-3.5 bike-icon shrink-0" />
            Términos y condiciones
          </button>
          {showTerms && (
            <p className="text-xs whitespace-pre-wrap text-[#6b6965]">{termsText}</p>
          )}
        </div>
      )}

      {/* Sin bloque de cuenta (nombre/mail) acá — se saca del menú por
          completo, esa info ya vive en /perfil (ver Gate 2). Solo queda el
          botón de logout, que es control de sesión, no "contenido". */}
      {isLoggedIn && (
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors pt-2 border-t border-[#26262a] w-full bike-menu-link"
        >
          <LogOut className="w-4 h-4 bike-icon shrink-0" />
          {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      )}
    </>
  );
}
