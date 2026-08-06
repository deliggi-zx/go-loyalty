"use client";

import { useState } from "react";
import { Menu, ScanLine, ShoppingCart, User } from "lucide-react";
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
  // Ícono de login en el header en vez del recuadro en el cuerpo — hoy
  // solo para Gym2 (ver layout.tsx), el resto de las orgs sigue con el
  // recuadro de siempre y este prop queda en false.
  showLoginIcon?: boolean;
  // Estilo neón oscuro de los 4 íconos del header — hoy solo Gym2 (ver
  // hasGymFeatures en layout.tsx). Independiente de showLoginIcon: este
  // controla color/tamaño, no si el ícono existe.
  neonTheme?: boolean;
}

export function ClientHeader({
  orgName,
  primaryColor,
  userDisplayName,
  menuProps,
  catalogType,
  showLoginIcon = false,
  neonTheme = false,
}: ClientHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { totalQuantity } = useCart();
  const showCart = catalogType === "products";

  const iconColorClass = neonTheme ? "neon-icon" : "text-white";
  const menuIconSizeClass = neonTheme ? "w-7 h-7" : "w-5 h-5";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const centerText = userDisplayName ? `${greeting}, ${userDisplayName}` : orgName;

  function handleScan() {
    console.log("scan");
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 shrink-0"
        style={{ backgroundColor: primaryColor || "#f59e0b" }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="p-2 -ml-2"
        >
          <Menu className={`${menuIconSizeClass} ${iconColorClass}`} />
        </button>

        <p className="flex-1 text-center text-sm font-medium text-white truncate px-2">
          {centerText}
        </p>

        <div className="flex items-center -mr-2">
          {showCart && (
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Abrir carrito"
              className="relative p-2"
            >
              <ShoppingCart
                className={`w-5 h-5 ${iconColorClass} ${
                  neonTheme && totalQuantity > 0 ? "neon-icon-active" : ""
                }`}
              />
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
          <button onClick={handleScan} aria-label="Escanear código" className="p-2">
            <ScanLine className={`w-5 h-5 ${iconColorClass}`} />
          </button>
          {showLoginIcon && (
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
        {...menuProps}
      />
      {showCart && (
        <CartPanel
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          primaryColor={primaryColor}
        />
      )}
      {showLoginIcon && (
        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          primaryColor={primaryColor}
          neonTheme={neonTheme}
        />
      )}
    </>
  );
}
