/** @type {import('next').NextConfig} */
const nextConfig = {
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
