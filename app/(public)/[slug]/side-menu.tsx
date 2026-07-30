"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Phone, MessageCircle, LogOut, FileText, Receipt, User, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SocialLinks } from "./social-links";

export interface SideMenuTransaction {
  id: string;
  amount: number;
  claimed_at: string | null;
}

export interface SideMenuCategory {
  id: string;
  name: string;
}

export interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  orgName: string;
  isLoggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  transactions: SideMenuTransaction[];
  aboutText: string | null;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  termsText: string | null;
  primaryColor: string;
  catalogType?: string | null;
  productCategories?: SideMenuCategory[];
}

export function SideMenu({
  isOpen,
  onClose,
  slug,
  orgName,
  isLoggedIn,
  userName,
  userEmail,
  transactions,
  aboutText,
  phoneNumber,
  whatsappNumber,
  facebookUrl,
  instagramUrl,
  twitterUrl,
  youtubeUrl,
  termsText,
  primaryColor,
  catalogType,
  productCategories = [],
}: SideMenuProps) {
  const router = useRouter();
  const [showTerms, setShowTerms] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const hasSocials = facebookUrl || instagramUrl || twitterUrl || youtubeUrl;

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.refresh();
    setLoggingOut(false);
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white z-[70] shadow-xl transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-stone-100">
          <span className="font-semibold text-stone-900">{orgName}</span>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <Link
            href={`/${slug}/precios`}
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
          >
            <Receipt className="w-4 h-4 text-stone-400" />
            Lista de precios
          </Link>

          {catalogType === "products" && productCategories.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Categorías
              </h3>
              <div className="space-y-1">
                {productCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/${slug}/precios?categoria=${cat.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5 text-stone-400" />
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {isLoggedIn && (
            <Link
              href={`/${slug}/perfil`}
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
            >
              <User className="w-4 h-4 text-stone-400" />
              Mi Perfil
            </Link>
          )}

          {isLoggedIn && (
            <div>
              <p className="text-sm font-semibold text-stone-900">{userName}</p>
              <p className="text-xs text-stone-400">{userEmail}</p>
            </div>
          )}

          {isLoggedIn && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Historial
              </h3>
              {transactions.length > 0 ? (
                <div className="divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="text-stone-500 text-xs">
                        {tx.claimed_at
                          ? new Date(tx.claimed_at).toLocaleDateString("es-AR")
                          : "—"}
                      </span>
                      <span className="font-medium text-stone-900">
                        +{tx.amount.toLocaleString("es-AR")} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400">Todavía no sumaste puntos.</p>
              )}
            </div>
          )}

          {aboutText && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Acerca del negocio
              </h3>
              <p className="text-sm text-stone-600 whitespace-pre-wrap">{aboutText}</p>
            </div>
          )}

          {(phoneNumber || whatsappNumber) && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Contacto
              </h3>
              {phoneNumber && (
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                  {phoneNumber}
                </div>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-stone-400 shrink-0" />
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {hasSocials && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
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

          {termsText && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowTerms((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wide hover:text-stone-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Términos y condiciones
              </button>
              {showTerms && (
                <p className="text-xs text-stone-500 whitespace-pre-wrap">{termsText}</p>
              )}
            </div>
          )}

          {isLoggedIn && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 disabled:opacity-50 transition-colors pt-2 border-t border-stone-100 w-full"
              style={{ color: primaryColor }}
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
