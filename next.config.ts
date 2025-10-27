import type { NextConfig } from "next";
import path from 'path';

// Configuração baseada no ambiente
const isProd = process.env.NODE_ENV === 'production';
const isStatic = process.env.NEXT_EXPORT === 'true';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ============================================
  // CONFIGURAÇÕES DE PRODUÇÃO
  // ============================================
  
  // Export estático para Firebase Hosting
  ...(isStatic && {
    output: 'export',
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
    distDir: 'out',
  }),
  
  // Configurações de produção
  ...(isProd && {
    reactStrictMode: true,
    productionBrowserSourceMaps: false,
  }),
  
  // ============================================
  // OTIMIZAÇÕES DE PERFORMANCE
  // ============================================
  
  // Compressão e otimização
  compress: true,
  poweredByHeader: false,
  
  // Experimental features para performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tooltip',
      'react-hook-form',
      'zod'
    ],
    // Lazy compilation para desenvolvimento
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  
  // ============================================
  // CONFIGURAÇÃO DE IMAGENS
  // ============================================
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      }
    ],
    // Otimizações de imagem
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // ============================================
  // CONFIGURAÇÃO DO SERVIDOR
  // ============================================
  
  serverExternalPackages: ['@supabase/ssr'],
  
  // ============================================
  // CONFIGURAÇÃO WEBPACK
  // ============================================
  
  webpack: (config, { dev, isServer }) => {
    // Fallbacks específicos para nodemailer (apenas os essenciais)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Módulos específicos do nodemailer
        dns: false,
        child_process: false,
        // Manter outros fallbacks existentes
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // ============================================
    // OTIMIZAÇÕES DE BUNDLE E CODE SPLITTING
    // ============================================
    
    if (!dev && !isServer) {
      // Configurações avançadas de otimização para produção
      config.optimization = {
        ...config.optimization,
        
        // Configuração aprimorada de splitChunks
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Vendor chunks principais
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
              enforce: true,
            },
            
            // Bibliotecas UI (Radix UI)
            radixUI: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            
            // Lucide React (ícones)
            lucide: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'lucide-icons',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            
            // Recharts (gráficos)
            recharts: {
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
              name: 'recharts',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            
            // Date-fns (utilitários de data)
            dateFns: {
              test: /[\\/]node_modules[\\/]date-fns[\\/]/,
              name: 'date-fns',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            
            // React Hook Form + Zod
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|zod)[\\/]/,
              name: 'forms',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            
            // Supabase
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              priority: 20,
              chunks: 'all',
              enforce: true,
            },
            
            // Componentes UI comuns
            uiComponents: {
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              priority: 15,
              chunks: 'all',
              minChunks: 2,
            },
            
            // Utilitários e libs comuns
            common: {
              test: /[\\/]src[\\/](lib|utils|hooks)[\\/]/,
              name: 'common',
              priority: 15,
              chunks: 'all',
              minChunks: 2,
            },
            
            // Chunk padrão
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
        
        // Configuração de minimização
        minimize: true,
        
        // Configuração de module concatenation (scope hoisting)
        concatenateModules: true,
        
        // Configuração de side effects
        sideEffects: false,
        
        // Otimização de módulos
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }
    
    // Alias para imports mais limpos
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/styles': path.resolve(__dirname, 'src/styles'),
    };
    
    // Ignorar arquivos desnecessários
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
    };
    
    return config;
  },
  
  // ============================================
  // HEADERS DE SEGURANÇA E PERFORMANCE
  // ============================================
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // ============================================
  // REDIRECTS E REWRITES
  // ============================================
  
  async redirects() {
    return [];
  },
};

export default nextConfig;
