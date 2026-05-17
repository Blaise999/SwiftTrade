/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // The Next image optimizer was returning 404 for several Unsplash
    // URLs (their `?auto=format` redirects don't always resolve through
    // the optimizer). These are decorative images, so we serve them
    // directly (unoptimized) — reliable, no 404s.
    unoptimized: true,
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
  webpack: (config) => {
    // The MetaMask SDK (via wagmi/rainbowkit) soft-requires React-Native's
    // async-storage, which doesn't exist in a web build and spams
    // "Module not found" warnings. Stub it out.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      '@react-native-async-storage/async-storage': false,
    };
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@metamask\/sdk/ },
      { message: /Can't resolve '@react-native-async-storage\/async-storage'/ },
    ];
    return config;
  },
};
module.exports = nextConfig;
