import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the parent project's TypeScript code
  transpilePackages: ['../src'],

  // Configure packages to externalize from bundling
  serverExternalPackages: [
    '@mcpc-tech/ripgrep-napi',
    'tree-sitter',
    'tree-sitter-bash',
    'openai',
    'zod',
    'dotenv',
    'mongoose',
    'execa',
    'fast-glob',
    'iconv-lite',
    'isbinaryfile',
    'prompts',
    'gray-matter',
  ],

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'framer-motion',
      'sonner',
    ],
  },

  // Turbopack config (empty to suppress warning)
  turbopack: {},
};

export default nextConfig;
