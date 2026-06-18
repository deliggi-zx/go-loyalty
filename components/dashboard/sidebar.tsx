"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Stamp,
  Gift,
  ScanLine,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/tarjetas", label: "Tarjetas", icon: Stamp },
  { href: "/dashboard/premios", label: "Premios", icon: Gift },
  { href: "/pos", label: "POS", icon: ScanLine },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

interface SidebarProps {
  userEmail: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen bg-white border-r border-stone-200">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-stone-200">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9M12 3c2.5 0 4.5 2 4.5 4.5S14.5 12 12 12m0-9C9.5 3 7.5 5 7.5 7.5S9.5 12 12 12" />
          </svg>
        </div>
        <span className="font-bold text-stone-900 text-base">Go Loyalty</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-amber-50 text-amber-700"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active ? "text-amber-600" : "text-stone-400"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-stone-200 space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs text-stone-400 truncate">{userEmail}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          >
            <LogOut className="w-4 h-4 text-stone-400" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
