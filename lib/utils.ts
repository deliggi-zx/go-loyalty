import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Símbolo por moneda para el precio de un producto (products.currency,
// default 'ARS' — ver migración add_currency_to_products). 'ARS' conserva
// el '$' pelado que ya usaban todas las cards antes de esta columna, así
// que ninguna org existente cambia de look; 'USD' es el único caso nuevo
// (hoy solo lo usa Domus en sus propiedades en venta). Único punto de
// formateo de precio — antes estaba duplicado con `$${price.toLocaleString
// ("es-AR")}` en cada card/ficha/dashboard por separado.
const CURRENCY_SYMBOLS: Record<string, string> = { ARS: "$", USD: "US$" };

export function formatPrice(price: number, currency?: string | null): string {
  const symbol = CURRENCY_SYMBOLS[currency ?? "ARS"] ?? "$";
  return `${symbol} ${price.toLocaleString("es-AR")}`;
}
