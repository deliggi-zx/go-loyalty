import { GymPlanCard } from "./gym-plan-card";

export interface GymPlanBenefit {
  label: string;
  included: boolean;
}

export interface GymPlan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: string;
  secondaryPrice: string | null;
  benefits: GymPlanBenefit[];
  featured?: boolean;
}

// Contenido de ejemplo — todavía no hay una tabla gym_plans en la base, así
// que por ahora esto es estático (mismo criterio que el resto de la
// funcionalidad Gym2 mientras no haya backend real para "Contratar ahora").
const PLANS: GymPlan[] = [
  {
    id: "mensual",
    name: "Mensual",
    tagline: "Para arrancar sin ataduras.",
    monthlyPrice: "$32.000",
    secondaryPrice: "Inscripción única: $8.000",
    benefits: [
      { label: "Débito automático", included: true },
      { label: "Clases grupales ilimitadas", included: true },
      { label: "Acceso a 1 sede a elección", included: true },
      { label: "Acceso a todas las sedes", included: false },
      { label: "Congelar membresía", included: false },
    ],
  },
  {
    id: "anual",
    name: "Anual",
    tagline: "Pago anual, el precio más bajo por mes.",
    monthlyPrice: "$24.000",
    secondaryPrice: "Pago único anual: $288.000",
    featured: true,
    benefits: [
      { label: "Débito automático", included: true },
      { label: "Clases grupales ilimitadas", included: true },
      { label: "Acceso a todas las sedes", included: true },
      { label: "Congelar membresía hasta 30 días", included: true },
      { label: "1 invitado gratis por mes", included: true },
    ],
  },
  {
    id: "flex",
    name: "Flex Congelable",
    tagline: "Pausá cuando lo necesites, sin perder tu lugar.",
    monthlyPrice: "$29.000",
    secondaryPrice: "Sin costo de inscripción",
    benefits: [
      { label: "Congelar membresía cuando quieras", included: true },
      { label: "Clases grupales ilimitadas", included: true },
      { label: "Acceso a 1 sede a elección", included: true },
      { label: "Débito automático", included: false },
      { label: "Acceso a todas las sedes", included: false },
    ],
  },
];

// Destino de la pestaña neón "Planes". Mismo patrón que
// GymLocationsSection/GymClassesSection: sección con id fijo para que las
// pestañas puedan hacerle scrollIntoView. Va al final de la página, debajo
// de Comentarios.
export function GymPlansSection() {
  return (
    <section id="planes" className="space-y-4">
      <h2 className="text-xl font-bold text-stone-900">Nuestros Planes</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {PLANS.map((plan) => (
          <GymPlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </section>
  );
}
