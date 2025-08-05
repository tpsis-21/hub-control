import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://EXEMPLO_PUBLIC_DSN@sentry.io/PROJECT_ID",
  tracesSampleRate: 1.0, // Ajuste para produção conforme necessário
  environment: process.env.NODE_ENV,
  // Adicione outras opções avançadas conforme necessário
});