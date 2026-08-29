"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ScanLine, ShoppingCart, Star, User, Building2, Settings } from "lucide-react";
import { SideMenu, type SideMenuProps } from "./side-menu";
import { CartPanel } from "./cart-panel";
import { LoginModal } from "./login-modal";
import { useCart } from "./cart-context";

interface ClientHeaderProps {
  orgName: string;
  primaryColor: string;
  userDisplayName: string | null;
  menuProps: Omit<SideMenuProps, "isOpen" | "onClose">;
  catalogType?: string | null;
  // Ajuste login-como-ícono (genérico, ver DOMUS_VISION.md pendiente del
  // 21/08): el ícono de usuario arriba a la derecha ya no es un flag por
  // org — vive para TODAS, siempre. Sin sesión abre el LoginModal; con
  // sesión (este prop en true) es un link directo a /perfil. Reemplaza
  // el recuadro <LoginForm> que antes vivía inline en page.tsx.
  isLoggedIn?: boolean;
  // Estilo neón oscuro de los 4 íconos del header — hoy solo Gym2 (ver
  // hasGymFeatures en layout.tsx). Independiente de showLoginIcon: este
  // controla color/tamaño, no si el ícono existe.
  neonTheme?: boolean;
  // Fase 0a de "Gym2 funcional": se pasan tal cual hasta LoginForm (vía
  // LoginModal), ver ahí el porqué de mantenerlos separados de neonTheme.
  requireInviteCode?: boolean;
  orgId?: string;
  // Fase 3c, hoy solo "bike": header transparente flotando ENCIMA del
  // banner (position absolute + scrim), en vez de barra sólida arriba de
  // él. Independiente de neonTheme — usa su propio acento naranja
  // (.bike-icon/.bike-icon-active en globals.css), no toca el verde-limón
  // de Gym2. Cuando está prendido, el header no muestra texto central
  // (ni saludo ni nombre de org): el banner de bike ya trae su propio
  // branding en la imagen, repetirlo encima quedaría redundante.
  floatingOverlay?: boolean;
  // Ícono de escaneo QR — hoy se saca por completo (no solo se oculta)
  // para "bike" (Fase 3c), no tiene lector del otro lado todavía.
  showScanIcon?: boolean;
  // Fase Carrito→Favoritos: mismo patrón que orgSlug en ProductForm
  // (dashboard/catalogo/product-form.tsx) — slug de la org activa, solo
  // para el toggle carrito/favoritos scopeado a Domus acá abajo y en
  // CartPanel. El resto del componente es genérico y no la lee.
  orgSlug?: string;
  // Fase íconos de staff (Domus): agente o gerente logueado — repurposa
  // el ícono de escaneo (sin función real hoy, ver Gate 0) a un acceso
  // directo a Catálogo, y suma un ícono nuevo de Configuración al lado.
  // false para cualquier cliente y para cualquier otra org: el header no
  // cambia en nada (default false, mismo criterio que el resto de los
  // flags opcionales de este componente).
  isDomusStaff?: boolean;
}

export function ClientHeader({
  orgName,
  primaryColor,
  userDisplayName,
  menuProps,
  catalogType,
  isLoggedIn = false,
  neonTheme = false,
  requireInviteCode = false,
  orgId,
  floatingOverlay = false,
  showScanIcon = true,
  orgSlug,
  isDomusStaff = false,
}: ClientHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { totalQuantity } = useCart();
  const showCart = catalogType === "products";
  // Fase Carrito→Favoritos: mismo mecanismo (useCart, cartOpen, badge de
  // totalQuantity) para todas las orgs — acá solo cambia qué ícono/texto
  // se muestra, nunca la lógica. Ver mismo criterio en CartPanel.
  const isDomus = orgSlug === "domus" || orgSlug === "kapusta";

  const iconColorClass = neonTheme ? "neon-icon" : floatingOverlay ? "bike-icon" : "text-white";
  const iconActiveClass = neonTheme ? "neon-icon-active" : floatingOverlay ? "bike-icon-active" : "";
  const menuIconSizeClass = neonTheme ? "w-7 h-7" : "w-5 h-5";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const centerText = floatingOverlay
    ? null
    : userDisplayName
    ? `${greeting}, ${userDisplayName}`
    : orgName;

  function handleScan() {
    console.log("scan");
  }

  return (
    <>
      <header
        className={
          floatingOverlay
            ? "bike-header-scrim absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 h-14 shrink-0"
            : "sticky top-0 z-50 flex items-center justify-between px-4 h-14 shrink-0"
        }
        style={floatingOverlay ? undefined : { backgroundColor: primaryColor || "#f59e0b" }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="p-2 -ml-2"
        >
          <Menu className={`${menuIconSizeClass} ${iconColorClass}`} />
        </button>

        {centerText && (
          <p className="flex-1 text-center text-sm font-medium text-white truncate px-2">
            {centerText}
          </p>
        )}
        {!centerText && <div className="flex-1" />}

        <div className="flex items-center -mr-2">
          {showCart && (
            <button
              onClick={() => setCartOpen(true)}
              aria-label={isDomus ? "Abrir favoritos" : "Abrir carrito"}
              className="relative p-2"
            >
              {isDomus ? (
                <Star
                  className={`w-5 h-5 ${iconColorClass} ${totalQuantity > 0 ? iconActiveClass : ""} ${
                    totalQuantity > 0 ? "fill-current" : ""
                  }`}
                />
              ) : (
                <ShoppingCart
                  className={`w-5 h-5 ${iconColorClass} ${totalQuantity > 0 ? iconActiveClass : ""}`}
                />
              )}
              {totalQuantity > 0 && (
                <span
                  className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-white text-[10px] font-semibold flex items-center justify-center"
                  style={{ color: primaryColor }}
                >
                  {totalQuantity}
                </span>
              )}
            </button>
          )}
          {showScanIcon &&
            (isDomusStaff ? (
              // Fase íconos de staff: mismo lugar/tamaño que el ícono de
              // escaneo de siempre, pero para agente/gerente de Domus
              // cambia de ícono y función — acceso directo a Catálogo en
              // vez de un escaneo que hoy no hace nada (ver Gate 0).
              <Link href="/dashboard/catalogo" aria-label="Ir a Catálogo" className="p-2">
                <Building2 className={`w-5 h-5 ${iconColorClass}`} />
              </Link>
            ) : (
              <button onClick={handleScan} aria-label="Escanear código" className="p-2">
                <ScanLine className={`w-5 h-5 ${iconColorClass}`} />
              </button>
            ))}
          {isDomusStaff && (
            <Link href="/dashboard/configuracion" aria-label="Ir a Configuración" className="p-2">
              <Settings className={`w-5 h-5 ${iconColorClass}`} />
            </Link>
          )}
          {isLoggedIn ? (
            <Link href={`/${orgSlug ?? ""}/perfil`} aria-label="Ir a mi perfil" className="p-2">
              <User className={`w-5 h-5 ${iconColorClass}`} />
            </Link>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              aria-label="Iniciar sesión"
              className="p-2"
            >
              <User className={`w-5 h-5 ${iconColorClass}`} />
            </button>
          )}
        </div>
      </header>

      <SideMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        neonTheme={neonTheme}
        bikeTheme={floatingOverlay}
        {...menuProps}
      />
      {showCart && (
        <CartPanel
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          primaryColor={primaryColor}
          orgSlug={orgSlug}
        />
      )}
      {!isLoggedIn && (
        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          primaryColor={primaryColor}
          neonTheme={neonTheme}
          // Fase 3j: floatingOverlay ya es exclusivo de "bike" (ver
          // layout.tsx) — LoginModal/LoginForm ya tenían el theming
          // bikeTheme completo de un borrador anterior de esta fase,
          // solo faltaba reenviarlo desde acá.
          bikeTheme={floatingOverlay}
          requireInviteCode={requireInviteCode}
          orgId={orgId}
          orgSlug={orgSlug}
        />
      )}
    </>
  );
}
