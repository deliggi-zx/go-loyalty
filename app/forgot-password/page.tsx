import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Ingresá tu email y te mandamos un link para crear una nueva."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
