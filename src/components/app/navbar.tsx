// src/components/app/navbar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });

      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message || "Ocorreu um erro ao desconectar.",
        variant: "destructive",
      });
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold">
                Hub Control
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/clientes"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Clientes
              </Link>
              <Link
                href="/planos"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Planos
              </Link>
              <Link
                href="/servidores"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Servidores
              </Link>
              <Link
                href="/testes"
                className="border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Testes
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-2">
            {/* Botão de alternância de tema */}
            <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="transition-colors">
              <Sun className="h-5 w-5 text-yellow-500 dark:hidden" />
              <Moon className="h-5 w-5 text-gray-300 hidden dark:block" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes">Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu móvel */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/dashboard"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
              onClick={toggleMenu}
            >
              Dashboard
            </Link>
            <Link
              href="/clientes"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
              onClick={toggleMenu}
            >
              Clientes
            </Link>
            <Link
              href="/planos"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
              onClick={toggleMenu}
            >
              Planos
            </Link>
            <Link
              href="/servidores"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
              onClick={toggleMenu}
            >
              Servidores
            </Link>
            <Link
              href="/testes"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
              onClick={toggleMenu}
            >
              Testes
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <User className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 p-2" />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800 dark:text-white">
                  Administrador
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                href="/configuracoes"
                className="block px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={toggleMenu}
              >
                Configurações
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  toggleMenu();
                }}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}