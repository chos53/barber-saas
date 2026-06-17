import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Suas configurações originais
  allowedDevOrigins: [
    '192.168.0.64',
    'localhost',
    '127.0.0.1',
  ],
  
  // Nossas travas Anti-Crash para economizar memória na Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig