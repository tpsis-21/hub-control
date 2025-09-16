import type { NextConfig } from "next";

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
    
    // Otimizações de produção
    if (!dev && !isServer) {
      // Code splitting otimizado
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
        radix: {
          test: /[\/]node_modules[\/]@radix-ui[\/]/,
          name: 'radix-ui',
          priority: 30,
          reuseExistingChunk: true,
        },
        icons: {
          test: /[\/]node_modules[\/](lucide-react)[\/]/,
          name: 'icons',
          priority: 25,
          reuseExistingChunk: true,
        },
        charts: {
          test: /[\/]node_modules[\/](recharts)[\/]/,
          name: 'charts',
          priority: 25,
          reuseExistingChunk: true,
        },
        dateUtils: {
          test: /[\/]node_modules[\/](date-fns)[\/]/,
          name: 'date-utils',
          priority: 20,
          reuseExistingChunk: true,
        },
        forms: {
          test: /[\/]node_modules[\/](react-hook-form|zod)[\/]/,
          name: 'forms',
          priority: 20,
          reuseExistingChunk: true,
        },
        supabase: {
          test: /[\/]node_modules[\/]@supabase[\/]/,
          name: 'supabase',
          priority: 20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\/]node_modules[\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        ui: {
          test: /[\/]src[\/]components[\/]ui[\/]/,
          name: 'ui-components',
          priority: 20,
          reuseExistingChunk: true,
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
        },
      };
      
      // Otimização de módulos
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
    }
    
    // Alias para imports mais limpos
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
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
