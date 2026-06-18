import { Users, Stamp, Gift, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

// Datos de actividad reciente (placeholder hasta conectar tablas reales)
const recentActivity = [
  { id: 1, type: "sello", customer: "María González", detail: "2 sellos emitidos", time: "hace 5 min", avatar: "MG" },
  { id: 2, type: "premio", customer: "Carlos Pérez", detail: "Café gratis canjeado", time: "hace 18 min", avatar: "CP" },
  { id: 3, type: "sello", customer: "Ana Rodríguez", detail: "1 sello emitido", time: "hace 34 min", avatar: "AR" },
  { id: 4, type: "registro", customer: "Juan Martín", detail: "Nuevo cliente registrado", time: "hace 1 h", avatar: "JM" },
  { id: 5, type: "sello", customer: "Laura Torres", detail: "3 sellos emitidos", time: "hace 2 h", avatar: "LT" },
  { id: 6, type: "premio", customer: "Diego Sánchez", detail: "Medialunas x6 canjeado", time: "hace 3 h", avatar: "DS" },
];

const typeConfig = {
  sello: { label: "Sello", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  premio: { label: "Premio", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  registro: { label: "Registro", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
};

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-8 h-16 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Dashboard</h1>
          <p className="text-xs text-stone-400 capitalize">{today}</p>
        </div>
        <a
          href="/pos"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Stamp className="w-4 h-4" />
          Ir al POS
        </a>
      </header>

      <div className="p-8 space-y-8">
        {/* Métricas */}
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Este mes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Clientes activos"
              value="248"
              change="+12%"
              positive
              icon={Users}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              title="Sellos emitidos"
              value="1.847"
              change="+8%"
              positive
              icon={Stamp}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Premios canjeados"
              value="93"
              change="+5%"
              positive
              icon={Gift}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Tasa de retención"
              value="74%"
              change="-2%"
              positive={false}
              icon={TrendingUp}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
            />
          </div>
        </section>

        {/* Actividad reciente */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
              Actividad reciente
            </h2>
            <a href="/dashboard/actividad" className="text-xs text-amber-600 hover:underline font-medium">
              Ver todo
            </a>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {recentActivity.map((item) => {
              const config = typeConfig[item.type as keyof typeof typeConfig];
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-stone-600">{item.avatar}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{item.customer}</p>
                    <p className="text-xs text-stone-500 truncate">{item.detail}</p>
                  </div>

                  {/* Badge */}
                  <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                  </span>

                  {/* Tiempo */}
                  <span className="text-xs text-stone-400 shrink-0 w-20 text-right">{item.time}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
