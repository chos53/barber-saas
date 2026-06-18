/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desativa otimização complexa de imagem
  images: {
    unoptimized: true,
  },
  // Desativa verificações de produção que consomem muita RAM
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Força o Webpack (se o Turbopack ainda insistir)
  webpack: (config, { dev, isServer }) => {
    return config;
  },
};

module.exports = nextConfig;