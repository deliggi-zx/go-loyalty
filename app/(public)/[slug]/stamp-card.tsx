import QRCode from "qrcode";

interface StampCardProps {
  profileId: string;
  stampCount: number;
  orgName: string;
  primaryColor: string;
}

export async function StampCard({
  profileId,
  stampCount,
  orgName,
  primaryColor,
}: StampCardProps) {
  const qrDataUrl = await QRCode.toDataURL(profileId, {
    width: 160,
    margin: 2,
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  const total = 10;
  const remaining = Math.max(0, total - stampCount);
  const complete = stampCount >= total;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
            Tu tarjeta
          </p>
          <h2 className="text-base font-semibold text-stone-900 mt-0.5">{orgName}</h2>
        </div>
        {complete && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            ¡Premio disponible!
          </span>
        )}
      </div>

      {/* Grilla de sellos */}
      <div>
        <div className="grid grid-cols-5 gap-2.5">
          {Array.from({ length: total }).map((_, i) => {
            const filled = i < stampCount;
            return (
              <div
                key={i}
                className="aspect-square rounded-full flex items-center justify-center transition-all"
                style={
                  filled
                    ? { backgroundColor: primaryColor || "#f59e0b" }
                    : undefined
                }
                {...(!filled && {
                  className:
                    "aspect-square rounded-full flex items-center justify-center border-2 border-stone-200 bg-stone-50",
                })}
              >
                {filled && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-stone-400 mt-3">
          {complete
            ? "Tarjeta completa — mostrá tu QR para canjear"
            : `${stampCount} de ${total} sellos · te faltan ${remaining}`}
        </p>
      </div>

      {/* QR */}
      <div className="flex flex-col items-center gap-2 pt-1">
        <div className="rounded-xl overflow-hidden border border-stone-100 p-2.5 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Tu código QR" className="w-36 h-36" />
        </div>
        <p className="text-xs text-stone-400 text-center">
          Mostrá este código en caja para sumar sellos
        </p>
      </div>
    </div>
  );
}
