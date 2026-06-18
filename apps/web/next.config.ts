import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.0.64',
    'localhost',
    '127.0.0.1',
  ],
  // As travas de memória continuam funcionando, mas o eslint
  // agora é configurado dentro da chave 'eslint' mas de forma 
  // que o Next.js entenda. Tente este formato:
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig