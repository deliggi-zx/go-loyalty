import { login } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface LoginPageProps {
  searchParams: { error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo / marca */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 mb-3">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9M12 3c2.5 0 4.5 2 4.5 4.5S14.5 12 12 12m0-9C9.5 3 7.5 5 7.5 7.5S9.5 12 12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Go Loyalty
          </h1>
          <p className="text-sm text-stone-500">
            Plataforma de fidelización
          </p>
        </div>

        {/* Card de login */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresá tu email y contraseña para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login} className="space-y-4">

              {/* Error */}
              {searchParams.error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {searchParams.error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  className="border-stone-200 focus-visible:ring-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="border-stone-200 focus-visible:ring-amber-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium"
              >
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-stone-400">
          &copy; {new Date().getFullYear()} Go Loyalty. Todos los derechos reservados.
        </p>
      </div>
    </main>
  );
}
