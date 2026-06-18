/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Isso resolve 90% dos travamentos de build
  },
};
module.exports = nextConfig;