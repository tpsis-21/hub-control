// src/app/login/page.tsx
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";

export const metadata = {
  title: "Login - Hub Control",
  description: "Faça login para acessar o painel administrativo Hub Control.",
};

type LoginPageProps = {
  searchParams?: Promise<{ recuperar?: string; registration?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialRecover = params.recuperar === '1' || params.recuperar === 'true';
  const registrationDisabled =
    params.registration === 'disabled' || process.env.NODE_ENV === 'production';

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <Logo variant="full" size="lg" className="h-16 w-auto max-w-[280px]" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 mt-3 text-lg font-medium">
            Seu hub de controle inteligente
          </p>
        </div>
        <LoginForm
          initialRecover={initialRecover}
          registrationDisabled={registrationDisabled}
        />
      </div>
    </div>
  );
}
