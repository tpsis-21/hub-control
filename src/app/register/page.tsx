import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Registro - Hub Control",
  description: "Solicite acesso ao painel Hub Control.",
};

export default function RegisterPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/login?registration=disabled");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="full" size="lg" className="h-16 w-auto max-w-[280px]" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Crie sua conta para acessar o Hub Control
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
