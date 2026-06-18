/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! ATENÇÃO: Isso ignora erros de tipo no build !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // !! ATENÇÃO: Isso ignora erros de lint no build !!
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;