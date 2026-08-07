"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Phone, MessageCircle, LogOut, FileText, Receipt, User, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SocialLinks } from "./social-links";
import { GymSideMenuItems } from "./gym-side-menu-items";

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
  // Estilo neón oscuro — hoy solo Gym2 (ver hasGymFeatures en layout.tsx).
  // Cuando es true, el body del drawer lo arma GymSideMenuItems en vez del
  // menú claro de siempre; este prop deja de leerse en ese caso.
  neonTheme?: boolean;
  // Label del ítem de catálogo/precios en el menú claro de siempre (el de
  // GymSideMenuItems no lo usa: ese tiene "Planes" y "Tienda" fijos).
  priceListLabel?: string;
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
  neonTheme = false,
  priceListLabel = "Lista de precios",
}: SideMenuProps) {
  const router = useRouter();
  const [showTerms, setShowTerms] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const hasSocials = facebookUrl || instagramUrl || twitterUrl || youtubeUrl;

  // Clases condicionadas al tema — mismo criterio que showLoginIcon: una
  // sola variante de estilo por prop, no un side-menu-gym2.tsx paralelo.
  const drawerBg = neonTheme ? "bg-[#0a0a0b]" : "bg-white";
  const headerBorder = neonTheme ? "border-[#26262a]" : "border-stone-100";
  const titleText = neonTheme ? "text-white" : "text-stone-900";
  const closeBtn = neonTheme
    ? "text-[#9b9995] hover:text-[#ccff00]"
    : "text-stone-400 hover:text-stone-700";
  const linkText = neonTheme ? "neon-menu-link" : "text-stone-700 hover:text-stone-900";
  const linkTextMuted = neonTheme ? "neon-menu-link" : "text-stone-600 hover:text-stone-900";
  const leadIcon = neonTheme ? "neon-icon shrink-0" : "text-stone-400 shrink-0";
  const leadIconSm = neonTheme ? "neon-icon shrink-0" : "text-stone-400";
  const sectionLabel = neonTheme ? "text-[#6b6965]" : "text-stone-500";
  const bodyText = neonTheme ? "text-[#d8d6d2]" : "text-stone-600";
  const faintText = neonTheme ? "text-[#6b6965]" : "text-stone-400";
  const nameText = neonTheme ? "text-white" : "text-stone-900";
  const dividerBorder = neonTheme ? "divide-[#1c1c1e] border-[#26262a]" : "divide-stone-100 border-stone-100";
  const rowAmount = neonTheme ? "neon-amount" : "text-stone-900";

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
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] ${drawerBg} z-[70] shadow-xl transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex items-center justify-between px-5 h-14 border-b ${headerBorder}`}>
          <span className={`font-semibold ${titleText}`}>{orgName}</span>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className={`p-1.5 transition-colors ${closeBtn}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {neonTheme ? (
            <GymSideMenuItems
              slug={slug}
              isLoggedIn={isLoggedIn}
              userName={userName}
              userEmail={userEmail}
              whatsappNumber={whatsappNumber}
              facebookUrl={facebookUrl}
              instagramUrl={instagramUrl}
              twitterUrl={twitterUrl}
              youtubeUrl={youtubeUrl}
              catalogType={catalogType}
              productCategories={productCategories}
              onClose={onClose}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          ) : (
            <>
          <Link
            href={`/${slug}/precios`}
            onClick={onClose}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${linkText}`}
          >
            <Receipt className={`w-4 h-4 ${leadIcon}`} />
            {priceListLabel}
          </Link>

          {catalogType === "products" && productCategories.length > 0 && (
            <div className="space-y-2">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${sectionLabel}`}>
                Categorías
              </h3>
              <div className="space-y-1">
                {productCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/${slug}/precios?categoria=${cat.id}`}
                    onClick={onClose}
                    className={`flex items-center gap-2 text-sm transition-colors ${linkTextMuted}`}
                  >
                    <Tag className={`w-3.5 h-3.5 ${leadIconSm}`} />
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
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${linkText}`}
            >
              <User className={`w-4 h-4 ${leadIcon}`} />
              Mi Perfil
            </Link>
          )}

          {isLoggedIn && (
            <div>
              <p className={`text-sm font-semibold ${nameText}`}>{userName}</p>
              <p className={`text-xs ${faintText}`}>{userEmail}</p>
            </div>
          )}

          {isLoggedIn && (
            <div className="space-y-2">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${sectionLabel}`}>
                Historial
              </h3>
              {transactions.length > 0 ? (
                <div
                  className={`divide-y rounded-lg overflow-hidden border ${dividerBorder}`}
                >
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className={`text-xs ${sectionLabel}`}>
                        {tx.claimed_at
                          ? new Date(tx.claimed_at).toLocaleDateString("es-AR")
                          : "—"}
                      </span>
                      <span className={`font-medium ${rowAmount}`}>
                        +{tx.amount.toLocaleString("es-AR")} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${faintText}`}>Todavía no sumaste puntos.</p>
              )}
            </div>
          )}

          {aboutText && (
            <div className="space-y-1.5">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${sectionLabel}`}>
                Acerca del negocio
              </h3>
              <p className={`text-sm whitespace-pre-wrap ${bodyText}`}>{aboutText}</p>
            </div>
          )}

          {(phoneNumber || whatsappNumber) && (
            <div className="space-y-1.5">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${sectionLabel}`}>
                Contacto
              </h3>
              {phoneNumber && (
                <div className={`flex items-center gap-2 text-sm ${bodyText}`}>
                  <Phone className={`w-4 h-4 ${leadIcon}`} />
                  {phoneNumber}
                </div>
              )}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-sm transition-colors ${linkTextMuted}`}
                >
                  <MessageCircle className={`w-4 h-4 ${leadIcon}`} />
                  WhatsApp
                </a>
              )}
            </div>
          )}

          {hasSocials && (
            <div className="space-y-1.5">
              <h3 className={`text-xs font-semibold uppercase tracking-wide ${sectionLabel}`}>
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
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  neonTheme
                    ? "text-[#6b6965] hover:text-[#ccff00]"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${leadIconSm}`} />
                Términos y condiciones
              </button>
              {showTerms && (
                <p className={`text-xs whitespace-pre-wrap ${sectionLabel}`}>{termsText}</p>
              )}
            </div>
          )}

          {isLoggedIn && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors pt-2 border-t w-full ${
                neonTheme ? `${headerBorder} neon-menu-link` : "border-stone-100 text-stone-600 hover:text-stone-900"
              }`}
              style={neonTheme ? undefined : { color: primaryColor }}
            >
              <LogOut className={`w-4 h-4 ${leadIcon}`} />
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>
          )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
