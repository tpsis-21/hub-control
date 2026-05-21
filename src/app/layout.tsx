import type {Metadata, Viewport} from 'next';
import './globals.css';
import '../styles/hub-theme.css';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { cn } from '@/lib/utils';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/app/theme-provider';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ServiceInitializer } from '@/components/app/service-initializer';


// Configuração da fonte Inter para ser usada em toda a aplicação.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Hub Control',
  description: 'Painel administrativo Hub Control — clientes, planos, servidores e integrações',
  keywords: ['Hub Control', 'gerenciamento', 'painel admin', 'servidores', 'assinaturas'],
  authors: [{ name: 'Hub Control Team' }],
  creator: 'Hub Control',
  publisher: 'Hub Control',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/assets/images/logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/images/logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/images/logo/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
    ],
    apple: '/assets/images/logo/apple-touch-icon.png',
    shortcut: '/assets/images/logo/favicon-32x32.png'
  },
  manifest: '/manifest.json',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://hubcontrol.app',
    title: 'Hub Control',
    description: 'Painel administrativo Hub Control — clientes, planos, servidores e integrações',
    siteName: 'Hub Control',
  },
  twitter: {
    card: 'summary',
    title: 'Hub Control',
    description: 'Painel administrativo Hub Control — clientes, planos, servidores e integrações',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2196F3' },
    { media: '(prefers-color-scheme: dark)', color: '#1976D2' }
  ],
}

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
            <ServiceInitializer />
            {children}
            <Toaster />
            <SonnerToaster richColors closeButton position="top-right" />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

