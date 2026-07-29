"use client";

import { useState } from "react";
import { Menu, ScanLine } from "lucide-react";
import { SideMenu, type SideMenuProps } from "./side-menu";

interface ClientHeaderProps {
  orgName: string;
  primaryColor: string;
  userDisplayName: string | null;
  menuProps: Omit<SideMenuProps, "isOpen" | "onClose">;
}

export function ClientHeader({
  orgName,
  primaryColor,
  userDisplayName,
  menuProps,
}: ClientHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const centerText = userDisplayName ? `${greeting}, ${userDisplayName}` : orgName;

  function handleScan() {
    console.log("scan");
  }

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 shrink-0"
        style={{ backgroundColor: primaryColor || "#f59e0b" }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="p-2 -ml-2 text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        <p className="flex-1 text-center text-sm font-medium text-white truncate px-2">
          {centerText}
        </p>

        <button
          onClick={handleScan}
          aria-label="Escanear código"
          className="p-2 -mr-2 text-white"
        >
          <ScanLine className="w-5 h-5" />
        </button>
      </header>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} {...menuProps} />
    </>
  );
}
