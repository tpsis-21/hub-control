// src/app/register/page.tsx
import { RegisterForm } from "@/components/auth/register-form";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Registro - Hub Control",
  description: "Crie uma conta para acessar o sistema de gerenciamento de IPTV.",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="full" size="lg" className="text-gray-900 dark:text-white" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sistema de gerenciamento de IPTV
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}