/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 180,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tcqpsjlfboqensnvhdop.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
