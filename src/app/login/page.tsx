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
          <div className="flex justify-center mb-4">
            <Logo width={160} height={50} className="text-gray-900 dark:text-white" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sistema de gerenciamento de IPTV
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}