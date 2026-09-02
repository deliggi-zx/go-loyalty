import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Marco visual compartido por las pantallas de autenticación (login,
// olvidé mi contraseña, nueva contraseña) — mismo logo, card y footer.
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9M12 3c2.5 0 4.5 2 4.5 4.5S14.5 12 12 12m0-9C9.5 3 7.5 5 7.5 7.5S9.5 12 12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Go Loyalty</h1>
          <p className="text-sm text-stone-500">Plataforma de fidelización</p>
        </div>

        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        <p className="text-center text-xs text-stone-400">
          &copy; {new Date().getFullYear()} Go Loyalty. Todos los derechos reservados.
        </p>
      </div>
    </main>
  );
}
