// src/app/login/page.tsx
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Login - Hub Control",
  description: "Faça login para acessar o sistema de gerenciamento de IPTV.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo variant="full" size="lg" className="text-gray-900 dark:text-white w-64 h-16" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-3 text-lg font-medium">
            Seu hub de controle inteligente
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
