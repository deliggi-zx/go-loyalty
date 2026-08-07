"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Users,
  User,
  Dumbbell,
  MapPin,
  Receipt,
  ShoppingBag,
  Phone,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  ChevronDown,
  Tag,
  LogOut,
} from "lucide-react";
import type { SideMenuCategory } from "./side-menu";

interface GymSideMenuItemsProps {
  slug: string;
  isLoggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  whatsappNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  catalogType: string | null | undefined;
  productCategories: SideMenuCategory[];
  onClose: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

// Ítems que solo saltan a una sección de la home — mismos ids que usa
// neon-tabs.tsx (las pestañas verticales del hero), así que el menú lateral
// y las pestañas apuntan siempre al mismo lugar.
const LOWER_SECTIONS = [
  { id: "clases", label: "Clases", icon: Dumbbell },
  { id: "sedes", label: "Sucursales", icon: MapPin },
  { id: "planes", label: "Planes", icon: Receipt },
];

// Menú lateral de Gym2/Borne — reemplaza por completo el contenido del
// drawer para las orgs con neonTheme (ver side-menu.tsx). El resto de las
// organizaciones de Go Loyalty sigue con el body original del SideMenu, sin
// tocar.
export function GymSideMenuItems({
  slug,
  isLoggedIn,
  userName,
  userEmail,
  whatsappNumber,
  facebookUrl,
  instagramUrl,
  twitterUrl,
  youtubeUrl,
  catalogType,
  productCategories,
  onClose,
  onLogout,
  loggingOut,
}: GymSideMenuItemsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [openSection, setOpenSection] = useState<"tienda" | "contacto" | null>(null);

  const homePath = `/${slug}`;
  const hasShop = catalogType === "products";

  // Si ya estamos en la home, scrollea directo (mismo patrón que
  // neon-tabs.tsx); si venimos de otra página (perfil, precios...),
  // navega a la home con el hash y deja que el navegador salte al ancla.
  function goToSection(targetId: string) {
    onClose();
    if (pathname === homePath) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`${homePath}#${targetId}`);
    }
  }

  function toggleSection(section: "tienda" | "contacto") {
    setOpenSection((current) => (current === section ? null : section));
  }

  const contactLinks = [
    whatsappNumber && {
      key: "whatsapp",
      href: `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`,
      icon: MessageCircle,
      label: "WhatsApp",
    },
    instagramUrl && { key: "instagram", href: instagramUrl, icon: Instagram, label: "Instagram" },
    facebookUrl && { key: "facebook", href: facebookUrl, icon: Facebook, label: "Facebook" },
    twitterUrl && { key: "twitter", href: twitterUrl, icon: Twitter, label: "Twitter" },
    youtubeUrl && { key: "youtube", href: youtubeUrl, icon: Youtube, label: "YouTube" },
  ].filter(Boolean) as { key: string; href: string; icon: typeof MessageCircle; label: string }[];

  return (
    <>
      <button
        type="button"
        onClick={() => goToSection("quienes-somos")}
        className="flex items-center gap-2 text-sm font-medium transition-colors neon-menu-link"
      >
        <Users className="w-4 h-4 neon-icon shrink-0" />
        Nosotros
      </button>

      {isLoggedIn && (
        <>
          <Link
            href={`/${slug}/perfil`}
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-medium transition-colors neon-menu-link"
          >
            <User className="w-4 h-4 neon-icon shrink-0" />
            Mi Perfil
          </Link>
          <div>
            <p className="text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-[#6b6965]">{userEmail}</p>
          </div>
        </>
      )}

      {LOWER_SECTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => goToSection(id)}
          className="flex items-center gap-2 text-sm font-medium transition-colors neon-menu-link"
        >
          <Icon className="w-4 h-4 neon-icon shrink-0" />
          {label}
        </button>
      ))}

      {hasShop && (
        <div>
          {/* La fila navega al catálogo general; la flecha despliega el
              árbol de categorías (traídas en vivo de product_categories)
              sin navegar. */}
          <div className="flex items-center gap-2">
            <Link
              href={`/${slug}/precios`}
              onClick={onClose}
              className="flex-1 flex items-center gap-2 text-sm font-medium transition-colors neon-menu-link"
            >
              <ShoppingBag className="w-4 h-4 neon-icon shrink-0" />
              Tienda
            </Link>
            {productCategories.length > 0 && (
              <button
                type="button"
                onClick={() => toggleSection("tienda")}
                aria-label="Mostrar categorías de la tienda"
                aria-expanded={openSection === "tienda"}
                className="p-1 neon-menu-link"
              >
                <ChevronDown
                  className={`w-4 h-4 neon-icon transition-transform duration-200 ${
                    openSection === "tienda" ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
          {productCategories.length > 0 && (
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                openSection === "tienda" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="pl-6 pt-2 space-y-2">
                  {productCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/${slug}/precios?categoria=${cat.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 text-sm transition-colors neon-menu-link"
                    >
                      <Tag className="w-3.5 h-3.5 neon-icon shrink-0" />
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {contactLinks.length > 0 && (
        <div>
          {/* Acá toda la fila abre/cierra el listado — a diferencia de
              Tienda, Contacto no tiene un destino propio al que navegar. */}
          <button
            type="button"
            onClick={() => toggleSection("contacto")}
            aria-expanded={openSection === "contacto"}
            className="flex items-center gap-2 w-full text-sm font-medium transition-colors neon-menu-link"
          >
            <Phone className="w-4 h-4 neon-icon shrink-0" />
            <span className="flex-1 text-left">Contacto</span>
            <ChevronDown
              className={`w-4 h-4 neon-icon transition-transform duration-200 ${
                openSection === "contacto" ? "rotate-180" : ""
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              openSection === "contacto" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="pl-6 pt-2 space-y-2">
                {contactLinks.map(({ key, href, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm transition-colors neon-menu-link"
                  >
                    <Icon className="w-3.5 h-3.5 neon-icon shrink-0" />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors pt-2 border-t border-[#26262a] w-full neon-menu-link"
        >
          <LogOut className="w-4 h-4 neon-icon shrink-0" />
          {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      )}
    </>
  );
}
