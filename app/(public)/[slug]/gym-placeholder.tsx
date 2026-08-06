import { Dumbbell, MapPin } from "lucide-react";

// Paleta fija de gradientes para darle variedad visual a las tarjetas que no
// tienen foto real todavía (demo/showroom). Se elige de forma determinística
// según el texto (nombre de sede o clase) para que cada tarjeta sea estable
// entre renders.
const GRADIENTS = [
  "from-amber-400 to-orange-600",
  "from-rose-400 to-red-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-purple-600",
  "from-fuchsia-400 to-pink-600",
];

function pickGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function LocationPlaceholder({ name }: { name: string }) {
  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${pickGradient(name)} flex flex-col items-center justify-center gap-1.5`}
    >
      <MapPin className="w-8 h-8 text-white/90" />
      <span className="text-white/90 text-xs font-medium px-3 text-center">{name}</span>
    </div>
  );
}

export function ClassPlaceholder({ name }: { name: string }) {
  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${pickGradient(name)} flex flex-col items-center justify-center gap-1.5`}
    >
      <Dumbbell className="w-8 h-8 text-white/90" />
      <span className="text-white/90 text-xs font-medium px-3 text-center">{name}</span>
    </div>
  );
}
