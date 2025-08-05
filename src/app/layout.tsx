import type {Metadata} from 'next';
import './globals.css';
import '../styles/modern-theme.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/app/theme-provider';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

// Configuração da fonte Inter para ser usada em toda a aplicação.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Hub Control',
  description: 'Sistema de gerenciamento de IPTV - Hub Control',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* Aplica a classe da fonte no body para garantir consistência. */}
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        <ErrorBoundary>
          <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
