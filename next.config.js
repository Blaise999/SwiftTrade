/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Some Web3 SDK transitive deps (encoding, pino-pretty) trip Webpack with
  // "module not found" warnings even though they're optional. Silence them
  // rather than installing unused packages.
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      encoding: false,
      'pino-pretty': false,
      fs: false,
      net: false,
      tls: false,
    };
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('pino-pretty', 'encoding');
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'cryptologos.cc' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
};
module.exports = nextConfig;
