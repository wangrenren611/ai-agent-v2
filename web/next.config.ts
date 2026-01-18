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
};

export default nextConfig;
