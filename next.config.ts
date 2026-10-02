import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NETLIFY ? { output: 'standalone' as const } : {}),
  outputFileTracingIncludes: {
    '/api/payments/kiwify': ['./content/ebook/livro-das-assombracoes-de-ouro-preto.pdf'],
  },
  ...(['vercel', 'node'].includes(process.env.CO_RUNTIME || '') || process.env.VERCEL || process.env.NETLIFY ? { turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "cloudflare:workers": "./lib/vercel-cloudflare-env.ts",
    },
  }} : {}),
};

export default nextConfig;
